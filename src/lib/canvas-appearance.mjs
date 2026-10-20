import {parseFragment,serialize} from 'parse5';
import projects from '../data/pencil-projects.json' with {type:'json'};
const protectedWords = ['DRACMA','USDC','USDT','USD','BSC','BNB','BEP-20','IA','EA','MQL5','II','US$','NOWPayments','Avalanche','Safe','Quant','Atacama','Colombia','Bajío','Medellín','Huila','Lima','México','Brasil','Asia','EE. UU.',...projects.map(project=>project.name)];
export function initialCase(value){
 let next=value;
 const letters=value.replace(/[^\p{L}]/gu,'');
 if(letters.length>1&&letters===letters.toLocaleUpperCase('es'))next=value.toLocaleLowerCase('es');
 for(const word of protectedWords)next=next.replace(new RegExp(`(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![\\p{L}\\p{N}])`,'giu'),word);
 next=next.replace(/\bus\$/gi,'US$');
 return next.replace(/(^|[.!?]\s*)([\s¿¡«"']*\p{L})/gu,(_,before,first)=>before+first.toLocaleUpperCase('es'));
}
export function canvasAppearance(html){
 const doc=parseFragment(html);
 const walk=n=>{
  const cls=n.attrs?.find(a=>a.name==='class')?.value||'';
  // The debit cards are product artwork: their printed colors and lettering stay fixed.
  if(cls.split(/\s/).includes('debit-card'))return;
  if(n.tagName==='svg'&&/logo|avalanche|ethereum|bitcoin/i.test(n.attrs?.find(a=>a.name==='data-pencil-name')?.value||'')){n.attrs.push({name:'data-theme-art',value:''});}
  const title=/^h[1-6]$/.test(n.tagName)||((n.tagName==='div'||n.tagName==='a'||n.tagName==='strong')&&/font-(?:bold|semibold|black|medium)/.test(cls)&&Number(cls.match(/text-\[(\d+)px\]/)?.[1])>=20&&(n.childNodes||[]).every(c=>!c.tagName||c.tagName==='br'||c.tagName==='span'));
  if(title){
   const nodes=[];const collect=x=>{if(x.nodeName==='#text')nodes.push(x);else for(const c of x.childNodes||[])collect(c)};collect(n);
   const text=nodes.map(x=>x.value).join('');const formatted=initialCase(text);
   // Case conversion preserves positions for Spanish and our protected acronyms.
   let offset=0;for(const node of nodes){const length=node.value.length;node.value=formatted.slice(offset,offset+length);offset+=length;}
  }
  for(const child of n.childNodes||[])walk(child);
 };walk(doc);return serialize(doc);
}
