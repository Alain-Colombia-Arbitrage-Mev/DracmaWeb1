export function getTierPriceUsd(tierIndex, basePriceUsd, stepIncreaseRate) {
  const multiplier = Math.pow(1 + stepIncreaseRate, tierIndex);
  return roundMoney(basePriceUsd * multiplier, 8);
}

export function getPricingState(tokensAllocated, { stepTokens, basePriceUsd, stepIncreaseRate }) {
  const currentTierIndex = Math.floor(tokensAllocated / stepTokens);
  const nextIncreaseAt = (currentTierIndex + 1) * stepTokens;

  return {
    tokensAllocated,
    currentTierIndex,
    currentPriceUsd: getTierPriceUsd(currentTierIndex, basePriceUsd, stepIncreaseRate),
    nextIncreaseAt,
    remainingInCurrentTier: Math.max(nextIncreaseAt - tokensAllocated, 0),
    stepTokens,
    stepIncreaseRate,
    basePriceUsd,
  };
}

export function calculateQuoteForTokens(tokenAmount, tokensAllocated, options) {
  const normalizedTokenAmount = Number(tokenAmount);
  if (!Number.isFinite(normalizedTokenAmount) || normalizedTokenAmount <= 0) {
    throw new Error('Token amount must be greater than zero.');
  }

  let cursor = Number(tokensAllocated) || 0;
  let remainingTokens = normalizedTokenAmount;
  let totalUsd = 0;
  const breakdown = [];

  while (remainingTokens > 0) {
    const tierIndex = Math.floor(cursor / options.stepTokens);
    const tierStart = tierIndex * options.stepTokens;
    const tierEnd = tierStart + options.stepTokens;
    const tierPriceUsd = getTierPriceUsd(tierIndex, options.basePriceUsd, options.stepIncreaseRate);
    const availableInTier = Math.max(tierEnd - cursor, 0);
    const trancheTokens = Math.min(remainingTokens, availableInTier || remainingTokens);
    const trancheUsd = trancheTokens * tierPriceUsd;

    breakdown.push({
      tierIndex,
      tierStart,
      tierEnd,
      tokens: roundTokenAmount(trancheTokens),
      priceUsd: tierPriceUsd,
      subtotalUsd: roundMoney(trancheUsd),
    });

    totalUsd += trancheUsd;
    cursor += trancheTokens;
    remainingTokens -= trancheTokens;
  }

  return {
    tokenAmount: roundTokenAmount(normalizedTokenAmount),
    tokensAllocatedBefore: roundTokenAmount(tokensAllocated),
    tokensAllocatedAfter: roundTokenAmount(cursor),
    totalUsd: roundMoney(totalUsd),
    averagePriceUsd: roundMoney(totalUsd / normalizedTokenAmount, 8),
    nextPriceUsd: getTierPriceUsd(Math.floor(cursor / options.stepTokens), options.basePriceUsd, options.stepIncreaseRate),
    breakdown,
  };
}

export function calculateTokensForUsd(usdAmount, tokensAllocated, options) {
  const normalizedUsdAmount = Number(usdAmount);
  if (!Number.isFinite(normalizedUsdAmount) || normalizedUsdAmount <= 0) {
    throw new Error('USD amount must be greater than zero.');
  }

  let cursor = Number(tokensAllocated) || 0;
  let remainingUsd = normalizedUsdAmount;
  let tokenAmount = 0;
  const breakdown = [];

  while (remainingUsd > 0) {
    const tierIndex = Math.floor(cursor / options.stepTokens);
    const tierStart = tierIndex * options.stepTokens;
    const tierEnd = tierStart + options.stepTokens;
    const tierPriceUsd = getTierPriceUsd(tierIndex, options.basePriceUsd, options.stepIncreaseRate);
    const availableTokens = Math.max(tierEnd - cursor, 0);
    const fullTierCost = availableTokens * tierPriceUsd;
    const trancheTokens = remainingUsd >= fullTierCost
      ? availableTokens
      : remainingUsd / tierPriceUsd;
    const trancheUsd = trancheTokens * tierPriceUsd;

    breakdown.push({
      tierIndex,
      tierStart,
      tierEnd,
      tokens: roundTokenAmount(trancheTokens),
      priceUsd: tierPriceUsd,
      subtotalUsd: roundMoney(trancheUsd),
    });

    tokenAmount += trancheTokens;
    cursor += trancheTokens;
    remainingUsd -= trancheUsd;

    if (trancheTokens <= 0) break;
  }

  return {
    usdAmount: roundMoney(normalizedUsdAmount),
    tokenAmount: roundTokenAmount(tokenAmount),
    tokensAllocatedBefore: roundTokenAmount(tokensAllocated),
    tokensAllocatedAfter: roundTokenAmount(cursor),
    averagePriceUsd: roundMoney(normalizedUsdAmount / tokenAmount, 8),
    breakdown,
  };
}

export function roundMoney(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function roundTokenAmount(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1e8) / 1e8;
}
