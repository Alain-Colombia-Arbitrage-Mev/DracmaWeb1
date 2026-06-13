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
    block.includes('btn-primary') && block.includes('Pagar usando crypto'),
  );

  assert.ok(primaryCta, 'primary purchase CTA not found');
  assert.match(primaryCta, /onClick=\{handleNowPaymentsPurchase\}/);
  assert.doesNotMatch(primaryCta, /onClick=\{handlePurchase\}/);
  assert.match(primaryCta, /disabled=\{!canCreateCryptoPayment\}/);
});

test('purchase CTA uses crypto payment copy instead of wallet connection copy', () => {
  assert.doesNotMatch(source, /btnConnectAndConfirm/);
  assert.doesNotMatch(source, /Conectar wallet y pagar con NOWPayments/);
  assert.match(source, /Pagar usando crypto/);
});

test('crypto checkout collects recipient wallet and does not require wallet connection', () => {
  assert.match(source, /recipientWalletAddress/);
  assert.match(source, /isRecipientWalletValid/);
  assert.match(source, /recipientWalletAddress:\s*normalizedRecipientWalletAddress/);
  assert.match(source, /walletAddress:\s*normalizedCheckoutWalletAddress/);
  assert.doesNotMatch(source, /pendingNowPaymentsCheckout/);
  assert.doesNotMatch(source, /handleConnectWallet\(\)/);
  assert.doesNotMatch(source, /switchChainAsync\(\{ chainId: bsc\.id \}\)/);
});

test('purchase form no longer exposes the direct on-chain buy flow', () => {
  assert.doesNotMatch(source, /const handlePurchase = useCallback/);
  assert.doesNotMatch(source, /buyTokens\(/);
});

test('NOWPayments checkout window is opened before the async invoice call', () => {
  const handler = source.match(/const handleNowPaymentsPurchase = useCallback\(async \(\) => \{([\s\S]*?)\n  \}, \[/)?.[1] ?? '';
  const openIndex = handler.indexOf('openNowPaymentsWindow()');
  const invoiceIndex = handler.indexOf('await createNowPaymentsInvoice');

  assert.ok(openIndex >= 0, 'checkout popup is not opened synchronously');
  assert.ok(invoiceIndex > openIndex, 'invoice call must happen after popup creation');
  assert.match(source, /window\.open\('about:blank', '_blank'\)/);
  assert.match(handler, /paymentWindow\.location\.href = checkout\.invoiceUrl/);
});

test('presale shows post-payment status and distribution proof', () => {
  assert.match(source, /getNowPaymentsPayment/);
  assert.match(source, /trackedOrderId/);
  assert.match(source, /isDistributionPopupOpen/);
  assert.match(source, /Hash de envio/);
  assert.match(source, /Ver envio en BscScan/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
});
