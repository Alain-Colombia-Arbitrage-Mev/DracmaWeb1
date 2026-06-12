import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const proxyPath = resolve(rootDir, 'functions', 'api', '[[path]].js');
const source = readFileSync(proxyPath, 'utf8');

async function loadProxy() {
  return import(`${pathToFileURL(proxyPath).href}?test=${Date.now()}-${Math.random()}`);
}

test('Cloudflare Pages proxies same-origin API calls to the EC2 backend', () => {
  assert.match(source, /const API_ORIGIN = 'http:\/\/ec2-32-196-242-92\.compute-1\.amazonaws\.com'/);
  assert.match(source, /new URL\(`\/api\/\$\{path\}`,\s*API_ORIGIN\)/);
  assert.match(source, /request\.method === 'OPTIONS'/);
  assert.match(source, /return new Response\(upstream\.body/);
});

test('proxy preserves request body for NOWPayments invoice creation', () => {
  assert.match(source, /if \(!\['GET', 'HEAD'\]\.includes\(request\.method\)\) \{/);
  assert.match(source, /init\.body = request\.body/);
});

test('NOWPayments POST is forwarded with body, query string, and signature header', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let forwarded;
  globalThis.fetch = async (url, init) => {
    forwarded = { url: url.toString(), init };
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const { onRequest } = await loadProxy();
  const response = await onRequest({
    request: new Request('https://dracma.club/api/payments/nowpayments?source=presale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nowpayments-sig': 'signature',
      },
      body: JSON.stringify({ tokenAmount: 4, walletAddress: '0x000000000000000000000000000000000000dEaD' }),
    }),
    params: { path: ['payments', 'nowpayments'] },
  });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('X-DRACMA-API-Origin'), 'ec2');
  assert.equal(forwarded.url, 'http://ec2-32-196-242-92.compute-1.amazonaws.com/api/payments/nowpayments?source=presale');
  assert.equal(forwarded.init.method, 'POST');
  assert.equal(forwarded.init.headers.get('x-nowpayments-sig'), 'signature');
  assert.equal(await new Response(forwarded.init.body).text(), JSON.stringify({
    tokenAmount: 4,
    walletAddress: '0x000000000000000000000000000000000000dEaD',
  }));
});

test('CORS preflight is handled at the edge without touching the backend', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(null);
  };

  const { onRequest } = await loadProxy();
  const response = await onRequest({
    request: new Request('https://dracma.club/api/payments/nowpayments', {
      method: 'OPTIONS',
      headers: { Origin: 'https://dracma.club' },
    }),
    params: { path: ['payments', 'nowpayments'] },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://dracma.club');
  assert.equal(called, false);
});
