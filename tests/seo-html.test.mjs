import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDeploymentHTML as normalize} from '../scripts/seo-html.mjs';

const encode=(email,key)=>Buffer.from([key,...Buffer.from(email).map(b=>b^key)]).toString('hex');
const original='<html><head><link rel="canonical" href="https://dracma.club/"></head><body><main><h1>DRACMA</h1></main><a class="contact" href="mailto:info@dracma.org">info@dracma.org</a></body></html>';
const encoded=original.replace('href="mailto:info@dracma.org">info@dracma.org',`href="/cdn-cgi/l/email-protection#${encode('info@dracma.org',7)}"><span class="__cf_email__" data-cfemail="${encode('info@dracma.org',193)}">[email&#160;protected]</span>`).replace('</body>','<script data-cfasync="false" src="/cdn-cgi/scripts/abc123/cloudflare-static/email-decode.min.js"></script></body>');

test('Cloudflare email rewriting compares equal to the original document',()=>assert.equal(normalize(encoded),normalize(original)));
test('changes to canonical and body remain detectable',()=>{
  assert.notEqual(normalize(encoded.replace('https://dracma.club/','https://wrong.example/')),normalize(original));
  assert.notEqual(normalize(encoded.replace('<h1>DRACMA</h1>','<h1>Changed</h1>')),normalize(original));
});
test('unrelated injected scripts remain detectable',()=>assert.notEqual(normalize(encoded.replace('</body>','<script src="/another-script.js"></script></body>')),normalize(original)));
test('malformed email encoding is not silently discarded',()=>assert.notEqual(normalize(encoded.replace(/data-cfemail="[a-f\d]+"/,'data-cfemail="invalid"')),normalize(original)));
