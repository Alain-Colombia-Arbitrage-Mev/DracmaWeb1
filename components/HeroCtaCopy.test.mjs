import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const source = readFileSync(join(process.cwd(), 'constants.ts'), 'utf8');

test('hero presale CTA uses a direct buy-now message in Spanish', () => {
  assert.match(source, /btnJoinPresale:\s*"Comprar ahora"/);
});
