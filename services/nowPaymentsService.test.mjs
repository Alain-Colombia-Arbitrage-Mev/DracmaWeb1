import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const source = readFileSync(join(process.cwd(), 'services', 'nowPaymentsService.ts'), 'utf8');

test('frontend NOWPayments service exposes order status polling with distribution tx hash', () => {
  assert.match(source, /export interface NowPaymentsPaymentStatus/);
  assert.match(source, /txHash\??: string \| null/);
  assert.match(source, /export async function getNowPaymentsPayment/);
  assert.match(source, /\/api\/payments\/\$\{encodeURIComponent\(orderId\)\}/);
});
