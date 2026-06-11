import crypto from 'node:crypto';
import express from 'express';
import { getAddress, isAddress } from 'viem';
import { config } from './config.mjs';
import { createNowPaymentsInvoice } from './nowPaymentsClient.mjs';
import { distributeTokens } from './tokenDistributor.mjs';
import {
  calculateTokenLedgerFromPayments,
  getPaymentRecord,
  getTokenLedger,
  updatePaymentRecord,
  withPaymentStoreTransaction,
} from './paymentStore.mjs';
import { normalizeNowPaymentsStatus, ORDER_STATES, shouldDistributeTokens } from './paymentStates.mjs';
import { calculateQuoteForTokens, getPricingState, roundMoney } from './priceCalculator.mjs';

const app = express();

class ApiError extends Error {
  constructor(statusCode, message, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function createOrderId() {
  return `DRC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function getPriceOptions() {
  return {
    basePriceUsd: config.tokenPriceUsd,
    stepTokens: config.priceStepTokens,
    stepIncreaseRate: config.priceStepIncreaseRate,
  };
}

async function getCurrentPricingState() {
  const ledger = await getTokenLedger({
    quoteHoldMinutes: config.quoteHoldMinutes,
    maxSaleTokens: config.maxSaleTokens,
  });

  return {
    ...getPricingState(ledger.tokensAllocated, getPriceOptions()),
    tokensSold: ledger.tokensSold,
    tokensReserved: ledger.tokensReserved,
    maxSaleTokens: ledger.maxSaleTokens,
    tokensAvailable: ledger.tokensAvailable,
  };
}

function assertInventoryAvailable(quote, ledger) {
  if (ledger.maxSaleTokens === null) return;

  if (quote.tokensAllocatedAfter <= ledger.maxSaleTokens) return;

  throw new ApiError(409, 'No hay suficientes tokens disponibles para completar esta compra.', {
    requestedTokens: quote.tokenAmount,
    tokensAvailable: ledger.tokensAvailable,
    maxSaleTokens: ledger.maxSaleTokens,
    tokensSold: ledger.tokensSold,
    tokensReserved: ledger.tokensReserved,
  });
}

function buildInventoryErrorPayload(error) {
  return {
    error: error.message,
    ...(error.details || {}),
  };
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObject(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function safeEqualHex(left, right) {
  if (!left || !right) return false;

  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyNowPaymentsSignature(payload, signature) {
  if (!config.nowPaymentsIpnSecret || !signature) return false;

  const sortedPayload = JSON.stringify(sortObject(payload));
  const expectedSignature = crypto
    .createHmac('sha512', config.nowPaymentsIpnSecret)
    .update(sortedPayload)
    .digest('hex');

  return safeEqualHex(expectedSignature, signature);
}

function applyCors(req, res, next) {
  const allowedOrigins = config.corsOrigin.split(',').map((origin) => origin.trim());
  const requestOrigin = req.headers.origin;

  if (requestOrigin && (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin))) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-nowpayments-sig');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

app.use(applyCors);

app.get('/api/health', async (_req, res) => {
  const pricing = await getCurrentPricingState();

  res.json({
    ok: true,
    network: 'BNB Smart Chain',
    saleTokenAddress: config.saleTokenAddress,
    tokenPriceUsd: pricing.currentPriceUsd,
    baseTokenPriceUsd: config.tokenPriceUsd,
    priceStepTokens: config.priceStepTokens,
    priceStepIncreaseRate: config.priceStepIncreaseRate,
    maxSaleTokens: pricing.maxSaleTokens,
    tokensSold: pricing.tokensSold,
    tokensReserved: pricing.tokensReserved,
    tokensAvailable: pricing.tokensAvailable,
    nowPaymentsCallbackUrl: config.nowPaymentsIpnCallbackUrl,
    distributionMode: config.tokenDistributionMode,
  });
});

app.get('/api/presale/pricing', async (_req, res) => {
  const pricing = await getCurrentPricingState();
  res.json(pricing);
});

app.get('/api/presale/ledger', async (_req, res) => {
  const ledger = await getTokenLedger({
    quoteHoldMinutes: config.quoteHoldMinutes,
    maxSaleTokens: config.maxSaleTokens,
  });

  res.json({
    ...ledger,
    quoteHoldMinutes: config.quoteHoldMinutes,
    priceStepTokens: config.priceStepTokens,
    priceStepIncreaseRate: config.priceStepIncreaseRate,
    baseTokenPriceUsd: config.tokenPriceUsd,
  });
});

app.post('/api/webhooks/nowpayments', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  let payload;

  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload.' });
    return;
  }

  const signature = req.get('x-nowpayments-sig');
  if (!verifyNowPaymentsSignature(payload, signature)) {
    res.status(401).json({ error: 'Invalid NOWPayments signature.' });
    return;
  }

  const orderId = payload.order_id || payload.orderId;
  if (!orderId) {
    res.status(400).json({ error: 'Missing order_id.' });
    return;
  }

  const record = await getPaymentRecord(orderId);
  if (!record) {
    res.status(202).json({ received: true, status: 'unknown_order' });
    return;
  }

  const incomingPriceAmount = Number(payload.price_amount ?? payload.priceAmount ?? record.priceAmount);
  if (Number.isFinite(incomingPriceAmount) && Math.abs(incomingPriceAmount - record.priceAmount) > 0.01) {
    await updatePaymentRecord(orderId, (current) => ({
      ...current,
      status: ORDER_STATES.VALIDATION_ERROR,
      nowPaymentsStatus: payload.payment_status || payload.paymentStatus || current.nowPaymentsStatus,
      lastIpnPayload: payload,
      validationError: 'IPN price_amount does not match stored order total.',
    }));
    res.status(400).json({ error: 'IPN amount mismatch.' });
    return;
  }

  const rawPaymentStatus = payload.payment_status || payload.paymentStatus || 'unknown';
  const paymentStatus = normalizeNowPaymentsStatus(rawPaymentStatus);
  const updated = await updatePaymentRecord(orderId, (current) => ({
    ...current,
    status: paymentStatus,
    nowPaymentsStatus: paymentStatus,
    nowPaymentsRawStatus: rawPaymentStatus,
    nowPaymentsPaymentId: payload.payment_id || payload.paymentId || current.nowPaymentsPaymentId || null,
    purchaseId: payload.purchase_id || payload.purchaseId || current.purchaseId || null,
    lastIpnPayload: payload,
  }));

  if (!shouldDistributeTokens(paymentStatus)) {
    res.json({ received: true, status: paymentStatus });
    return;
  }

  if (updated?.distribution?.txHash || updated?.distribution?.status === 'sent') {
    res.json({ received: true, status: 'already_distributed' });
    return;
  }

  try {
    const distribution = await distributeTokens({
      walletAddress: record.walletAddress,
      tokenAmount: record.tokenAmount,
      orderId,
    });

    await updatePaymentRecord(orderId, (current) => ({
      ...current,
      status: distribution.skipped ? ORDER_STATES.PAID_PENDING_DISTRIBUTION : ORDER_STATES.DISTRIBUTED,
      distribution: {
        ...distribution,
        attemptedAt: new Date().toISOString(),
      },
    }));

    res.json({ received: true, status: distribution.status, txHash: distribution.txHash || null });
  } catch (error) {
    await updatePaymentRecord(orderId, (current) => ({
      ...current,
      status: ORDER_STATES.DISTRIBUTION_FAILED,
      distribution: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Token distribution failed.',
        attemptedAt: new Date().toISOString(),
      },
    }));

    res.status(500).json({ error: 'Token distribution failed.' });
  }
});

app.use(express.json({ limit: '64kb' }));

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON payload.' });
    return;
  }

  next(error);
});

app.post('/api/presale/quote', async (req, res) => {
  try {
    const tokenAmount = Number(req.body?.tokenAmount);

    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
      res.status(400).json({ error: 'Ingresa una cantidad valida de tokens.' });
      return;
    }

    const ledger = await getTokenLedger({
      quoteHoldMinutes: config.quoteHoldMinutes,
      maxSaleTokens: config.maxSaleTokens,
    });
    const quote = calculateQuoteForTokens(tokenAmount, ledger.tokensAllocated, getPriceOptions());
    assertInventoryAvailable(quote, ledger);

    res.json({
      ...quote,
      minPurchaseUsd: config.minPurchaseUsd,
      quoteHoldMinutes: config.quoteHoldMinutes,
      currentPricing: {
        ...getPricingState(ledger.tokensAllocated, getPriceOptions()),
        tokensSold: ledger.tokensSold,
        tokensReserved: ledger.tokensReserved,
        maxSaleTokens: ledger.maxSaleTokens,
        tokensAvailable: ledger.tokensAvailable,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(buildInventoryErrorPayload(error));
      return;
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'No se pudo calcular la cotizacion.',
    });
  }
});

app.post('/api/payments/nowpayments', async (req, res) => {
  let orderId = null;

  try {
    const walletAddress = String(req.body?.walletAddress || '').trim();
    const tokenAmount = Number(req.body?.tokenAmount);

    if (!isAddress(walletAddress)) {
      res.status(400).json({ error: 'La direccion de wallet BSC no es valida.' });
      return;
    }

    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
      res.status(400).json({ error: 'Ingresa una cantidad valida de tokens.' });
      return;
    }

    const normalizedWalletAddress = getAddress(walletAddress);
    const reservation = await withPaymentStoreTransaction((store) => {
      const ledger = calculateTokenLedgerFromPayments(store.payments, {
        quoteHoldMinutes: config.quoteHoldMinutes,
        maxSaleTokens: config.maxSaleTokens,
      });
      const quote = calculateQuoteForTokens(tokenAmount, ledger.tokensAllocated, getPriceOptions());
      assertInventoryAvailable(quote, ledger);

      const priceAmount = roundMoney(quote.totalUsd);

      if (priceAmount < config.minPurchaseUsd) {
        throw new ApiError(400, `La compra minima es de $${config.minPurchaseUsd.toFixed(2)} USD.`);
      }

      const nextOrderId = createOrderId();
      const now = new Date().toISOString();
      const baseRecord = {
        orderId: nextOrderId,
        walletAddress: normalizedWalletAddress,
        tokenAmount: quote.tokenAmount,
        tokenPriceUsd: quote.averagePriceUsd,
        baseTokenPriceUsd: config.tokenPriceUsd,
        priceStepTokens: config.priceStepTokens,
        priceStepIncreaseRate: config.priceStepIncreaseRate,
        maxSaleTokens: ledger.maxSaleTokens,
        priceAmount,
        priceCurrency: 'usd',
        quote,
        saleTokenAddress: config.saleTokenAddress,
        chain: 'bsc',
        status: ORDER_STATES.CREATING_INVOICE,
        nowPaymentsStatus: null,
        nowPaymentsInvoiceId: null,
        nowPaymentsInvoiceUrl: null,
        distribution: {
          status: 'pending_payment',
        },
        inventory: {
          tokensSoldBefore: ledger.tokensSold,
          tokensReservedBefore: ledger.tokensReserved,
          tokensAllocatedBefore: ledger.tokensAllocated,
          tokensAvailableBefore: ledger.tokensAvailable,
        },
        createdAt: now,
        updatedAt: now,
      };

      store.payments[nextOrderId] = baseRecord;
      return {
        orderId: nextOrderId,
        quote,
        priceAmount,
      };
    });

    orderId = reservation.orderId;

    let invoice;
    try {
      invoice = await createNowPaymentsInvoice({
        orderId,
        walletAddress: normalizedWalletAddress,
        tokenAmount: reservation.quote.tokenAmount,
        priceAmount: reservation.priceAmount,
      });
    } catch (error) {
      await updatePaymentRecord(orderId, (current) => ({
        ...current,
        status: ORDER_STATES.INVOICE_FAILED,
        invoiceError: error instanceof Error ? error.message : 'NOWPayments invoice creation failed.',
      }));
      throw error;
    }

    const invoiceId = invoice.id || invoice.invoice_id || null;
    const invoiceUrl = invoice.invoice_url || invoice.payment_url || null;

    await updatePaymentRecord(orderId, (current) => ({
      ...current,
      status: ORDER_STATES.INVOICE_CREATED,
      nowPaymentsInvoiceId: invoiceId,
      nowPaymentsInvoiceUrl: invoiceUrl,
      nowPaymentsInvoice: invoice,
    }));

    res.status(201).json({
      orderId,
      invoiceId,
      invoiceUrl,
      priceAmount: reservation.priceAmount,
      priceCurrency: 'usd',
      tokenAmount: reservation.quote.tokenAmount,
      tokenPriceUsd: reservation.quote.averagePriceUsd,
      quote: reservation.quote,
      walletAddress: normalizedWalletAddress,
      status: ORDER_STATES.INVOICE_CREATED,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(buildInventoryErrorPayload(error));
      return;
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'No se pudo crear el pago.',
    });
  }
});

app.get('/api/payments/:orderId', async (req, res) => {
  const record = await getPaymentRecord(req.params.orderId);

  if (!record) {
    res.status(404).json({ error: 'Orden no encontrada.' });
    return;
  }

  res.json({
    orderId: record.orderId,
    status: record.status,
    nowPaymentsStatus: record.nowPaymentsStatus,
    priceAmount: record.priceAmount,
    priceCurrency: record.priceCurrency,
    tokenAmount: record.tokenAmount,
    tokenPriceUsd: record.tokenPriceUsd,
    quote: record.quote,
    walletAddress: record.walletAddress,
    distribution: record.distribution,
    nowPaymentsInvoiceUrl: record.nowPaymentsInvoiceUrl,
  });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(config.port, () => {
  console.log(`DRACMA API listening on http://localhost:${config.port}`);
});
