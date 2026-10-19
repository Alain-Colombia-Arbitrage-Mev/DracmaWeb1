import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parse } from 'parse5';
import { SITE_URL, isIndexablePath } from '../src/config/site.mjs';

const walk = (node, visit) => { visit(node); for (const child of node.childNodes || []) walk(child, visit); };
const attrs = node => Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join(' ').replace(/\s+/g, ' ').trim();
const files = dir => fs.readdirSync(dir, {withFileTypes:true}).filter(f => !f.name.startsWith('.')).flatMap(f => f.isDirectory() ? files(path.join(dir,f.name)) : [path.join(dir,f.name)]);
const pages = new Map();
const errors = [];
const resources = new Set();
const fail = message => errors.push(message);
const fileFor = pathname => {
  const target = path.join('dist', decodeURIComponent(pathname));
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  const html = target.replace(/\/$/, '') + '.html';
  return fs.existsSync(html) ? html : path.join(target, 'index.html');
};
for (const file of files('dist').filter(f => f.endsWith('.html'))) {
  const route = file === 'dist/404.html' ? '/404/' : '/' + file.slice(5).replace(/index\.html$/, '');
  const doc = parse(fs.readFileSync(file, 'utf8'));
  const nodes = []; const ids = new Set();
  walk(doc, node => { nodes.push(node); if (attrs(node).id) ids.add(attrs(node).id); });
  const meta = name => nodes.filter(n => n.tagName === 'meta' && (attrs(n).name === name || attrs(n).property === name)).map(n => attrs(n).content);
  const canonical = nodes.filter(n => n.tagName === 'link' && attrs(n).rel === 'canonical').map(n => attrs(n).href);
  const title = nodes.filter(n => n.tagName === 'title').map(text);
  const description = meta('description');
  const indexable = isIndexablePath(route);
  if (title.length !== 1 || !title[0].trim()) fail(`${route}: missing or repeated title`);
  if (description.length !== 1 || !description[0]?.trim()) fail(`${route}: missing or repeated description`);
  if (indexable && (description[0]?.length < 70 || description[0]?.length > 210)) fail(`${route}: description length ${description[0]?.length}`);
  if (route !== '/404/' && (canonical.length !== 1 || canonical[0] !== SITE_URL + route)) fail(`${route}: incorrect canonical`);
  if (route === '/404/' && canonical.length) fail('404 page must not canonicalize to a valid page');
  if (meta('robots')[0] !== (indexable ? 'index, follow' : 'noindex, follow')) fail(`${route}: incorrect indexing policy`);
  for (const name of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (meta(name).length !== 1 || !meta(name)[0]) fail(`${route}: missing ${name}`);
  }
  if (meta('og:description')[0] !== description[0] || meta('twitter:description')[0] !== description[0]) fail(`${route}: inconsistent descriptions`);
  if (meta('og:url')[0] !== SITE_URL + route) fail(`${route}: incorrect social URL`);
  pages.set(file, {route, doc, nodes, ids, indexable, title:title[0], description:description[0]});
}
const indexable = [...pages.values()].filter(p => p.indexable);
for (const key of ['title', 'description']) {
  const groups = Object.groupBy(indexable, p => p[key]);
  for (const group of Object.values(groups)) if (group.length > 1) fail(`Duplicate ${key}: ${group.map(p => p.route).join(', ')}`);
}
const reference = (value, page, checkFragment=false) => {
  if (!value || /^(?:data:|mailto:|tel:|javascript:)/.test(value) || value === '#') return;
  const url = new URL(value, SITE_URL + page.route);
  if (url.origin !== SITE_URL || url.pathname.startsWith('/api/')) return;
  const file = fileFor(url.pathname);
  if (!fs.existsSync(file)) { fail(`${page.route}: missing resource ${url.pathname}`); return; }
  if (file !== 'dist/404.html') resources.add(url.pathname);
  if (checkFragment && url.hash && pages.has(file) && !pages.get(file).ids.has(decodeURIComponent(url.hash.slice(1)))) fail(`${page.route}: missing anchor ${url.pathname}${url.hash}`);
};
for (const page of pages.values()) for (const node of page.nodes) {
  const a = attrs(node);
  if (a.href) reference(a.href, page, node.tagName === 'a');
  if (a.src) reference(a.src, page);
  if (a.srcset) for (const candidate of a.srcset.split(',')) reference(candidate.trim().split(/\s+/)[0], page);
  if (a.property === 'og:image' || a.name === 'twitter:image') reference(a.content, page);
  for (const match of (a.class || '').matchAll(/url\(['"]([^'"]+)['"]\)/g)) reference(match[1], page);
  if (a.rel === 'canonical' || a.hreflang || a.property === 'og:url' || a.property === 'og:image') {
    const value = a.href || a.content;
    if (value && new URL(value).origin !== SITE_URL) fail(`${page.route}: SEO reference on another origin: ${value}`);
    if (a.hreflang && !isIndexablePath(new URL(value).pathname)) fail(`${page.route}: alternate language points to a noindex page`);
  }
  if (node.tagName === 'script' && a.type === 'application/ld+json') {
    try { JSON.parse(text(node)); } catch { fail(`${page.route}: invalid structured data`); }
  }
}
const sitemapIndex = fs.readFileSync('dist/sitemap-index.xml','utf8');
const sitemap = fs.readFileSync('dist/sitemap-0.xml','utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!sitemapIndex.includes(`${SITE_URL}/sitemap-0.xml`)) fail('Sitemap index points at another site');
if (!fs.readFileSync('dist/robots.txt','utf8').includes(`Sitemap: ${SITE_URL}/sitemap-index.xml`)) fail('robots.txt points at another sitemap');
assert.deepEqual(urls.sort(), indexable.map(p => SITE_URL + p.route).sort(), 'Sitemap must contain exactly the canonical indexable pages');
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
assert.ok(fs.existsSync('dist/404.html'), 'Cloudflare requires a top-level 404.html to avoid SPA fallback');

let liveChecks = 0;
if (process.argv.includes('--live')) {
  const queue = [...new Set([...resources, ...[...pages.values()].filter(p => p.route !== '/404/').map(p => p.route), '/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml'])];
  await Promise.all(Array.from({length:6}, async () => {
    while (queue.length) {
      const route = queue.shift();
      try {
        const response = await fetch(SITE_URL + route, {signal:AbortSignal.timeout(15000),redirect:'manual'});
        if (response.status !== 200) fail(`Live ${route}: HTTP ${response.status}`);
        const file = fileFor(route);
        if (pages.has(file)) {
          const html = await response.text();
          if (html !== fs.readFileSync(file,'utf8')) fail(`Live ${route}: deployed HTML differs from the validated build`);
          if (pages.get(file).indexable && /noindex|none/i.test(response.headers.get('x-robots-tag') || '')) fail(`Live ${route}: HTTP header prevents indexing`);
        } else if (/\.(?:xml|txt)$/.test(route)) {
          if (await response.text() !== fs.readFileSync(file,'utf8')) fail(`Live ${route}: deployed discovery file differs from the validated build`);
        } else if (/\.(?:png|webp|ico|svg)$/.test(route) && !response.headers.get('content-type')?.startsWith('image/')) fail(`Live ${route}: image returned a different content type`);
        liveChecks++;
      } catch (error) { fail(`Live ${route}: ${error.message}`); }
    }
  }));
  for (const line of fs.readFileSync('public/_redirects','utf8').split('\n').filter(Boolean)) {
    const [from, to, status] = line.split(/\s+/);
    const response = await fetch(SITE_URL + from, {redirect:'manual',signal:AbortSignal.timeout(15000)});
    if (response.status !== Number(status) || new URL(response.headers.get('location') || '/',SITE_URL).href !== SITE_URL + to) fail(`Live redirect ${from}: incorrect status or destination`);
    liveChecks++;
  }
  for (const route of ['/ruta-inexistente-auditoria-seo/', '/proyectos/proyecto-inexistente-auditoria/']) {
    const response = await fetch(SITE_URL + route, {signal:AbortSignal.timeout(15000)});
    if (response.status !== 404 || !(await response.text()).includes('NO ENCONTRAMOS ESTA PÁGINA')) fail(`Live ${route}: expected the genuine 404 page`);
    liveChecks++;
  }
}
const report = {site:SITE_URL,htmlPages:pages.size,indexablePages:indexable.length,noindexPages:pages.size-indexable.length,sitemapURLs:urls.length,duplicateTitles:errors.filter(e=>e.startsWith('Duplicate title:')).length,duplicateDescriptions:errors.filter(e=>e.startsWith('Duplicate description:')).length,missingInternalResources:errors.filter(e=>/missing resource|missing anchor/.test(e)).length,liveChecks,errors};
const outputIndex = process.argv.indexOf('--report');
if (outputIndex >= 0) fs.writeFileSync(process.argv[outputIndex+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert.deepEqual(errors, [], 'SEO audit failed');
