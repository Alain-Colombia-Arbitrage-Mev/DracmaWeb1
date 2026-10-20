import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/api/[[path]].js';

const call = (path, init = {}) => onRequest({
  request: new Request(`https://dracma.club/api/v1/${path}`, init),
  env: { GO_API_ORIGIN: 'https://backend.example' },
});
test('authentication proxy preserves security boundaries', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url.origin, 'https://backend.example');
    assert.equal(init.headers.get('Origin'), 'https://dracma.club');
    assert.equal(init.headers.get('X-CSRF-Token'), 'test-csrf');
    assert.equal(init.headers.get('Cookie'), '__Host-dracma_session=abcdef');
    assert.equal(init.headers.get('Cookie').includes('analytics'), false);
    return Response.json({ ok: true }, { headers: {
      'Set-Cookie': '__Host-dracma_session=123abc; Path=/; Secure; HttpOnly; SameSite=Strict',
      'Retry-After': '60',
    }});
  };
  const init = { method: 'POST', headers: {
    Origin: 'https://dracma.club', 'Content-Type': 'application/json',
    Cookie: 'analytics=private; __Host-dracma_session=abcdef', 'X-CSRF-Token': 'test-csrf',
  }, body: '{}' };
  const response = await call('auth/logout', init);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Strict/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Retry-After'), '60');
  for (const origin of ['', 'https://evil.example']) {
    assert.equal((await call('auth/login', { ...init, headers: { ...init.headers, Origin: origin } })).status, 403);
  }
  assert.equal((await call('auth/logout', { ...init, headers: { ...init.headers, 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await call('auth/logout', { ...init, headers: { ...init.headers, Cookie: '__Host-dracma_session=abc; __Host-dracma_session=def' } })).status, 400);
  assert.equal((await call('auth/admin', init)).status, 404);
  assert.equal((await call('auth/login')).status, 405);
  assert.equal(calls, 1);
});
test('proxy does not forward session cookies to payments or unrelated upstream cookies', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (_, init) => {
    assert.equal(init.headers.get('Cookie'), null);
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': 'other=secret; Path=/' } });
  };
  const response = await call('market/price', { headers: { Cookie: '__Host-dracma_session=abc' } });
  assert.equal(response.headers.get('Set-Cookie'), null);
  for (const cookie of [
    '__Host-dracma_session=abcdef; Path=/; HttpOnly; SameSite=Strict',
    '__Host-dracma_session=abcdef; Path=/; Secure; HttpOnly; SameSite=Strict; Domain=dracma.club',
    'other=secret; Path=/; Secure; HttpOnly; SameSite=Strict',
  ]) {
    globalThis.fetch = async () => Response.json({ ok: true }, { headers: { 'Set-Cookie': cookie } });
    assert.equal((await call('auth/session')).headers.get('Set-Cookie'), null);
  }
});
