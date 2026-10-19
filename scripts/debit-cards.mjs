import { parseFragment } from 'parse5';

const attrs = n => Object.fromEntries((n.attrs || []).map(a => [a.name,a.value]));
const walk = (n,fn) => { fn(n); for (const c of n.childNodes || []) walk(c,fn); };
const set = (n,name,value) => { const a=n.attrs.find(a=>a.name===name); if(a)a.value=value;else n.attrs.push({name,value}); };
const chip = `<svg class="debit-chip" viewBox="0 0 44 34" aria-hidden="true"><rect x="1" y="1" width="42" height="32" rx="6" fill="#D2B782" stroke="#80683D" stroke-width="1.5"/><path d="M16 1v9H1m42 0H28V1M1 24h15v9m12 0v-9h15M16 10h12v14H16zM1 17h15m12 0h15" fill="none" stroke="#80683D" stroke-width="1.2"/></svg>`;
const contactless = `<svg class="debit-contactless" viewBox="0 0 24 28" aria-hidden="true"><path d="M6 10a9 9 0 0 1 0 8m5-12a17 17 0 0 1 0 16M16 2a25 25 0 0 1 0 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
const digital = `<div class="debit-digital"><svg viewBox="0 0 20 24" aria-hidden="true"><rect x="4" y="1.5" width="12" height="21" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 5h4m-3 14h2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span>USO DIGITAL</span></div>`;

function card(virtual) {
  return `<div class="debit-card debit-card--${virtual?'virtual':'physical'}" data-debit-card="${virtual?'virtual':'physical'}" role="img" aria-label="Diseño ilustrativo de tarjeta de débito ${virtual?'virtual':'física'} Dracma">
    <div class="debit-card-inner" aria-hidden="true">
      <div class="debit-card-header"><div class="debit-brand"><span class="debit-logo"><img src="/brand/dracma-eagle.webp" alt="" width="32" height="40"></span><strong>dracma</strong></div><span class="debit-type">${virtual?'VIRTUAL':'DÉBITO'}</span></div>
      <div class="debit-card-device">${virtual?digital:chip+contactless}</div>
      <div class="debit-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;${virtual?'0917':'4552'}</div>
      <div class="debit-card-footer"><div><span>TITULAR DE EJEMPLO</span><strong>TU NOMBRE AQUÍ</strong></div><div class="debit-expiry"><span>VÁLIDA HASTA</span><strong>MM/AA</strong></div></div>
    </div>
  </div>`;
}

export function improveDebitCards(root,slug) {
  if(slug!=='')return;
  let showcase,section;
  walk(root,n=>{const id=attrs(n)['data-pencil-id'];if(id==='LTkab')showcase=n;if(id==='K81OQl')section=n;});
  if(!showcase||!section)throw new Error('Missing debit card showcase in homepage design');
  if(attrs(showcase)['data-debit-showcase']!==undefined)return;
  showcase.tagName=showcase.nodeName='figure';
  showcase.attrs=showcase.attrs.filter(a=>['data-pencil-id','data-pencil-name'].includes(a.name));
  showcase.attrs.push({name:'class',value:'debit-showcase'},{name:'data-debit-showcase',value:''});
  showcase.childNodes=parseFragment(card(false)+card(true)+'<figcaption class="debit-showcase-caption">DISEÑO ILUSTRATIVO · FÍSICA Y VIRTUAL</figcaption>').childNodes;
  for(const child of showcase.childNodes)child.parentNode=showcase;
  set(section,'id','tarjetas-debito');
  set(section,'class',attrs(section).class+' debit-presentation');
}
