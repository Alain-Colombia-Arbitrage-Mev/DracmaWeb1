import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import { FINALIZED_TOKEN_STATUSES, RESERVED_TOKEN_STATUSES } from './paymentStates.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStorePath = path.join(__dirname, '.data', 'payments.json');
const storePath = config.paymentStorePath || defaultStorePath;
let storeLock = Promise.resolve();

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify({ payments: {} }, null, 2));
  }
}

async function readPaymentStoreUnsafe() {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, 'utf8');
  return JSON.parse(raw);
}

async function writePaymentStoreUnsafe(store) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  const tmpPath = `${storePath}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(store, null, 2));
  await fs.rename(tmpPath, storePath);
}

export async function readPaymentStore() {
  return readPaymentStoreUnsafe();
}

export async function writePaymentStore(store) {
  await writePaymentStoreUnsafe(store);
}

export async function withPaymentStoreTransaction(mutator) {
  const previousLock = storeLock;
  let releaseLock;
  storeLock = new Promise((resolve) => {
    releaseLock = resolve;
  });

  await previousLock;

  try {
    const store = await readPaymentStoreUnsafe();
    const result = await mutator(store);
    await writePaymentStoreUnsafe(store);
    return result;
  } finally {
    releaseLock();
  }
}

export async function savePaymentRecord(record) {
  return withPaymentStoreTransaction((store) => {
    store.payments[record.orderId] = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    return store.payments[record.orderId];
  });
}

export async function getPaymentRecord(orderId) {
  const store = await readPaymentStore();
  return store.payments[orderId] || null;
}

export async function updatePaymentRecord(orderId, updater) {
  return withPaymentStoreTransaction((store) => {
    const current = store.payments[orderId];
    if (!current) return null;

    const next = {
      ...updater(current),
      updatedAt: new Date().toISOString(),
    };
    store.payments[orderId] = next;
    return next;
  });
}

export async function getTokenLedger({ quoteHoldMinutes, maxSaleTokens } = {}) {
  const store = await readPaymentStore();
  return calculateTokenLedgerFromPayments(store.payments, { quoteHoldMinutes, maxSaleTokens });
}

export async function getAllocatedTokenTotal({ quoteHoldMinutes } = {}) {
  const ledger = await getTokenLedger({ quoteHoldMinutes });
  return ledger.tokensAllocated;
}

export function calculateTokenLedgerFromPayments(payments = {}, { quoteHoldMinutes, maxSaleTokens } = {}) {
  const now = Date.now();
  const holdMs = Math.max(Number(quoteHoldMinutes) || 0, 0) * 60 * 1000;
  const maxTokens = Number(maxSaleTokens);
  const normalizedMaxSaleTokens = Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : null;

  const ledger = Object.values(payments).reduce((totals, record) => {
    const tokenAmount = Number(record.tokenAmount);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) return totals;

    if (FINALIZED_TOKEN_STATUSES.has(record.status) || FINALIZED_TOKEN_STATUSES.has(record.nowPaymentsStatus)) {
      totals.tokensSold += tokenAmount;
      return totals;
    }

    if (!RESERVED_TOKEN_STATUSES.has(record.status) && !RESERVED_TOKEN_STATUSES.has(record.nowPaymentsStatus)) {
      return totals;
    }

    if (!holdMs) {
      totals.tokensReserved += tokenAmount;
      return totals;
    }

    const createdAt = Date.parse(record.createdAt || record.updatedAt || '');
    if (!Number.isFinite(createdAt)) return totals;

    if (now - createdAt <= holdMs) {
      totals.tokensReserved += tokenAmount;
    }

    return totals;
  }, {
    tokensSold: 0,
    tokensReserved: 0,
  });

  const tokensAllocated = ledger.tokensSold + ledger.tokensReserved;

  return {
    tokensSold: roundTokenTotal(ledger.tokensSold),
    tokensReserved: roundTokenTotal(ledger.tokensReserved),
    tokensAllocated: roundTokenTotal(tokensAllocated),
    maxSaleTokens: normalizedMaxSaleTokens,
    tokensAvailable: normalizedMaxSaleTokens === null
      ? null
      : roundTokenTotal(Math.max(normalizedMaxSaleTokens - tokensAllocated, 0)),
  };
}

function roundTokenTotal(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1e8) / 1e8;
}
