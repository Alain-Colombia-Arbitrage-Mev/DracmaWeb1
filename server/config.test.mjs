import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = readFileSync(join(process.cwd(), 'server', 'config.mjs'), 'utf8');

test('backend token distributor signer can use PRIVATE_KEY_DEPLOYER from env', () => {
  assert.match(source, /process\.env\.PRIVATE_KEY_DEPLOYER/);
});
