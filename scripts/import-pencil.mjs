import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse, serialize } from 'parse5';
import sharp from 'sharp';
import { normalizePencilFaq } from './pencil-faq.mjs';
import { clarifyProjectPublication } from './project-publication.mjs';
import { normalizeProjectCards } from './project-cards.mjs';
import { improveDebitCards } from './debit-cards.mjs';
const source = process.argv[2] || '/tmp/dracma-pencil-reference';
const pages = JSON.parse(fs.readFileSync('src/data/pencil-pages.json'));
const assetMap = new Map();
const projectData=JSON.parse(fs.readFileSync('src/data/illustrative-projects.json'));
const catalogPhotos={};
const A = n => Object.fromEntries((n.attrs || []).map(a => [a.name, a.value]));
const set = (n, key, value) => { n.attrs ||= []; const a = n.attrs.find(a => a.name === key); if (a) a.value=String(value); else n.attrs.push({name:key,value:String(value)}); };
const text = n => (n.childNodes || []).map(c => c.nodeName === '#text' ? c.value : text(c)).join(' ').replace(/\s+/g,' ').trim();
const walk = (n, fn) => { fn(n); for(const c of [...n.childNodes || []]) walk(c,fn); };
const find = (n, id) => {let found;walk(n,x=>{if(A(x)['data-pencil-id']===id)found=x;});return found;};
const fragment = html => { const d = parse(`<body>${html}</body>`);let b;walk(d,n=>{if(n.tagName==='body')b=n;});return b.childNodes; };
const routes = new Map([
 ['Proyectos','/proyectos/'],['Explorar proyectos','/proyectos/'],['Tecnología','/tecnologia/'],['Cómo ganamos','/como-ganamos/'],['Empezar','/empezar/'],['Comprar DRACMA','/comprar/'],['Comprar dracma','/comprar/'],['dracma Quant','/quant/'],['Comisiones por operación','/comisiones/'],['Comercialización de proyectos','/comercializacion/'],['Ingresos recurrentes','/ingresos-recurrentes/'],['Crédito y lending','/credito/'],['Remesas','/remesas/'],['Tesorería','/tesoreria/'],['Multisig Safe','/multisig/'],['Cómo funciona la multisig','/multisig/'],['Volver al inicio','/'],['Términos','/legal/#terminos'],['Privacidad','/legal/#privacidad'],['Aviso de riesgos','/legal/#riesgos'],['GitHub ↗','https://github.com/Alain-Colombia-Arbitrage-Mev/DracmaWeb1'],['Avalanche','/tecnologia/#avalanche'],['Agente dracma','/empezar/?interes=Explorar%20primero']
]);
function linkFor(t){
 const clean=t.replace(/[→↗↓]/g,'').trim();
 if(routes.has(t)||routes.has(clean))return routes.get(t)||routes.get(clean);
 if(/^(?:Empezar|Déjanos|Quiero|Solicitar|Solicita|Contactar|Hablar|Recibir|Conocer|Participar|Postular|Presentar|Lanzar|Aplicar|Activa|Activar|Reservar|Pedir|Unirme|Enviar con dracma|Abrir mi)/i.test(clean)&&t.length<90)return '/empezar/';
 if(/^(?:Explorar|Ver|Consultar).*(?:proyectos|catálogo)/i.test(t))return '/proyectos/';
 if(/^(?:Ver|Consultar).*(?:proyecto|Atacama)/i.test(t))return '/proyectos/atacama-ii/';
 if(/^(?:Ver|Cómo).*(?:condiciones|ganamos|comisión|comisiones)/i.test(t))return '/comisiones/';
 if(/comercializaci[oó]n/i.test(t)&&t.length<50)return '/comercializacion/';
 if(/^(?:Ver|Conocer).*(?:terminal|Quant)/i.test(t))return '/quant/';
 if(/^(?:Ver|Consultar).*(?:blockchain|Snowtrace|contratos|auditoría)/i.test(t))return '/tecnologia/#estado-contratos';
 if(/GitHub/i.test(t)&&t.length<50)return 'https://github.com/Alain-Colombia-Arbitrage-Mev/DracmaWeb1';
 if(/Preparar mi compra/i.test(t))return '#checkout';
 if(/^(?:Ver|Consultar) tesorería/.test(t))return '/tesoreria/';
 if(/^(?:Ver|Consultar) remesas/.test(t))return '/remesas/';
 if(/Calcular otro envío/i.test(t))return '#simulador-remesas';
 return undefined;
}
fs.mkdirSync('public/design-assets',{recursive:true});
for(const page of pages){
 for(const id of [page.id,page.mobile].filter(Boolean)){
  const doc=parse(fs.readFileSync(path.join(source,id+'.html'),'utf8'));
  const root=find(doc,id);if(!root)throw Error('Missing '+id);
  root.childNodes=root.childNodes.filter(n=>!/^Navbar|^footer|^Footer/i.test(A(n)['data-pencil-name']||''));
  set(root,'class','pencil-page flex w-full flex-col');set(root,'data-source-node',id);
  if(page.slug==='empezar'){
   walk(root,n=>{const name=A(n)['data-pencil-name']||'';if(name==='¿Qué te gustaría hacer primero?'){};if(/bg-\[#FFFFFF\]/.test(A(n).class||'')&&/¿Qué te gustaría hacer primero\?/.test(text(n))&&!((n.childNodes||[]).some(c=>/bg-\[#FFFFFF\]/.test(A(c).class||'')&&/¿Qué te gustaría hacer primero\?/.test(text(c))))){set(n,'data-onboarding','');set(n,'class','onboarding-mount');n.childNodes=[];}});
  }
  if(page.slug==='comprar')walk(root,n=>{if(A(n)['data-pencil-name']==='Formulario · Compra con NOWPayments'){set(n,'class','checkout-mount');set(n,'data-checkout','');set(n,'id',id===page.id?'checkout-desktop':'checkout-mobile');n.childNodes=[];}});
  if(page.slug==='proyectos'){
   const search=find(root,'s1hFe');if(search){search.tagName='label';search.nodeName='label';search.childNodes=fragment('<input class="catalog-search" type="search" placeholder="Buscar proyecto" aria-label="Buscar proyecto" data-project-search>');}
   const sectors=find(root,'a3BR9');if(sectors){sectors.tagName='select';sectors.nodeName='select';set(sectors,'aria-label','Sector del proyecto');set(sectors,'data-project-sector','');sectors.childNodes=fragment('<option value="">Todos los sectores</option>'+[...new Set(projectData.map(p=>p.sector))].map(t=>`<option>${t}</option>`).join(''));}
   const list=find(root,'r6UCt');if(list){const cards=(list.childNodes||[]).filter(n=>n.tagName).flatMap(row=>(row.childNodes||[]).filter(n=>n.tagName));list.childNodes=cards;set(list,'class','catalog-grid grid w-full gap-6');for(const card of cards){set(card,'data-project-card','');set(card,'class',A(card).class.replace(/h-\[[^\]]+\]/g,'h-full'));}}
   for(const [id,status] of [['dT8jI',''],['ieabD','Abierto'],['bBzfQ','Próximamente'],['Fen4C','Financiado']]){let n=find(root,id);if(n){let target=n.parentNode;target.tagName='button';target.nodeName='button';set(target,'type','button');set(target,'data-project-status',status);set(target,'aria-pressed',status?'false':'true');}}
  }
  let firstHeading=false;
  async function transform(n){
   if(!n.tagName)return;
   const attrs=A(n), name=attrs['data-pencil-name']||'';
   let cls=attrs.class||'';
   for(const match of cls.matchAll(/url\(['"]([^'"]+)['"]\)/g)){
    const url=match[1];let file=url.includes('Volumes/KINGSTON/')?'/'+url.slice(url.indexOf('Volumes/KINGSTON/')):path.resolve(source,url);
    if(/^https:\/\//.test(url)){const remote=new URL(url);if(remote.hostname!=='images.unsplash.com')throw Error('Unexpected remote image host');const response=await fetch(url);if(!response.ok)throw Error('Image HTTP '+response.status);file='/tmp/dracma-source-'+crypto.createHash('sha256').update(url).digest('hex').slice(0,12);fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));}
    if(!fs.existsSync(file))throw Error('Missing image '+file);
    let out=assetMap.get(file);if(!out){const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);out='/design-assets/'+hash+'.webp';await sharp(file).resize({width:1400,withoutEnlargement:true}).webp({quality:82}).toFile('public'+out);assetMap.set(file,out);}
    cls=cls.replace(url,out);
   }
   cls=cls.replace(/font-\[([^\]]+)\]/g,'[font-family:$1]');
   const fixed=cls.match(/(?:^| )w-\[([\d.]+)px\]/);if(fixed&&+fixed[1]>=1000){cls=cls.replace(fixed[0],` canvas-container max-w-[${fixed[1]}px]`);set(n,'data-container','');}
   if(fixed&&+fixed[1]>=220&&+fixed[1]<1000)set(n,'data-adaptive-width',fixed[1]);
   const pad=cls.match(/(?:^| )p-\[([^\]]+)\]/)?.[1]?.split('_').map(v=>parseFloat(v));if(pad&&((pad.length===2&&pad[1]>40)||(pad.length===4&&(pad[1]>40||pad[3]>40))))set(n,'data-wide-padding','');
   if(/Portada · Proyectos reales/.test(name))cls+=' canvas-home-hero';
   const size=cls.match(/text-\[([\d.]+)px\]/);
   if(size&&+size[1]>=36&&text(n).length>12){if(!firstHeading){n.tagName='h1';firstHeading=true;}else n.tagName='h2';n.nodeName=n.tagName;set(n,'data-display-heading','');}
   const children=(n.childNodes||[]).filter(c=>c.tagName);
   if(/(?:^| )(?:relative|absolute)(?: |$)/.test(cls)){
    const absolute=children.filter(c=>/(?:^| )absolute(?: |$)/.test(A(c).class||''));
    const sourceWidth=Number((attrs.class||'').match(/w-\[([\d.]+)px\]/)?.[1]||0);
    const large=absolute.filter(c=>Number((A(c).class||'').match(/w-\[([\d.]+)px\]/)?.[1]||0)>=180);
    const far=absolute.some(c=>Number((A(c).class||'').match(/left-\[([\d.]+)px\]/)?.[1]||0)>180);
    if((sourceWidth>=220&&absolute.length)||large.length||far){
     if(!text(n)){set(n,'data-mobile-decoration','');}
     const chart=children.some(c=>c.tagName==='svg'&&Number((A(c).class||'').match(/w-\[([\d.]+)px\]/)?.[1]||0)>200);
     if(chart)set(n,'data-mobile-scroll','');
     else{const icon=absolute.some(c=>{const w=Number((A(c).class||'').match(/w-\[([\d.]+)px\]/)?.[1]||0);return w>0&&w<=64});set(n,'data-mobile-layout',(large.length===1&&icon&&absolute.length<=3)||absolute.every(c=>!(c.childNodes||[]).some(x=>x.tagName))?'row':'stack');}
    }
   }
   if(/flex-row/.test(cls)&&children.length>=2&&!/Navbar/.test(name)){
    const substantial=children.filter(c=>/w-\[(?:[3-9]\d\d|1\d\d\d)px\]|\[flex:1_1_0\]/.test(A(c).class||'')&&(c.childNodes||[]).some(x=>x.tagName&&x.tagName!=='svg'));
    if(substantial.length>=2)set(n,'data-responsive-row',children.length>=3?'grid':'stack');
   }
   const content=text(n);
   if(/^Águila|^Aguila/.test(name)&&!['svg','path'].includes(n.tagName)){
    n.tagName='img';n.nodeName='img';set(n,'src','/brand/dracma-eagle.webp');set(n,'alt','');set(n,'class',cls.replace(/relative|absolute|left-\S+|top-\S+/g,'')+' object-contain');n.childNodes=[];return;
   }
   set(n,'class',cls);
   if(content==='Cotización en vivo'){n.childNodes=fragment('Simulación · tipo de cambio de ejemplo');}
   const href=content.length<=90?linkFor(content):undefined;
   const isLeaf=children.length===0||children.every(c=>c.tagName==='svg');
   const isAction=/rounded-/.test(cls)&&/h-\[(?:44|46|48|50|52|54)px\]/.test(cls)&&content.length<100;
   if(href&&(isLeaf||isAction)&&!n._inLink&&n.tagName!=='select'&&!n.tagName.startsWith('h')){n.tagName='a';n.nodeName='a';set(n,'href',href==='#checkout'?(id===page.id?'#checkout-desktop':'#checkout-mobile'):href);for(const c of n.childNodes||[])walk(c,x=>{x._inLink=true});}
   for(const child of [...n.childNodes||[]])await transform(child);
  }
  await transform(root);
  // Keep an icon beside a title and its description as one readable group.
  walk(root,n=>{if(A(n)['data-mobile-layout']!=='row')return;
   const c=(n.childNodes||[]).filter(c=>c.tagName),cls=c.map(c=>A(c).class||'');
   if(c.length===3&&cls.every(s=>/absolute/.test(s))&&Number(cls[0].match(/w-\[([\d.]+)px\]/)?.[1]||999)<=64){
    const x=cls.map(s=>s.match(/left-\[([\d.]+)px\]/)?.[1]);
    if(x[1]&&x[1]===x[2])set(n,'data-mobile-layout','icon');
   }
  });
  // Vertically arranged text is a stack even when every exported child is a leaf.
  walk(root,n=>{if(A(n)['data-mobile-layout']!=='row')return;
   const children=(n.childNodes||[]).filter(c=>c.tagName&&/absolute/.test(A(c).class||''));
   if(children.length<2||!children.every(c=>!(c.childNodes||[]).some(x=>x.tagName)))return;
   const coords=axis=>children.map(c=>Number((A(c).class||'').match(new RegExp(axis+'-\\[([\\d.]+)px\\]'))?.[1]||0));
   const xs=coords('left'),ys=coords('top');
   if(Math.max(...ys)-Math.min(...ys)>24&&Math.max(...xs)-Math.min(...xs)<80)set(n,'data-mobile-layout','stack');
  });
  // Percentages must survive narrower cards instead of becoming full-width bars.
  walk(root,n=>{if(/· Capital recaudado$/.test(A(n)['data-pencil-name']||'')){
   const percent=text(n.parentNode?.parentNode).match(/(\d+(?:[.,]\d+)?)\s*%/);
   if(percent)set(n,'style',`--progress:${Number(percent[1].replace(',','.'))}%`);
  }});
  if(page.slug==='proyectos'){const hero=find(root,'BvVfz');if(hero)set(hero,'href','#catalogo');const catalog=find(root,'nllSM');if(catalog)set(catalog,'id','catalogo');}

  walk(root,n=>{if(n.tagName==='a'&&/^(?:Ver|Consultar) proyecto/.test(text(n))){let ancestor=n.parentNode;while(ancestor&&ancestor!==root){const content=text(ancestor);const matches=projectData.filter(p=>content.toLocaleLowerCase('es').includes(p.name.toLocaleLowerCase('es')));if(matches.length===1){set(n,'href','/proyectos/'+matches[0].slug+'/');break;}ancestor=ancestor.parentNode;}}});
  if(page.slug==='proyectos')walk(root,n=>{if(A(n)['data-project-card']!==undefined){const content=text(n);const p=projectData.find(p=>content.toLocaleLowerCase('es').includes(p.name.toLocaleLowerCase('es')));if(p){set(n,'data-project-name',p.name);set(n,'data-project-sector-value',p.sector);set(n,'data-project-status-value',p.status);walk(n,c=>{if(c.tagName==='a')set(c,'href','/proyectos/'+p.slug+'/');const url=(A(c).class||'').match(/url\('([^']+)'\)/);if(url)catalogPhotos[p.slug]=url[1];});}}});
  if(page.slug==='credito'){
   const sliders=[['HJ1k8','lending-amount',100,50000,100,5000,'Monto que prestas'],['bvStJ','lending-months',1,36,1,12,'Plazo del préstamo en meses'],['B92xtM','credit-amount',100,20000,100,2000,'Monto de crédito usado'],['p4gnLK','credit-months',1,36,1,6,'Meses para pagar el crédito']];
   for(const [id,key,min,max,step,value,label] of sliders){const n=find(root,id);if(n){n.tagName='input';n.nodeName='input';for(const [k,v] of Object.entries({type:'range',min,max,step,value,'aria-label':label,'data-credit-field':key}))set(n,k,v);set(n,'class','w-full cursor-pointer accent-[#E6FF28]');n.childNodes=[];}}
   const outputs={MZBTR:'lending-amount',qQpXP:'lending-months',EoUG3:'deposit',UhwLM:'deposit-fee',QfYtk:'net-lent',S0xHZk:'lending-rate',F9vsR:'destination',lmmKY:'interest',eO9sN:'lending-note',yrYY4:'credit-amount',LwRzg:'credit-months',tDwy5:'principal',vM07v:'payment',mURVb:'total',x2lUzz:'credit-interest',Rc35Q:'credit-note'};
   for(const [id,key] of Object.entries(outputs)){const n=find(root,id);if(n)set(n,'data-credit-output',key);}
   for(const [id,pool] of [['ga7no','card'],['y6nH9b','remittance']]){const n=find(root,id);if(n){n.tagName='button';n.nodeName='button';set(n,'type','button');set(n,'data-lending-pool',pool);set(n,'aria-pressed',pool==='card');}}
  }
  if(page.slug==='remesas'){
   for(const field of ['GRddo']){let n=find(root,field);if(n){n.tagName='input';n.nodeName='input';set(n,'type','number');set(n,'min','1');set(n,'max','1000000');set(n,'value','300');set(n,'aria-label','Importe a enviar en USD');set(n,'data-remittance-amount','');set(n,'class',(A(n).class||'')+' w-full bg-transparent outline-none');n.childNodes=[];}}
   const values={'O486cZ':'fee-label','L2Mr7':'fee','AcdYK':'rate','fEwmT':'received','sIf44':'net'};
   for(const [id,key] of Object.entries(values)){const n=find(root,id);if(n)set(n,'data-remittance-output',key);}
   walk(root,n=>{if(A(n)['data-pencil-name']==='button'){const t=text(n);const index=['Colombia','EE. UU.','Brasil','Asia','Otros'].findIndex(v=>t.includes(v));if(index>=0){n.tagName='button';n.nodeName='button';set(n,'type','button');set(n,'data-remittance-destination',index);}}});
   const amount=find(root,'GRddo');let parent=amount;for(let i=0;i<4&&parent;i++,parent=parent.parentNode){if(A(parent).class?.includes('bg-')){set(parent,'id','simulador-remesas');break;}}
  }
  walk(root,n=>{const t=text(n);if(n.tagName==='h2'&&t.includes('TODO CORRE EN AVALANCHE'))set(n,'id','avalanche');if(n.tagName==='h2'&&t.includes('CÓDIGO ABIERTO'))set(n,'id','estado-contratos');});

  normalizePencilFaq(root);
  clarifyProjectPublication(root,page.slug);
  normalizeProjectCards(root,page.slug,projectData);
  improveDebitCards(root,page.slug);
  const wrapper={nodeName:'div',tagName:'div',attrs:[],childNodes:[root],namespaceURI:'http://www.w3.org/1999/xhtml'};
  fs.writeFileSync(`src/designs/${id}.html`,serialize(wrapper).replace(/>\s+</g,'><').replace(/\n\s+/g,' '));
 }
}
fs.writeFileSync('src/data/pencil-assets.json',JSON.stringify([...assetMap].map(([source,file])=>({source,file})),null,2)+'\n');
fs.writeFileSync('src/data/pencil-projects.json',JSON.stringify(projectData.map(p=>({...p,photo:catalogPhotos[p.slug]})),null,2)+'\n');
console.log('Imported',pages.length,'pages and',assetMap.size,'assets');
