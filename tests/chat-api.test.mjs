import test from 'node:test';import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/chat/[[path]].js';
const env={CHAT_API_ORIGIN:'https://agent.example',CHAT_PROXY_SECRET:'server-only-secret'};
const context=(path,opts={},vars=env)=>({request:new Request(`https://dracma.club/api/chat/${path}`,opts),env:vars});
test('chat route rejects unknown paths, methods, unsafe config and cross-origin writes',async()=>{
 for(const [ctx,status] of [[context('admin'),404],[context('questions',{method:'POST'}),405],[context('session',{method:'POST',headers:{Origin:'https://foreign.test','Content-Type':'application/json'},body:'{}'}),403],[context('questions',{}, {...env,CHAT_API_ORIGIN:'http://agent.example'}),503]])assert.equal((await onRequest(ctx)).status,status);
});
test('chat proxy forwards only trusted headers and preserves tokens on the server',async()=>{
 const original=globalThis.fetch;let seen;globalThis.fetch=async(url,init)=>{seen={url:String(url),...init};return Response.json({questions:[]});};
 try{const r=await onRequest(context('messages',{headers:{Authorization:'Bearer opaque','cf-connecting-ip':'192.0.2.3','X-Dracma-Client-IP':'spoofed','X-Dracma-Chat-Proxy':'spoofed'}}));assert.equal(r.status,200);assert.equal(seen.url,'https://agent.example/chat/messages');assert.equal(seen.headers.get('X-Dracma-Chat-Proxy'),env.CHAT_PROXY_SECRET);assert.equal(seen.headers.get('X-Dracma-Client-IP'),'192.0.2.3');assert.equal(seen.headers.get('Authorization'),'Bearer opaque');assert.equal(r.headers.get('cache-control'),'no-store');assert.ok(!(await r.text()).includes(env.CHAT_PROXY_SECRET));}finally{globalThis.fetch=original;}
});
test('chat proxy does not follow redirects or disguise upstream failures',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async(url,init)=>{assert.equal(init.redirect,'manual');return new Response('<html>unavailable</html>',{status:503,headers:{'content-type':'text/html'}});};try{const r=await onRequest(context('questions'));assert.equal(r.status,502);assert.match((await r.json()).error,/no está disponible/);}finally{globalThis.fetch=original;}
});
test('oversized chat message rejected before upstream request',async()=>{const r=await onRequest(context('session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'x'.repeat(9000)})}));assert.equal(r.status,413);});
test('chat forwards a validated locale without trusting arbitrary language headers',async()=>{
 const original=globalThis.fetch;let language;
 globalThis.fetch=async(url,init)=>{language=init.headers.get('X-Dracma-Locale');return Response.json({questions:[]});};
 try{
  assert.equal((await onRequest(context('questions',{headers:{'X-Dracma-Locale':'ar'}}))).status,200);assert.equal(language,'ar');
  assert.equal((await onRequest(context('questions',{headers:{'X-Dracma-Locale':'xx'}}))).status,400);
 }finally{globalThis.fetch=original;}
});
