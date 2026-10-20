import projects from '../data/pencil-projects.json' with {type:'json'};
import {basePath,localeFor,localePath,translateCopy} from '../i18n/locales.mjs';
import {dictionaries} from '../i18n/dictionaries.mjs';

const labels = {
  proyectos:'Proyectos', quant:'Quant', comisiones:'Comisiones',
  comercializacion:'Comercialización', credito:'Crédito y lending', remesas:'Remesas',
  tesoreria:'Tesorería', 'lanza-tu-proyecto':'Presentar un proyecto',
  'ingresos-recurrentes':'Ingresos recurrentes', tecnologia:'Tecnología',
  multisig:'Multisig Safe', 'como-ganamos':'Modelo de negocio',
  empezar:'Empezar', comprar:'Comprar DRACMA', legal:'Información y documentos',
};

function originalBreadcrumbs(pathname) {
  const slug=pathname.replace(/^\/+|\/+$/g,'');
  if (!slug) return [];
  const home={label:'Inicio',path:'/'};
  if (labels[slug]) return [home,{label:labels[slug],path:`/${slug}/`}];
  const project=projects.find(p=>slug===`proyectos/${p.slug}`);
  return project ? [home,{label:'Proyectos',path:'/proyectos/'},{label:project.name,path:`/${slug}/`}] : [];
}
export function breadcrumbsFor(pathname){const locale=localeFor(pathname);return originalBreadcrumbs(basePath(pathname)).map(c=>({label:translateCopy(c.label,dictionaries[locale]),path:localePath(c.path,locale)}));}
