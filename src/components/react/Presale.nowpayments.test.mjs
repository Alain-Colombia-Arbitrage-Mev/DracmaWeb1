import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), 'Presale.tsx');
const source = readFileSync(sourcePath, 'utf8');

function buttonBlocks() {
  return source.match(/<button[\s\S]*?<\/button>/g) ?? [];
}

test('primary purchase CTA creates a NOWPayments invoice', () => {
  const primaryCta = buttonBlocks().find((block) =>
    block.includes('btn-primary') && block.includes('btnConfirmPurchase'),
  );

  assert.ok(primaryCta, 'primary purchase CTA not found');
  assert.match(primaryCta, /onClick=\{handleNowPaymentsPurchase\}/);
  assert.doesNotMatch(primaryCta, /onClick=\{handlePurchase\}/);
  assert.match(primaryCta, /parseFloat\(investmentAmount\) < 1(?!\d)/);
});

test('purchase form no longer exposes the direct on-chain buy flow', () => {
  assert.doesNotMatch(source, /const handlePurchase = useCallback/);
  assert.doesNotMatch(source, /buyTokens\(/);
});

test('NOWPayments checkout window is opened before the async invoice call', () => {
  const handler = source.match(/const handleNowPaymentsPurchase = useCallback\(async \(\) => \{([\s\S]*?)\n  \}, \[/)?.[1] ?? '';
  const openIndex = handler.indexOf("window.open('about:blank'");
  const invoiceIndex = handler.indexOf('await createNowPaymentsInvoice');

  assert.ok(openIndex >= 0, 'checkout popup is not opened synchronously');
  assert.ok(invoiceIndex > openIndex, 'invoice call must happen after popup creation');
  assert.match(handler, /paymentWindow\.location\.href = checkout\.invoiceUrl/);
});
