import fs from 'node:fs';
import {parseFragment,serialize} from 'parse5';
import {pathToFileURL} from 'node:url';

const attrs=n=>Object.fromEntries((n.attrs||[]).map(a=>[a.name,a.value]));
const walk=(n,fn)=>{fn(n);for(const c of n.childNodes||[])walk(c,fn);};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decimal=value=>esc(String(value).replace('.',','));
const date=value=>{const[y,m,d]=value.slice(0,10).split('-');return `${d}/${m}/${y}`;};
const put=(n,name,value)=>{const a=n.attrs.find(a=>a.name===name);if(a)a.value=value;else n.attrs.push({name,value});};
const content=(n,html)=>{n.childNodes=parseFragment(html).childNodes;for(const c of n.childNodes)c.parentNode=n;};

export function renderQuantTrackRecord(d){
  if(d.sourceUrl!=='https://confirmedtrades.com/account/00807_tng-gold-ea-hfm')throw Error('Unexpected Quant source');
  const primary=[
    ['Crecimiento acumulado',`+${decimal(d.gainPercent)} %`,'Retorno ponderado por tiempo · TWR','gain'],
    ['Drawdown máximo',`${decimal(d.drawdownEquityPercent)} %`,'Sobre equity · incluye posiciones abiertas','risk'],
    ['Factor de beneficio',decimal(d.profitFactor),'Ganancia bruta / pérdida bruta',''],
    ['Operaciones ganadoras',`${decimal(d.winRatePercent)} %`,'Porcentaje de operaciones cerradas',''],
    ['Operaciones cerradas',esc(d.totalTrades),'Muestra del historial publicado',''],
    ['Promedio mensual',`+${decimal(d.averageMonthlyPercent)} %`,'Media aritmética histórica · no proyección','']
  ];
  const financial=[['Balance',d.balanceUsd],['Equity',d.equityUsd],['Beneficio cerrado',d.closedProfitUsd],['Depósitos',d.depositsUsd],['Retiros',d.withdrawalsUsd],['P/L flotante',d.floatingProfitUsd]];
  return `<div class="quant-record-head"><div><p class="quant-record-kicker">CUENTA DE REFERENCIA · ${esc(d.source)}</p><h3>Historial de referencia</h3><p>Estadísticas históricas de una cuenta externa.</p></div></div>
    <div class="quant-record-meta"><span>${esc(d.accountType)} · ${esc(d.platform)} · ${esc(d.currency)}</span><span>${esc(d.symbol)}</span><span>Consulta: <time datetime="${esc(d.observedAt)}">${date(d.observedAt)}</time></span><span>Captura de datos · sin sincronización automática</span></div>
    <dl class="quant-record-metrics">${primary.map(([label,value,hint,tone])=>`<div class="quant-record-metric ${tone?`quant-record-metric--${tone}`:''}"><dt>${label}</dt><dd>${value}<span>${hint}</span></dd></div>`).join('')}</dl>
    <div class="quant-record-details"><section aria-labelledby="quant-capital"><h4 id="quant-capital">Capital y resultado · USD</h4><dl>${financial.map(([label,value])=>`<div><dt>${label}</dt><dd>US$ ${decimal(value)}</dd></div>`).join('')}</dl></section><section aria-labelledby="quant-context"><h4 id="quant-context">Contexto del historial</h4><dl><div><dt>Primera operación</dt><dd>${date(d.firstTrade)}</dd></div><div><dt>Última operación cerrada</dt><dd>${date(d.lastTrade)}</dd></div><div><dt>Drawdown sobre balance</dt><dd>${decimal(d.drawdownBalancePercent)} %</dd></div><div><dt>Sharpe</dt><dd>${decimal(d.sharpeRatio)}</dd></div><div><dt>Duración media</dt><dd>${esc(d.averageTradeLength)}</dd></div><div><dt>Score de ConfirmedTrades</dt><dd>${esc(d.confirmedTradesScore)} / 100</dd></div></dl></section></div>
    <div class="quant-record-foot"><p>Las cifras corresponden a una cuenta externa de referencia y a la fecha de consulta. El promedio mensual no es una rentabilidad prometida. Los resultados pasados no garantizan resultados futuros.</p></div>`;
}

export function normalizeQuantTrackRecord(root,slug,d){
  if(slug!=='quant')return;
  const nodes=new Map();walk(root,n=>{const id=attrs(n)['data-pencil-id'];if(id)nodes.set(id,n);});
  const terminal=nodes.get('bRBE4');if(!terminal)throw Error('Missing Quant terminal');
  terminal.tagName=terminal.nodeName='article';
  terminal.attrs=[{name:'data-pencil-id',value:'bRBE4'},{name:'data-pencil-name',value:'Quant · Historial publicado'},{name:'class',value:'quant-record'},{name:'data-quant-track-record',value:''},{name:'aria-label',value:'Historial de referencia de Quant'}];
  content(terminal,renderQuantTrackRecord(d));
  const labels={
    ECwK4:'RESULTADOS PUBLICADOS',
    shaqV:'ESTADÍSTICAS DEL HISTORIAL.',
    S7d6Y:`El EA opera en la cuenta MQL5 del cliente. La cuenta de referencia publica un drawdown máximo del ${decimal(d.drawdownEquityPercent)} %. La política del servicio establece un stop out del 40 %, con activación inicial y facturación mensual sobre utilidades.`,
    cT4ZB:`${decimal(d.drawdownEquityPercent)} %`,
    O0On3B:'Drawdown histórico publicado',
    d0vu0d:'Dato publicado por ConfirmedTrades para la cuenta de referencia. Puede aumentar con nuevas operaciones; no es un límite de pérdida.',
    f4tw6:`${decimal(d.drawdownEquityPercent)} % HISTÓRICO · 40 % POLÍTICA`,
    OBjAf:`El ${decimal(d.drawdownEquityPercent)} % corresponde al drawdown histórico publicado de la cuenta de referencia. El 40 % es el umbral de detención definido en las condiciones del servicio.`,
    pPYIC:'El trading implica riesgo y puedes perder todo tu capital. El EA opera en la cuenta MQL5 del cliente. El historial publicado corresponde a una cuenta de referencia y los resultados pasados no garantizan resultados futuros.'
  };
  for(const[id,label]of Object.entries(labels)){const n=nodes.get(id);if(!n)throw Error(`Missing Quant context ${id}`);content(n,label);}
  const section=nodes.get('kk8bX');put(section,'id','resultados-quant');put(section,'data-pencil-name','Quant · Resultados publicados');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const file='src/designs/O49VL.html';const root=parseFragment(fs.readFileSync(file,'utf8'));
  normalizeQuantTrackRecord(root,'quant',JSON.parse(fs.readFileSync('src/data/quant-track-record.json','utf8')));
  fs.writeFileSync(file,serialize(root).replace(/>\s+</g,'><').replace(/\n\s+/g,' '));
  console.log('Updated Quant from the dated ConfirmedTrades snapshot.');
}
