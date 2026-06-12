import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), 'nowPaymentsService.ts');
const source = readFileSync(sourcePath, 'utf8');

test('dracma.club production frontend uses the HTTPS Worker API proxy by default', () => {
  assert.match(source, /const productionApiBaseUrl = 'https:\/\/dracma-api-proxy\.guardcolombia\.workers\.dev'/);
  assert.match(source, /hostname === 'dracma\.club'/);
  assert.match(source, /hostname\.endsWith\('\.dracma\.club'\)/);
});

test('explicit VITE_API_BASE_URL still overrides the production default', () => {
  const configuredIndex = source.indexOf('import.meta.env.VITE_API_BASE_URL');
  const productionHostCheckIndex = source.indexOf("hostname === 'dracma.club'");

  assert.ok(configuredIndex >= 0, 'VITE_API_BASE_URL lookup not found');
  assert.ok(productionHostCheckIndex > configuredIndex, 'configured API base URL must be checked first');
});
