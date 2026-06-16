import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const source = readFileSync(join(process.cwd(), 'components', 'Presale.tsx'), 'utf8');

test('presale shows a controlled distribution popup with tx hash and BscScan link', () => {
  assert.match(source, /isDistributionPopupOpen/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /Hash de envio/);
  assert.match(source, /Ver envio en BscScan/);
  assert.match(source, /setIsDistributionPopupOpen\(true\)/);
});
