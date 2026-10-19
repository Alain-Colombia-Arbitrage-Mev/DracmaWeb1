import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parse} from 'parse5';
const walk=(node,visit)=>{visit(node);for(const child of node.childNodes||[])walk(child,visit);};
const files=directory=>fs.readdirSync(directory,{withFileTypes:true}).filter(x=>!x.name.startsWith('._')).flatMap(x=>x.isDirectory()?files(path.join(directory,x.name)):[path.join(directory,x.name)]);
const htmlFiles=files('dist').filter(x=>x.endsWith('index.html'));
const errors=[];const rendered=new Set();let references=0;
for(const file of htmlFiles){
 const doc=parse(fs.readFileSync(file,'utf8'));
 walk(doc,node=>{
  const attrs=Object.fromEntries((node.attrs||[]).map(x=>[x.name,x.value]));
  if(attrs['data-source-node'])rendered.add(attrs['data-source-node']);
  for(const name of ['src','href']){
   const value=attrs[name];if(!value||!value.startsWith('/')||value.startsWith('//'))continue;
   const url=new URL(value,'https://dracmaweb1.pages.dev');if(url.pathname.startsWith('/api/'))continue;
   const target='dist'+decodeURI(url.pathname);
   if(!(fs.existsSync(target)&&fs.statSync(target).isFile())&&!fs.existsSync(path.join(target,'index.html')))errors.push(`${file}: missing ${value}`);
   references++;
  }
  if(node.tagName==='a'&&node.childNodes?.some(x=>x.tagName==='a'))errors.push(`${file}: nested link`);
 });
}
const pages=JSON.parse(fs.readFileSync('src/data/pencil-pages.json'));
for(const page of pages)for(const id of [page.id,page.mobile].filter(Boolean))if(!rendered.has(id))errors.push('Missing Pencil screen '+id);
const projects=JSON.parse(fs.readFileSync('src/data/pencil-projects.json'));
assert.equal(projects.length,12);
for(const project of projects){assert.ok(project.photo,`Missing project photograph: ${project.slug}`);assert.ok(fs.existsSync('dist'+project.photo),`Missing photo asset: ${project.photo}`);assert.ok(fs.existsSync(`dist/proyectos/${project.slug}/index.html`),`Missing detail: ${project.slug}`);}
assert.deepEqual(errors,[]);
console.log(`Verified ${htmlFiles.length} routes, ${rendered.size} Pencil screens, ${references} local references and ${projects.length} project details.`);
