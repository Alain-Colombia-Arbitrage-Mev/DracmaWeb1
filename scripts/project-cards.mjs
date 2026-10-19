import { parseFragment } from 'parse5';

const attrs = node => Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
const walk = (node, visit) => { visit(node); for (const child of node.childNodes || []) walk(child, visit); };
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const homeCards = new Map([['XJBSE','hub-bajio'],['nbnAJ','atacama-ii'],['Z5A5Q','credito-vecino']]);

// Use one card structure for the imported catalog and the homepage selection.
// Financial fixtures in the design data must never become rendered metrics.
export function normalizeProjectCards(root, slug, projects) {
  if (!['','proyectos'].includes(slug)) return;
  const cards = [];
  walk(root, node => {
    const a = attrs(node);
    if (a['data-project-card'] !== undefined || (slug === '' && homeCards.has(a['data-pencil-id']))) cards.push(node);
  });
  if (cards.length !== (slug === '' ? 3 : 12)) throw new Error(`Unexpected project card count for ${slug || 'home'}: ${cards.length}`);
  for (const card of cards) {
    const a = attrs(card);
    if (a['data-project-card-version'] === '2') continue;
    const project = projects.find(p => p.slug === homeCards.get(a['data-pencil-id']) || p.name === a['data-project-name']);
    if (!project) throw new Error(`Unknown project card: ${a['data-pencil-id']}`);
    let photo;
    walk(card, node => { photo ||= (attrs(node).class || '').match(/url\('([^']+)'\)/)?.[1]; });
    if (!photo?.startsWith('/design-assets/')) throw new Error(`Missing project photograph: ${project.slug}`);
    const titleId = `project-card-${slug ? 'catalog' : 'home'}-${project.slug}`;
    const html = `
      <figure class="project-card-media">
        <img src="${escape(photo)}" alt="Fotografía ilustrativa para ${escape(project.name)}" width="1120" height="700" loading="lazy" decoding="async">
        <figcaption>Foto ilustrativa</figcaption>
      </figure>
      <div class="project-card-body">
        <div class="project-card-meta"><span>${escape(project.flag)} ${escape(project.sector)} · ${escape(project.country)}</span><span class="project-card-kind">Concepto</span></div>
        <h3 id="${titleId}" class="project-card-title">${escape(project.name)}</h3>
        <p class="project-card-summary">${escape(project.summary)}</p>
        <div class="project-card-verification project-verification" data-project-verification>
          <span>Recaudación</span><strong>Sin datos verificados</strong>
          <p>Contrato del proyecto: dirección verificada no publicada.</p>
        </div>
        <a class="project-card-action" href="/proyectos/${escape(project.slug)}/" aria-label="Consultar ficha de ${escape(project.name)}">Consultar ficha <span aria-hidden="true">↗</span></a>
      </div>`;
    card.tagName = card.nodeName = 'article';
    card.attrs = [
      ...card.attrs.filter(a => ['data-pencil-id','data-pencil-name'].includes(a.name)),
      ...Object.entries({class:'project-card','data-project-card':'','data-project-card-version':'2','data-project-name':project.name,'data-project-sector-value':project.sector,'aria-labelledby':titleId}).map(([name,value]) => ({name,value})),
    ];
    card.childNodes = parseFragment(html).childNodes;
    for (const child of card.childNodes) child.parentNode = card;
  }
  const grid = cards[0].parentNode;
  if (!cards.every(card => card.parentNode === grid)) throw new Error('Project cards must share one grid');
  grid.attrs = grid.attrs.filter(a => !['class','data-responsive-row'].includes(a.name));
  grid.attrs.push({name:'class',value:'project-cards-grid'+(slug ? ' catalog-grid' : '')});
}
