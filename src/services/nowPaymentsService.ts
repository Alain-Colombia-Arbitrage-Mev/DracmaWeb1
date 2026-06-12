export interface CreateNowPaymentsInvoiceInput {
  walletAddress: string;
  tokenAmount: number;
}

export interface PriceBreakdownItem {
  tierIndex: number;
  tierStart: number;
  tierEnd: number;
  tokens: number;
  priceUsd: number;
  subtotalUsd: number;
}

export interface PricingState {
  tokensAllocated: number;
  tokensSold: number;
  tokensReserved: number;
  maxSaleTokens: number | null;
  tokensAvailable: number | null;
  currentTierIndex: number;
  currentPriceUsd: number;
  nextIncreaseAt: number;
  remainingInCurrentTier: number;
  stepTokens: number;
  stepIncreaseRate: number;
  basePriceUsd: number;
}

export interface PresaleQuote {
  tokenAmount: number;
  tokensAllocatedBefore: number;
  tokensAllocatedAfter: number;
  totalUsd: number;
  averagePriceUsd: number;
  nextPriceUsd: number;
  breakdown: PriceBreakdownItem[];
  minPurchaseUsd: number;
  quoteHoldMinutes: number;
  currentPricing: PricingState;
}

export interface NowPaymentsInvoiceResponse {
  orderId: string;
  invoiceId: string | number | null;
  invoiceUrl: string | null;
  priceAmount: number;
  priceCurrency: string;
  tokenAmount: number;
  tokenPriceUsd: number;
  quote: PresaleQuote;
  walletAddress: string;
  status: string;
}

const productionApiBaseUrl = 'https://dracma-api-proxy.guardcolombia.workers.dev';

function resolveApiBaseUrl() {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'dracma.club' || hostname.endsWith('.dracma.club')) {
      return productionApiBaseUrl;
    }
  }

  return '';
}

const apiBaseUrl = resolveApiBaseUrl();

export async function createNowPaymentsInvoice(
  input: CreateNowPaymentsInvoiceInput,
): Promise<NowPaymentsInvoiceResponse> {
  const response = await fetch(`${apiBaseUrl}/api/payments/nowpayments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || 'No se pudo crear el pago.';
    throw new Error(message);
  }

  return payload as NowPaymentsInvoiceResponse;
}

export async function getPresalePricing(): Promise<PricingState> {
  const response = await fetch(`${apiBaseUrl}/api/presale/pricing`);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || 'No se pudo obtener el precio actual.';
    throw new Error(message);
  }

  return payload as PricingState;
}

export async function getPresaleQuote(tokenAmount: number): Promise<PresaleQuote> {
  const response = await fetch(`${apiBaseUrl}/api/presale/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tokenAmount }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || 'No se pudo calcular la cotizacion.';
    throw new Error(message);
  }

  return payload as PresaleQuote;
}
