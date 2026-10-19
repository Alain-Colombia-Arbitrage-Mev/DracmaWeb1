import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]].js';
const context = (path, method = 'GET', env = {}) => ({
  request: new Request(`https://dracmaweb1.pages.dev${path}`, { method }), env,
});
test('proxy rejects unrecognized endpoints before fetching', async () => {
  assert.equal((await onRequest(context('/api/admin'))).status, 404);
});
test('proxy rejects writes to read-only pricing endpoint', async () => {
  const response = await onRequest(context('/api/presale/pricing', 'POST'));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});
test('proxy rejects insecure or recursive upstream configuration', async () => {
  for (const API_ORIGIN of ['http://backend.example', 'https://dracmaweb1.pages.dev', 'invalid']) {
    assert.equal((await onRequest(context('/api/health', 'GET', { API_ORIGIN }))).status, 503);
  }
});
test('proxy preserves signed webhook bytes and upstream errors', async () => {
  const originalFetch = globalThis.fetch;
  const body = '{"order_id":"example","payment_status":"finished"}';
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.example/api/webhooks/nowpayments');
    assert.equal(options.headers.get('x-nowpayments-sig'), 'example-signature');
    assert.equal(await new Response(options.body).text(), body);
    return Response.json({ error: 'Invalid signature.' }, { status: 401 });
  };
  try {
    const response = await onRequest({
      request: new Request('https://dracmaweb1.pages.dev/api/webhooks/nowpayments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-nowpayments-sig': 'example-signature' }, body,
      }), env: { API_ORIGIN: 'https://api.example' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally { globalThis.fetch = originalFetch; }
});
test('upstream outage becomes explicit JSON failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('timeout'); };
  try {
    const response = await onRequest(context('/api/health'));
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /unavailable/);
  } finally { globalThis.fetch = originalFetch; }
});
test('Go checkout requires its own configured origin and rejects invalid order paths', async () => {
  assert.equal((await onRequest(context('/api/v1/market/price'))).status,503);
  assert.equal((await onRequest(context('/api/v1/orders/o_other'))).status,404);
  assert.equal((await onRequest(context('/api/v1/admin'))).status,404);
});
test('Go proxy preserves receipt authorization and idempotency without using the legacy origin', async () => {
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    assert.equal(String(url),'https://go.example/api/v1/checkout/invoices');
    assert.equal(options.headers.get('idempotency-key'),'same-purchase-key');
    assert.equal(options.headers.get('authorization'),'Bearer receipt');
    assert.equal(options.headers.get('cookie'),null);
    return Response.json({id:'example'},{status:201});
  };
  try{
    const request=new Request('https://dracmaweb1.pages.dev/api/v1/checkout/invoices',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'same-purchase-key',Authorization:'Bearer receipt',Cookie:'private=1'},body:'{}'});
    assert.equal((await onRequest({request,env:{API_ORIGIN:'https://legacy.example',GO_API_ORIGIN:'https://go.example'}})).status,201);
  }finally{globalThis.fetch=originalFetch;}
});
