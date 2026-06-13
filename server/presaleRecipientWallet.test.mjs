import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const payerWallet = '0x1111111111111111111111111111111111111111';
const recipientWallet = '0x2222222222222222222222222222222222222222';

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address().port);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function getFreePort() {
  const server = createServer();
  const port = await listen(server);
  await closeServer(server);
  return port;
}

function createMockNowPaymentsServer() {
  const requests = [];
  const server = createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/invoice') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      requests.push(JSON.parse(raw));
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: 'invoice-1', invoice_url: 'https://pay.example/invoice-1' }));
    });
  });

  return { server, requests };
}

async function waitForApi(baseUrl, child) {
  const deadline = Date.now() + 5000;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`API exited before becoming ready with code ${child.exitCode}.`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError || new Error('API did not become ready.');
}

async function withTestApi(t) {
  const mockNowPayments = createMockNowPaymentsServer();
  const nowPaymentsPort = await listen(mockNowPayments.server);
  const apiPort = await getFreePort();
  const storeDir = await mkdtemp(join(tmpdir(), 'dracma-payments-'));
  const paymentStorePath = join(storeDir, 'payments.json');
  const baseUrl = `http://127.0.0.1:${apiPort}`;

  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(apiPort),
      PAYMENT_STORE_PATH: paymentStorePath,
      NOWPAYMENTS_API_KEY: 'test-nowpayments-key',
      NOWPAYMENTS_API_URL: `http://127.0.0.1:${nowPaymentsPort}`,
      NOWPAYMENTS_IPN_SECRET: 'test-ipn-secret',
      PUBLIC_API_URL: baseUrl,
      PUBLIC_APP_URL: 'http://127.0.0.1:4321',
      TOKEN_DISTRIBUTION_MODE: 'disabled',
      MIN_PURCHASE_USD: '100',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let apiOutput = '';
  child.stdout.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });

  t.after(async () => {
    child.kill();
    await closeServer(mockNowPayments.server);
    await rm(storeDir, { recursive: true, force: true });
  });

  await waitForApi(baseUrl, child).catch((error) => {
    throw new Error(`${error.message}\n${apiOutput}`);
  });

  return {
    baseUrl,
    paymentStorePath,
    nowPaymentsRequests: mockNowPayments.requests,
  };
}

test('NOWPayments order creation requires a recipient wallet address', async (t) => {
  const { baseUrl, nowPaymentsRequests } = await withTestApi(t);

  const response = await fetch(`${baseUrl}/api/payments/nowpayments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: payerWallet,
      tokenAmount: 500,
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.match(payload.error, /wallet.*recibir|recipient/i);
  assert.equal(nowPaymentsRequests.length, 0);
});

test('NOWPayments order stores connected wallet and recipient wallet separately', async (t) => {
  const { baseUrl, paymentStorePath, nowPaymentsRequests } = await withTestApi(t);

  const response = await fetch(`${baseUrl}/api/payments/nowpayments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: payerWallet,
      recipientWalletAddress: recipientWallet,
      tokenAmount: 500,
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.walletAddress, payerWallet);
  assert.equal(payload.recipientWalletAddress, recipientWallet);

  const store = JSON.parse(await readFile(paymentStorePath, 'utf8'));
  const record = store.payments[payload.orderId];

  assert.equal(record.walletAddress, payerWallet);
  assert.equal(record.recipientWalletAddress, recipientWallet);
  assert.match(nowPaymentsRequests[0].order_description, new RegExp(recipientWallet, 'i'));
});

test('NOWPayments order can be created from mobile with only a recipient wallet', async (t) => {
  const { baseUrl, paymentStorePath, nowPaymentsRequests } = await withTestApi(t);

  const response = await fetch(`${baseUrl}/api/payments/nowpayments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipientWalletAddress: recipientWallet,
      tokenAmount: 500,
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.walletAddress, recipientWallet);
  assert.equal(payload.recipientWalletAddress, recipientWallet);

  const store = JSON.parse(await readFile(paymentStorePath, 'utf8'));
  const record = store.payments[payload.orderId];

  assert.equal(record.walletAddress, recipientWallet);
  assert.equal(record.recipientWalletAddress, recipientWallet);
  assert.equal(nowPaymentsRequests.length, 1);
});
