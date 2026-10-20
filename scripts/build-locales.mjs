import fs from 'node:fs';
import path from 'node:path';
import {parse,serialize,parseFragment} from 'parse5';
import {LOCALES,localePath,basePath,translateCopy,normalizeCopy} from '../src/i18n/locales.mjs';
import {SITE_URL,isIndexablePath} from '../src/config/site.mjs';
const pages=JSON.parse(fs.readFileSync('src/data/pencil-pages.json'));
const projects=JSON.parse(fs.readFileSync('src/data/pencil-projects.json'));
const routes=[...new Set([...pages.map(p=>`/${p.slug}${p.slug?'/':''}`),...projects.map(p=>`/proyectos/${p.slug}/`),'/legal/','/preventa/','/success/'])];
const originals=new Map(routes.map(route=>[route,fs.readFileSync(path.join('dist',route,'index.html'),'utf8')]));
const attr=(n,key)=>n.attrs?.find(a=>a.name===key)?.value;
const set=(n,key,value)=>{n.attrs||=[];const a=n.attrs.find(a=>a.name===key);if(a)a.value=value;else n.attrs.push({name:key,value});};
const languageTag=l=>l==='zh'?'zh-Hans':l;
const localURL=(value,locale)=>{if(value.startsWith('#'))return value;try{const u=new URL(value,SITE_URL);if(u.origin!==SITE_URL||!routes.includes(basePath(u.pathname)))return value;return (value.startsWith('http')?SITE_URL:'')+localePath(u.pathname,locale)+u.search+u.hash;}catch{return value;}};
const script=(value,locale,dictionary,key='')=>{
 if(Array.isArray(value))return value.map(v=>script(v,locale,dictionary));
 if(value&&typeof value==='object'){
  const next=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,script(v,locale,dictionary,k)]));
  if(value['@type']==='WebPage'){next.url=localURL(value.url,locale);next['@id']=localURL(value['@id'],locale);}
  return next;
 }
 if(typeof value!=='string')return value;
 if(key==='inLanguage')return languageTag(locale);
 if(['name','description'].includes(key))return translateCopy(value,dictionary);
 if(value.startsWith(SITE_URL)&&!/#(?:organization|website)$/.test(value)&&(value!==SITE_URL+'/'||key==='item'))return localURL(value,locale);
 return value;
};
for(const locale of LOCALES){
 const dictionary=locale==='es'?{}:JSON.parse(fs.readFileSync(`src/i18n/catalogs/${locale}.json`));
 if(locale!=='es'){fs.mkdirSync('dist/locales',{recursive:true});fs.writeFileSync(`dist/locales/${locale}.json`,JSON.stringify(dictionary));}
 for(const [route,original] of originals){
  const doc=parse(original);let head;
  const walk=(n,blocked=false)=>{
   const cls=attr(n,'class')||'';
   if(n.tagName==='html'){set(n,'lang',languageTag(locale));set(n,'dir',locale==='ar'?'rtl':'ltr');}
   if(n.tagName==='body'&&attr(n,'class'))set(n,'class',attr(n,'class').replace(/\blang-[\w-]+\b/g,'lang-'+locale));
   if(n.tagName==='head'){head=n;n.childNodes=n.childNodes.filter(c=>!(c.tagName==='link'&&attr(c,'rel')==='alternate'));}
   if(n.tagName==='script'&&attr(n,'type')==='application/ld+json'){
    const content=n.childNodes.find(c=>c.nodeName==='#text');if(content)content.value=JSON.stringify(script(JSON.parse(content.value),locale,dictionary)).replace(/</g,'\\u003c');return;
   }
   const codeBlock=attr(n,'data-pencil-name')==='pre';
   if(codeBlock){set(n,'data-no-translate','');set(n,'dir','ltr');}
   const skip=blocked||codeBlock||['script','style','pre','code','svg','noscript'].includes(n.tagName)||/\bdebit-card\b/.test(cls)||attr(n,'data-no-translate')!==undefined||attr(n,'data-current-language')!==undefined;
   if(n.nodeName==='#text'&&!skip&&locale!=='es'){
    const key=normalizeCopy(n.value);
    if(/\p{L}/u.test(key)&&!Object.hasOwn(dictionary,key))throw Error(`Missing ${locale} translation on ${route}: ${key}`);
    n.value=translateCopy(n.value,dictionary);
   }
   if(n.tagName==='a'){
    const target=attr(n,'data-locale-link');
    if(target){set(n,'href',localePath(route,target));n.attrs=n.attrs.filter(a=>a.name!=='aria-current');if(target===locale)set(n,'aria-current','page');}
    else if(attr(n,'href'))set(n,'href',localURL(attr(n,'href'),locale));
   }
   if(attr(n,'data-current-language')!==undefined)n.childNodes=[{nodeName:'#text',value:locale.toUpperCase(),parentNode:n}];
   if(!skip||n.tagName==='img')for(const a of n.attrs||[])if(['aria-label','alt','title','placeholder'].includes(a.name))a.value=translateCopy(a.value,dictionary);
   if(n.tagName==='link'&&attr(n,'rel')==='canonical')set(n,'href',SITE_URL+localePath(route,locale));
   if(n.tagName==='meta'){
    const name=attr(n,'name')||attr(n,'property');
    if(name==='og:url')set(n,'content',SITE_URL+localePath(route,locale));
    else if(name==='og:locale')set(n,'content',({es:'es_ES',en:'en_US',ar:'ar_SA',zh:'zh_CN',ru:'ru_RU',it:'it_IT'})[locale]);
    else if(['description','og:title','og:description','og:image:alt','twitter:title','twitter:description','twitter:image:alt'].includes(name))set(n,'content',translateCopy(attr(n,'content')||'',dictionary));
   }
   for(const child of n.childNodes||[])walk(child,skip);
  };walk(doc);
  if(isIndexablePath(route)){
   const alternates=LOCALES.map(l=>`<link rel="alternate" hreflang="${languageTag(l)}" href="${SITE_URL+localePath(route,l)}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${SITE_URL+route}">`;
   for(const node of parseFragment(alternates).childNodes){node.parentNode=head;head.childNodes.push(node);}
  }
  if(['ar','zh'].includes(locale))for(const node of parseFragment(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${locale==='ar'?'Noto+Sans+Arabic:wght@400;500;600;700;800;900':'Noto+Sans+SC:wght@400;500;600;700;800;900'}&display=swap">`).childNodes){node.parentNode=head;head.childNodes.push(node);}
  const target=path.join('dist',localePath(route,locale),'index.html');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,serialize(doc));
 }
}
const locations=LOCALES.flatMap(locale=>routes.filter(isIndexablePath).map(route=>`<url><loc>${SITE_URL+localePath(route,locale)}</loc>${LOCALES.map(l=>`<xhtml:link rel="alternate" hreflang="${languageTag(l)}" href="${SITE_URL+localePath(route,l)}"/>`).join('')}</url>`));
fs.writeFileSync('dist/sitemap-0.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${locations.join('')}</urlset>`);
console.log(`Localized ${routes.length} routes in ${LOCALES.length} languages; ${locations.length} indexable URLs.`);
