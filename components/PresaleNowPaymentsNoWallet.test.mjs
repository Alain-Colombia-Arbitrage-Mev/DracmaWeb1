import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const source = readFileSync(join(process.cwd(), 'components', 'Presale.tsx'), 'utf8');

test('presale checkout uses crypto payment without requiring a connected wallet', () => {
  assert.match(source, /normalizedCheckoutWalletAddress/);
  assert.match(source, /walletAddress:\s*normalizedCheckoutWalletAddress/);
  assert.match(source, /canCreatePayment\s*=\s*totalTokensReceived > 0/);
  assert.match(source, /Pagar usando crypto/);
  assert.doesNotMatch(source, /!\s*wallet\.isConnected\s*\?/);
  assert.doesNotMatch(source, /!\s*wallet\.isCorrectNetwork\s*\?/);
});
