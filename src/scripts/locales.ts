import {runtimeDictionary} from '../i18n/runtime';
import {LOCALES,localeFor,localePath,translateCopy,basePath} from '../i18n/locales.mjs';
const locale=localeFor(location.pathname);
// NOWPayments returns to the canonical application URL. Recover only a known
// language from this tab, keeping the private order receipt in sessionStorage.
if(locale==='es'&&basePath(location.pathname)==='/comprar/'&&new URLSearchParams(location.search).has('order_id')){
 try{const saved=sessionStorage.getItem('dracma-checkout-locale');if(saved&&saved!=='es'&&LOCALES.includes(saved))location.replace(localePath(location.pathname,saved)+location.search+location.hash);}catch{}
}
if(locale!=='es'){
 if(Object.keys(runtimeDictionary).length){
  const dictionary=runtimeDictionary;
  document.documentElement.lang=locale==='zh'?'zh-Hans':locale;
  document.documentElement.dir=locale==='ar'?'rtl':'ltr';
  document.title=translateCopy(document.title,dictionary);
  document.querySelectorAll<HTMLMetaElement>('meta[name="description"],meta[property="og:title"],meta[property="og:description"]').forEach(meta=>meta.content=translateCopy(meta.content,dictionary));
  document.querySelectorAll('[data-current-language]').forEach(label=>label.textContent=locale.toUpperCase());
  const skip='script,style,code,pre,svg,[data-no-translate],[data-pencil-name="pre"],.debit-card,.dracma-chat-message';
  const attributes=['aria-label','title','placeholder','alt'];
  const original=new WeakMap<Node,string>();const attributeOriginal=new WeakMap<Element,Map<string,string>>();
  const localize=(root:Node)=>{
   if(root instanceof Element&&root.closest(skip))return;
   if(root.nodeType===Node.TEXT_NODE&&root.parentElement&&!root.parentElement.closest(skip)){
    const value=root.nodeValue||'';const previous=original.get(root);
    if(previous&&translateCopy(previous,dictionary)===value)return;
    original.set(root,value);const next=translateCopy(value,dictionary);if(next!==value)root.nodeValue=next;
   }
   if(root instanceof Element){
    let values=attributeOriginal.get(root);if(!values){values=new Map();attributeOriginal.set(root,values);}
    for(const name of attributes){const value=root.getAttribute(name);if(!value)continue;const previous=values.get(name);if(previous&&translateCopy(previous,dictionary)===value)continue;values.set(name,value);const next=translateCopy(value,dictionary);if(next!==value)root.setAttribute(name,next);}
    if(root instanceof HTMLAnchorElement&&!root.hasAttribute('data-locale-link')){const href=root.getAttribute('href');if(href?.startsWith('/')&&!/^\/(?:api|_astro|locales|brand|design-assets)\//.test(href))root.setAttribute('href',localePath(href,locale));}
   }
   for(const child of root.childNodes)localize(child);
  };
  localize(document.body);
  const observer=new MutationObserver(changes=>{for(const change of changes){if(change.type==='childList')for(const node of change.addedNodes)localize(node);else localize(change.target);}});
  observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attributes});
 }
}
