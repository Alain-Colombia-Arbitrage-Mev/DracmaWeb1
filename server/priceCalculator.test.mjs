import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateQuoteForTokens, getPricingState } from './priceCalculator.mjs';

const priceOptions = {
  basePriceUsd: 0.10,
  stepTokens: 100000,
  stepIncreaseRate: 0.10,
};

test('presale price increases 10 percent for every 100,000 allocated tokens', () => {
  assert.equal(getPricingState(0, priceOptions).currentPriceUsd, 0.10);
  assert.equal(getPricingState(100000, priceOptions).currentPriceUsd, 0.11);
  assert.equal(getPricingState(200000, priceOptions).currentPriceUsd, 0.121);
});

test('quote writes the automatic 100,000 token pricing tiers into the breakdown', () => {
  const quote = calculateQuoteForTokens(2, 99999, priceOptions);

  assert.equal(quote.totalUsd, 0.21);
  assert.equal(quote.averagePriceUsd, 0.105);
  assert.deepEqual(
    quote.breakdown.map((item) => ({
      tierIndex: item.tierIndex,
      tokens: item.tokens,
      priceUsd: item.priceUsd,
    })),
    [
      { tierIndex: 0, tokens: 1, priceUsd: 0.10 },
      { tierIndex: 1, tokens: 1, priceUsd: 0.11 },
    ],
  );
});
