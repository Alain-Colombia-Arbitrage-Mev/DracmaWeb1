// Keep payment keys, order storage and token distribution on the existing API.
// Pages only forwards the endpoints used by this frontend and the signed webhook.
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const methods = {
    '/api/health': 'GET',
    '/api/presale/pricing': 'GET',
    '/api/presale/ledger': 'GET',
    '/api/presale/quote': 'POST',
    '/api/payments/nowpayments': 'POST',
    '/api/webhooks/nowpayments': 'POST',
    '/api/v1/market/price': 'GET',
    '/api/v1/quotes': 'POST',
    '/api/v1/checkout/invoices': 'POST',
    '/api/v1/webhooks/nowpayments': 'POST',
  };
  const isGoAPI=url.pathname.startsWith('/api/v1/');
  const orderPath=/^\/api\/v1\/orders\/o_[a-f0-9]{32}$/.test(url.pathname);
  const method = methods[url.pathname] || (orderPath ? 'GET' : undefined);
  const json = (error, status, headers = {}) => Response.json({ error }, {
    status, headers: { 'Cache-Control': 'no-store', ...headers },
  });
  if (!method) return json('Not found.', 404);
  if (request.method !== method) return json('Method not allowed.', 405, { Allow: method });

  let upstream;
  try {
    // Versioned purchases use Go. Keep legacy callbacks on their existing origin during migration.
    const configuredOrigin=isGoAPI?env.GO_API_ORIGIN:(env.API_ORIGIN||'https://32.196.242.92.sslip.io');
    if(!configuredOrigin)return json('El servicio de compra todavía no está configurado.',503);
    const origin = new URL(configuredOrigin);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.origin === url.origin) {
      return json('Invalid API configuration.', 503);
    }
    upstream = new URL(url.pathname + url.search, origin.origin);
  } catch {
    return json('Invalid API configuration.', 503);
  }

  const headers = new Headers();
  for (const name of ['content-type', 'accept', 'x-nowpayments-sig',...(isGoAPI?['idempotency-key','authorization']:[])]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(upstream, {
      method, headers,
      body: method === 'POST' ? request.body : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      duplex: method === 'POST' ? 'half' : undefined,
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return json('Payment service unavailable. Please try again later.', 502);
    }
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return json('Payment service unavailable. Please try again later.', 502);
  }
}
