import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerPath = resolve(rootDir, 'workers', 'dracma-api-proxy.js');

async function loadWorker() {
  const mod = await import(`${pathToFileURL(workerPath).href}?test=${Date.now()}-${Math.random()}`);
  return mod.default;
}

test('worker proxies API POST requests to the EC2 backend over a DNS hostname', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let forwarded;
  globalThis.fetch = async (url, init) => {
    forwarded = { url: url.toString(), init };
    return new Response(JSON.stringify({ invoiceUrl: 'https://nowpayments.io/invoice/test' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const worker = await loadWorker();
  const response = await worker.fetch(new Request(
    'https://dracma-api-proxy.guardcolombia.workers.dev/api/payments/nowpayments?source=button',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://dracma.club',
      },
      body: JSON.stringify({ tokenAmount: 4, walletAddress: '0x000000000000000000000000000000000000dEaD' }),
    },
  ));

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://dracma.club');
  assert.equal(response.headers.get('X-DRACMA-API-Origin'), 'ec2');
  assert.equal(forwarded.url, 'http://ec2-32-196-242-92.compute-1.amazonaws.com/api/payments/nowpayments?source=button');
  assert.equal(forwarded.init.method, 'POST');
  assert.equal(await new Response(forwarded.init.body).text(), JSON.stringify({
    tokenAmount: 4,
    walletAddress: '0x000000000000000000000000000000000000dEaD',
  }));
});

test('worker rejects non-api paths', async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request('https://dracma-api-proxy.guardcolombia.workers.dev/'));

  assert.equal(response.status, 404);
});
