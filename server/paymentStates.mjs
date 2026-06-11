export const ORDER_STATES = Object.freeze({
  CREATING_INVOICE: 'creating_invoice',
  INVOICE_CREATED: 'invoice_created',
  INVOICE_FAILED: 'invoice_failed',
  WAITING: 'waiting',
  CONFIRMING: 'confirming',
  CONFIRMED: 'confirmed',
  SENDING: 'sending',
  PARTIALLY_PAID: 'partially_paid',
  FINISHED: 'finished',
  PAID_PENDING_DISTRIBUTION: 'paid_pending_distribution',
  DISTRIBUTED: 'distributed',
  FAILED: 'failed',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
  VALIDATION_ERROR: 'validation_error',
  DISTRIBUTION_FAILED: 'distribution_failed',
  IPN_UNKNOWN_STATUS: 'ipn_unknown_status',
});

export const KNOWN_NOWPAYMENTS_STATUSES = new Set([
  ORDER_STATES.WAITING,
  ORDER_STATES.CONFIRMING,
  ORDER_STATES.CONFIRMED,
  ORDER_STATES.SENDING,
  ORDER_STATES.PARTIALLY_PAID,
  ORDER_STATES.FINISHED,
  ORDER_STATES.FAILED,
  ORDER_STATES.EXPIRED,
  ORDER_STATES.REFUNDED,
]);

export const FINALIZED_TOKEN_STATUSES = new Set([
  ORDER_STATES.FINISHED,
  ORDER_STATES.PAID_PENDING_DISTRIBUTION,
  ORDER_STATES.DISTRIBUTED,
  ORDER_STATES.DISTRIBUTION_FAILED,
]);

export const RESERVED_TOKEN_STATUSES = new Set([
  ORDER_STATES.CREATING_INVOICE,
  ORDER_STATES.INVOICE_CREATED,
  ORDER_STATES.WAITING,
  ORDER_STATES.CONFIRMING,
  ORDER_STATES.CONFIRMED,
  ORDER_STATES.SENDING,
  ORDER_STATES.PARTIALLY_PAID,
  ORDER_STATES.IPN_UNKNOWN_STATUS,
]);

export function normalizeNowPaymentsStatus(status) {
  const normalizedStatus = String(status || 'unknown').trim().toLowerCase();
  return KNOWN_NOWPAYMENTS_STATUSES.has(normalizedStatus)
    ? normalizedStatus
    : ORDER_STATES.IPN_UNKNOWN_STATUS;
}

export function shouldDistributeTokens(status) {
  return status === ORDER_STATES.FINISHED;
}
