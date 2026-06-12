import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('backend default minimum purchase is 1 USD', () => {
  const configSource = readFileSync(resolve(root, 'server/config.mjs'), 'utf8');
  assert.match(configSource, /minPurchaseUsd:\s*toNumber\(process\.env\.MIN_PURCHASE_USD,\s*1\)/);
});

test('example env documents 1 USD minimum purchase', () => {
  const envExample = readFileSync(resolve(root, '.env.example'), 'utf8');
  assert.match(envExample, /^MIN_PURCHASE_USD=1$/m);
});
