import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toInteger(process.env.PORT, 8787),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  nowPaymentsApiUrl: process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1',
  nowPaymentsApiKey: process.env.NOWPAYMENTS_API_KEY || '',
  nowPaymentsPublicKey: process.env.NOWPAYMENTS_PUBLIC_KEY || '',
  nowPaymentsIpnSecret: process.env.NOWPAYMENTS_IPN_SECRET || '',
  nowPaymentsIpnCallbackUrl:
    process.env.NOWPAYMENTS_IPN_CALLBACK_URL ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:8787'}/api/webhooks/nowpayments`,
  saleTokenAddress:
    process.env.SALE_TOKEN_ADDRESS || '0x8A9f07fdBc75144C9207373597136c6E280A872D',
  saleTokenDecimals: toInteger(process.env.SALE_TOKEN_DECIMALS, 18),
  tokenPriceUsd: toNumber(process.env.BASE_TOKEN_PRICE_USD || process.env.TOKEN_PRICE_USD, 0.12),
  priceStepTokens: toInteger(process.env.PRICE_STEP_TOKENS, 100000),
  priceStepIncreaseRate: toNumber(process.env.PRICE_STEP_INCREASE_RATE, 0.10),
  quoteHoldMinutes: toInteger(process.env.QUOTE_HOLD_MINUTES, 60),
  maxSaleTokens: toNumber(process.env.MAX_SALE_TOKENS || process.env.SALE_TOKEN_SUPPLY, 400000000),
  minPurchaseUsd: toNumber(process.env.MIN_PURCHASE_USD, 100),
  bscRpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
  tokenDistributorPrivateKey:
    process.env.TOKEN_DISTRIBUTOR_PRIVATE_KEY ||
    process.env.PRIVATE_KEY_DEPLOYER ||
    process.env.PRIVATE_KEY ||
    '',
  tokenDistributionMode: process.env.TOKEN_DISTRIBUTION_MODE || 'disabled',
  tokenDistributorContractAddress: process.env.TOKEN_DISTRIBUTOR_CONTRACT_ADDRESS || '',
  tokenDistributorFunction: process.env.TOKEN_DISTRIBUTOR_FUNCTION || 'releaseTokens',
  tokenDistributorAbiJson: process.env.TOKEN_DISTRIBUTOR_ABI_JSON || '',
  paymentStorePath: process.env.PAYMENT_STORE_PATH || '',
};

export function assertNowPaymentsConfigured() {
  if (!config.nowPaymentsApiKey) {
    throw new Error('NOWPAYMENTS_API_KEY is not configured.');
  }
}
