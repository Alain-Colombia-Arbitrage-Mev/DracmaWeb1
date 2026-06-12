const API_ORIGIN = 'http://ec2-32-196-242-92.compute-1.amazonaws.com';

function resolvePath(param) {
  if (Array.isArray(param)) return param.join('/');
  return param ? String(param) : '';
}

function buildCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      request.headers.get('Access-Control-Request-Headers') || 'Content-Type,x-nowpayments-sig',
    'Access-Control-Max-Age': '86400',
  };
}

function buildForwardHeaders(request) {
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('content-length');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  return headers;
}

export async function onRequest({ request, params }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(request),
    });
  }

  const incomingUrl = new URL(request.url);
  const path = resolvePath(params.path);
  const targetUrl = new URL(`/api/${path}`, API_ORIGIN);
  targetUrl.search = incomingUrl.search;

  const init = {
    method: request.method,
    headers: buildForwardHeaders(request),
    redirect: 'manual',
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body;
  }

  const upstream = await fetch(targetUrl, init);
  const responseHeaders = new Headers(upstream.headers);

  for (const [key, value] of Object.entries(buildCorsHeaders(request))) {
    responseHeaders.set(key, value);
  }
  responseHeaders.set('X-DRACMA-API-Origin', 'ec2');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
