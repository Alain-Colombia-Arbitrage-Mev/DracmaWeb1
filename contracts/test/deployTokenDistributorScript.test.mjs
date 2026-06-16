import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = readFileSync(
  join(process.cwd(), 'contracts', 'scripts', 'deployTokenDistributor.mjs'),
  'utf8',
);

test('deploy script accepts the existing PRIVATE_KEY_DEPLOYER env var', () => {
  assert.match(source, /process\.env\.PRIVATE_KEY_DEPLOYER/);
  assert.match(source, /Missing TOKEN_DISTRIBUTOR_PRIVATE_KEY, PRIVATE_KEY_DEPLOYER, or PRIVATE_KEY/);
});
