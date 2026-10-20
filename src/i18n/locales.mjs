export const LOCALES = ['es','en','ar','zh','ru','it'];
export const LANGUAGE_NAMES = {es:'Español',en:'English',ar:'العربية',zh:'中文',ru:'Русский',it:'Italiano'};
export const localeFor = path => LOCALES.find(l=>l!=='es'&&new RegExp(`^/${l}(?:/|$)`).test(path))||'es';
export const basePath = path => path.replace(/^\/(?:en|ar|zh|ru|it)(?=\/|$)/,'')||'/';
export const localePath = (path,locale) => locale==='es'?basePath(path):`/${locale}${basePath(path)}`;
export const normalizeCopy = value => value.replace(/\s+/gu,' ').trim();
const compiledPatterns=new WeakMap();
function patternsFor(dictionary){
 if(compiledPatterns.has(dictionary))return compiledPatterns.get(dictionary);
 const patterns=Object.entries(dictionary).filter(([key])=>/\{\d+\}/.test(key)).map(([pattern,target])=>{
  const tokens=[];const escaped=pattern.split(/(\{\d+\})/).map(part=>/^\{\d+\}$/.test(part)?(tokens.push(part),'(.+?)'):part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');
  return {regex:new RegExp(`^${escaped}$`,'u'),tokens,target};
 });compiledPatterns.set(dictionary,patterns);return patterns;
}
export function translateCopy(value,dictionary){
 const key=normalizeCopy(value);if(!key)return value;
 let translated=dictionary[key];
 if(!translated){const numbered=key.match(/^(\d+[\s·/.-]+)(.+)$/u);if(numbered&&dictionary[numbered[2]])translated=numbered[1]+dictionary[numbered[2]];}
 if(!translated&&key.length<2000){
  for(const {regex,target,tokens} of patternsFor(dictionary)){
   const match=key.match(regex);
   if(match){translated=target.replace(/\{\d+\}/g,t=>match[tokens.indexOf(t)+1]||t);break;}
  }
 }
 return translated?value.replace(/\S[\s\S]*\S|\S/u,translated):value;
}
