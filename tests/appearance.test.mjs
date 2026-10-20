import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {initialCase,canvasAppearance} from '../src/lib/canvas-appearance.mjs';
import {resolveTheme,THEME_BOOTSTRAP} from '../src/lib/theme.mjs';
test('headings use sentence initials while retaining acronyms, currency and names',()=>{
 assert.equal(initialCase('CÓMO COBRA DRACMA. TU CUENTA MQL5 EN BSC.'),'Cómo cobra DRACMA. Tu cuenta MQL5 en BSC.');
 assert.equal(initialCase('US$5,99 AL MES. DESCONTABLE DE COMISIONES.'),'US$5,99 al mes. Descontable de comisiones.');
 assert.equal(initialCase('PARQUE SOLAR ATACAMA II'),'Parque Solar Atacama II');
 assert.equal(initialCase('dracma Quant'),'DRACMA Quant');
 assert.equal(initialCase('Orquesta IA'),'Orquesta IA');
});
test('canvas preserves links, paragraph copy, line breaks and printed card artwork',()=>{
 const html=canvasAppearance('<h2>EXPLORA PROYECTOS<br>Y SUS CONDICIONES.</h2><p>AVISO IMPORTANTE</p><a href="/quant/" class="text-[24px] font-bold">dracma Quant</a><div class="debit-card"><h3>TARJETA DRACMA</h3></div>');
 assert.match(html,/<h2>Explora proyectos<br>y sus condiciones\.<\/h2>/);assert.match(html,/<p>AVISO IMPORTANTE<\/p>/);assert.match(html,/href="\/quant\/"/);assert.match(html,/DRACMA Quant/);assert.match(html,/>TARJETA DRACMA<\/h3>/);
});
test('valid saved preference wins over the system; invalid values use the system',()=>{assert.equal(resolveTheme('light',true),'light');assert.equal(resolveTheme('dark',false),'dark');assert.equal(resolveTheme('invalid',false),'light');assert.equal(resolveTheme(null,true),'dark');});
test('prepaint initialization works even when local storage is blocked',()=>{const root={dataset:{},style:{},classList:{toggle(){}}};vm.runInNewContext(THEME_BOOTSTRAP,{localStorage:{getItem(){throw Error('blocked')}},matchMedia:()=>({matches:true}),document:{documentElement:root,querySelector:()=>null}});assert.equal(root.dataset.theme,'dark');assert.equal(root.style.colorScheme,'dark');});
const css=fs.readFileSync('src/styles/appearance.css','utf8');const dark=css.split(':root[data-theme="light"]')[0];const light=css.split(':root[data-theme="light"]')[1].split('body {')[0];
const rgb=h=>h.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);const l=h=>rgb(h).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);const contrast=(a,b)=>(Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05);
test('both palettes maintain body-text and action contrast',()=>{for(const[name,part]of[['dark',dark],['light',light]]){const tokens=Object.fromEntries([...part.matchAll(/--ui-([\w-]+):(#[0-9a-f]{6})/g)].map(x=>[x[1],x[2]]));for(const bg of ['bg','surface','raised','soft','brand','input'])for(const fg of ['text','muted','accent','link'])assert.ok(contrast(tokens[bg],tokens[fg])>=4.5,`${name}: ${fg} on ${bg}`);assert.ok(contrast(tokens.action,tokens['on-action'])>=4.5,`${name}: action`);}});
