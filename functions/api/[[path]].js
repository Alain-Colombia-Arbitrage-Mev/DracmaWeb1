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
  };
  const method = methods[url.pathname];
  const json = (error, status, headers = {}) => Response.json({ error }, {
    status, headers: { 'Cache-Control': 'no-store', ...headers },
  });
  if (!method) return json('Not found.', 404);
  if (request.method !== method) return json('Method not allowed.', 405, { Allow: method });

  let upstream;
  try {
    const origin = new URL(env.API_ORIGIN || 'https://32.196.242.92.sslip.io');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.origin === url.origin) {
      return json('Invalid API configuration.', 503);
    }
    upstream = new URL(url.pathname + url.search, origin.origin);
  } catch {
    return json('Invalid API configuration.', 503);
  }

  const headers = new Headers();
  for (const name of ['content-type', 'accept', 'x-nowpayments-sig']) {
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
