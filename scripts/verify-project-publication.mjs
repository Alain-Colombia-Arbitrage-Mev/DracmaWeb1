import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'parse5';

const attrs = n => Object.fromEntries((n.attrs || []).map(a => [a.name,a.value]));
const text = n => n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join(' ').replace(/\s+/g,' ').trim();
const walk = (n,fn) => {fn(n);for(const c of n.childNodes||[])walk(c,fn);};
const projects=JSON.parse(fs.readFileSync('src/data/pencil-projects.json'));
const routes=['/','/proyectos/','/tecnologia/',...projects.map(p=>`/proyectos/${p.slug}/`)];
let fundingStates=0;
for(const route of routes) {
  const doc=parse(fs.readFileSync('dist'+route+'index.html','utf8'));
  let notice=false;
  const visible=[];
  walk(doc,n=>{
    const a=attrs(n);
    if(a['data-project-disclosure']!==undefined)notice=true;
    if(n.nodeName==='#text'&&!['script','style','title'].includes(n.parentNode?.tagName))visible.push(n.value);
    if(a['data-project-verification']!==undefined||a['data-project-publication-status']!==undefined) {
      const value=text(n);
      assert.match(value,/Sin datos verificados/,`${route}: missing fundraising verification status`);
      assert.match(value,/irección verificada no publicada/,`${route}: missing contract publication status`);
      assert.doesNotMatch(value,/US\$|\d\s*%/,`${route}: unverified fundraising value was rendered`);
      fundingStates++;
    }
    assert.equal(a['data-project-status'],undefined,`${route}: obsolete live-round filter was restored`);
  });
  assert.ok(notice,`${route}: project publication disclosure is missing`);
  assert.doesNotMatch(visible.join(' '),/Soft cap alcanzado|Permisos ambientales aprobados|Participar en este proyecto|Aporte de participantes|RONDA SERIE A/,`${route}: unverified project activity was restored`);
  if(route==='/proyectos/atacama-ii/')assert.doesNotMatch(visible.join(' '),/0x[0-9a-f]{4}…|US\$1\.620\.000|67,5\s*%/, 'Illustrative transaction history or fundraising progress was restored');
  if(route==='/proyectos/')assert.doesNotMatch(visible.join(' '),/PROYECTOS REALES|Mínimo de captación alcanzado|CAPITAL RECAUDADO/, 'Catalog presents conceptual projects or fundraising as real activity');
}
assert.equal(fundingStates,28,'Missing publication states in project cards or details');
for(const lang of['preventa','en','fr','hi','ru','zh','ar']) {
  const doc=parse(fs.readFileSync(`dist/${lang}/index.html`,'utf8'));
  let count=0;
  walk(doc,n=>{if(attrs(n)['data-project-reference-card']!==undefined){count++;assert.doesNotMatch(text(n),/\d[.,\d]*\s*%|\d[.,\d]*\s*\$DRACMA|Financiado Exitosamente|Successfully Funded/,`${lang}: legacy example card shows financing metrics`);}});
  assert.equal(count,3,`${lang}: missing legacy reference cards`);
}
console.log(`Verified publication disclosure on ${routes.length} pages, ${fundingStates} pending-data states and 21 legacy reference cards.`);
