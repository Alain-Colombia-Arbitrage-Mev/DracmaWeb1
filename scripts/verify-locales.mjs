import fs from'node:fs';import assert from'node:assert/strict';import{parse}from'parse5';
import{LOCALES,localePath}from'../src/i18n/locales.mjs';
import{SITE_URL}from'../src/config/site.mjs';
const pages=JSON.parse(fs.readFileSync('src/data/pencil-pages.json'));const projects=JSON.parse(fs.readFileSync('src/data/pencil-projects.json'));
const routes=[...new Set([...pages.map(p=>`/${p.slug}${p.slug?'/':''}`),...projects.map(p=>`/proyectos/${p.slug}/`),'/legal/'])];
const attrs=n=>Object.fromEntries((n.attrs||[]).map(a=>[a.name,a.value]));const walk=(n,f)=>{f(n);for(const c of n.childNodes||[])walk(c,f)};
let checked=0;
for(const locale of LOCALES)for(const route of routes){
 const target=localePath(route,locale);const html=fs.readFileSync(`dist${target}index.html`,'utf8');const doc=parse(html);let root;const alternates=[];const code=[];
 walk(doc,n=>{const a=attrs(n);if(n.tagName==='html')root=a;if(n.tagName==='link'&&a.rel==='alternate')alternates.push(a);if(a['data-pencil-name']==='pre')code.push(n);});
 assert.equal(root.lang,locale==='zh'?'zh-Hans':locale,target);assert.equal(root.dir,locale==='ar'?'rtl':'ltr',target);assert.equal(root['data-theme'],'dark',target);
 assert.equal(alternates.length,7,target);for(const other of LOCALES){const tag=other==='zh'?'zh-Hans':other;assert.ok(alternates.some(a=>a.hreflang===tag&&a.href===SITE_URL+localePath(route,other)),target+' missing '+other);}
 for(const n of code){assert.equal(attrs(n).dir,'ltr');assert.ok(Object.hasOwn(attrs(n),'data-no-translate'));}
 assert.ok(!/ZXPH\d+HPXZ|ZXID\d+DIXZ/.test(html),'translation placeholder leaked: '+target);checked++;
}
const faqs=JSON.parse(fs.readFileSync('deploy/chatwoot/bot/faq-locales.json'));
for(const locale of LOCALES.filter(l=>l!=='es')){
 assert.equal(faqs[locale].questions.length,10);
 const contract=faqs[locale].questions.find(q=>q.id==='contrato');assert.ok(contract.answer.includes('0x8A9f07fdBc75144C9207373597136c6E280A872D'));
 assert.ok(contract.answer.includes(`https://dracma.club/${locale}/comprar/`));
 assert.ok(faqs[locale].questions.find(q=>q.id==='equipo').handoff);
}
console.log(`Verified ${checked} localized canonical pages, reciprocal language links, RTL, preserved code and 50 translated chatbot answers.`);
