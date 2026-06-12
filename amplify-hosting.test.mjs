import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rewrites = JSON.parse(readFileSync('amplify-rewrites.json', 'utf8'));
const buildSpec = readFileSync('amplify.yml', 'utf8');

test('Amplify build spec publishes the Astro dist directory', () => {
  assert.match(buildSpec, /npm ci/);
  assert.match(buildSpec, /npm run build/);
  assert.match(buildSpec, /baseDirectory: dist/);
});

test('Amplify rewrite proxies API calls to the HTTPS backend origin', () => {
  const apiRule = rewrites.find((rule) => rule.source === '/api/<*>');

  assert.ok(apiRule, 'API rewrite rule not found');
  assert.equal(apiRule.status, '200');
  assert.equal(apiRule.target, 'https://32.196.242.92.sslip.io/api/<*>');
});
