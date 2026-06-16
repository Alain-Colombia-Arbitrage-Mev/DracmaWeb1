import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const source = readFileSync(join(process.cwd(), 'components', 'Presale.tsx'), 'utf8');

test('presale frontend writes the quoted price and refreshes it when backend pricing changes', () => {
  assert.match(source, /quoteRefreshKey/);
  assert.match(source, /setQuoteRefreshKey/);
  assert.match(source, /displayedPurchasePrice/);
  assert.match(source, /Precio cotizado/);
  assert.match(source, /Sube 10% por cada/);
  assert.match(source, /\[investmentAmount,\s*quoteRefreshKey\]/);
});
