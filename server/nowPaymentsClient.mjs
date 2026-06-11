import { config, assertNowPaymentsConfigured } from './config.mjs';

function buildReturnUrl(type, orderId) {
  const url = new URL(config.publicAppUrl);
  url.searchParams.set('payment', type);
  url.searchParams.set('order_id', orderId);
  url.hash = 'presale';
  return url.toString();
}

export async function createNowPaymentsInvoice({ orderId, walletAddress, tokenAmount, priceAmount }) {
  assertNowPaymentsConfigured();

  const payload = {
    price_amount: priceAmount,
    price_currency: 'usd',
    order_id: orderId,
    order_description: `DRACMA $DRC presale - ${tokenAmount} tokens for ${walletAddress}`,
    ipn_callback_url: config.nowPaymentsIpnCallbackUrl,
    success_url: buildReturnUrl('success', orderId),
    cancel_url: buildReturnUrl('cancel', orderId),
  };

  const response = await fetch(`${config.nowPaymentsApiUrl}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.nowPaymentsApiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = body?.message || body?.error || `NOWPayments invoice request failed with ${response.status}`;
    throw new Error(detail);
  }

  return body;
}
