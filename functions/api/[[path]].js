// Keep payment keys, order storage and token distribution on the existing API.
// Pages only forwards explicitly allowed routes. Account secrets stay in HttpOnly cookies.
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
    '/api/v1/payments/currencies': 'GET',
    '/api/v1/quotes': 'POST',
    '/api/v1/checkout/invoices': 'POST',
    '/api/v1/webhooks/nowpayments': 'POST',
    '/api/v1/auth/register': 'POST',
    '/api/v1/auth/login': 'POST',
    '/api/v1/auth/session': 'GET',
    '/api/v1/auth/logout': 'POST',
    '/api/v1/auth/logout-all': 'POST',
    '/api/v1/auth/password': 'POST',
  };
  const isAuth = url.pathname.startsWith('/api/v1/auth/');
  const isGoAPI=url.pathname.startsWith('/api/v1/');
  const orderPath=/^\/api\/v1\/orders\/o_[a-f0-9]{32}$/.test(url.pathname);
  const method = methods[url.pathname] || (orderPath ? 'GET' : undefined);
  const json = (error, status, headers = {}) => Response.json({ error }, {
    status, headers: { 'Cache-Control': 'no-store', ...headers },
  });
  if (!method) return json('Not found.', 404);
  if (request.method !== method) return json('Method not allowed.', 405, { Allow: method });
  if (isAuth && method === 'POST' && (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site')) {
    return json('Origen no permitido.', 403);
  }

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
  if (isAuth) {
    for (const name of ['origin', 'x-csrf-token', 'sec-fetch-site']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    // Forward only the production session cookie, never other website cookies.
    const sessions = (request.headers.get('cookie') || '').split(';')
      .map(value => value.trim()).filter(value => value.startsWith('__Host-dracma_session='));
    if (sessions.length > 1) return json('Solicitud de sesión no válida.', 400);
    if (sessions.length === 1) headers.set('cookie', sessions[0]);
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
    const responseHeaders = new Headers({
      'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    });
    const retry = response.headers.get('Retry-After');
    if (retry && /^\d{1,5}$/.test(retry)) responseHeaders.set('Retry-After', retry);
    if (isAuth) {
      const cookies = response.headers.getSetCookie?.() || [response.headers.get('Set-Cookie')].filter(Boolean);
      for (const cookie of cookies) {
        // __Host- cookies must remain host-only, secure and scoped to /.
        if (/^__Host-dracma_session=[a-f0-9]*;/i.test(cookie) &&
            /;\s*Secure(?:;|$)/i.test(cookie) && /;\s*HttpOnly(?:;|$)/i.test(cookie) &&
            /;\s*SameSite=Strict(?:;|$)/i.test(cookie) && /;\s*Path=\/(?:;|$)/i.test(cookie) &&
            !/;\s*Domain=/i.test(cookie)) responseHeaders.append('Set-Cookie', cookie);
      }
    }
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return json('Payment service unavailable. Please try again later.', 502);
  }
}
