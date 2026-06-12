import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), 'nowPaymentsService.ts');
const source = readFileSync(sourcePath, 'utf8');

test('frontend does not hard-code Cloudflare or another production API proxy', () => {
  assert.doesNotMatch(source, /workers\.dev/);
  assert.doesNotMatch(source, /dracma-api-proxy/);
  assert.doesNotMatch(source, /hostname === 'dracma\.club'/);
});

test('explicit VITE_API_BASE_URL overrides the same-origin Amplify proxy default', () => {
  const configuredIndex = source.indexOf('const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL');
  const defaultIndex = source.indexOf("return '';");

  assert.ok(configuredIndex >= 0, 'VITE_API_BASE_URL lookup not found');
  assert.ok(defaultIndex > configuredIndex, 'same-origin default must be used only after env lookup');
  assert.match(source, /return configuredApiBaseUrl\.replace\(\/\\\/\$\/, ''\)/);
});
