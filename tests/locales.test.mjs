import test from 'node:test';import assert from 'node:assert/strict';
import {LOCALES,basePath,localeFor,localePath,translateCopy} from '../src/i18n/locales.mjs';
import {THEME_BOOTSTRAP,resolveTheme} from '../src/lib/theme.mjs';import vm from 'node:vm';

test('language switching retains route, query, fragment and removes existing language prefixes',()=>{
 for(const locale of LOCALES){const path=localePath('/ar/comprar/?order_id=o_123#checkout',locale);assert.equal(path,(locale==='es'?'':`/${locale}`)+'/comprar/?order_id=o_123#checkout');}
 assert.equal(localeFor('/zh/proyectos/'),'zh');assert.equal(basePath('/it/'),'/');assert.equal(localeFor('/invalid/'),'es');
});
test('dynamic translations preserve amounts, addresses and whitespace without HTML interpolation',()=>{
 const d={'Consultado {0}':'Updated {0}','Wallet BSC: {0}':'BSC wallet: {0}','Hola':'Hello','Interés':'Interest'};
 assert.equal(translateCopy(' Consultado 12:45 ',d),' Updated 12:45 ');
 assert.equal(translateCopy('Wallet BSC: 0x123abc',d),'BSC wallet: 0x123abc');
 assert.equal(translateCopy('US$ 5,99',d),'US$ 5,99');assert.equal(translateCopy(' Hola ',d),' Hello ');
 assert.equal(translateCopy('01 Interés',d),'01 Interest');
});
test('dark default does not depend on a light OS preference and explicit light remains valid',()=>{
 assert.equal(resolveTheme(null,false),'dark');assert.equal(resolveTheme('light',true),'light');
 const root={dataset:{},style:{},classList:{toggle(){}}};vm.runInNewContext(THEME_BOOTSTRAP,{localStorage:{getItem:()=>null},document:{documentElement:root,querySelector:()=>null}});assert.equal(root.dataset.theme,'dark');
});
