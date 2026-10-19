import { parseFragment } from 'parse5';

const attrs = n => Object.fromEntries((n.attrs || []).map(a => [a.name,a.value]));
const set = (n,name,value) => { const a=n.attrs.find(a=>a.name===name);if(a)a.value=value;else n.attrs.push({name,value}); };
const text = n => n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join(' ').replace(/\s+/g,' ').trim();
const walk = (n,fn) => {fn(n);for(const c of [...n.childNodes||[]])walk(c,fn);};
const content = (n,html) => {n.childNodes=parseFragment(html).childNodes;for(const c of n.childNodes)c.parentNode=n;};
const remove = n => {if(n?.parentNode)n.parentNode.childNodes=n.parentNode.childNodes.filter(c=>c!==n);};
const pending = '<div class="project-verification" data-project-verification><span>Recaudación</span><strong>Sin datos verificados</strong><p>Contrato del proyecto: dirección verificada no publicada.</p></div>';

// Never turn a design fixture into evidence of real fundraising or deployment.
export function clarifyProjectPublication(root,slug) {
  if(!['','proyectos','proyectos/atacama-ii','tecnologia'].includes(slug)||attrs(root)['data-publication-clarified'])return;
  const nodes=new Map();walk(root,n=>{if(attrs(n)['data-pencil-id'])nodes.set(attrs(n)['data-pencil-id'],n);});
  const find = id => {const n=nodes.get(id);if(!n)throw new Error(`Missing project publication layer: ${id}`);return n;};
  const label = (id,value) => {const n=find(id);content(n,'');n.childNodes=[{nodeName:'#text',value,parentNode:n}];};
  const replace = (id,html) => content(find(id),html);
  const note = (heading,body) => `<h2 class="project-status-heading">${heading}</h2><p class="project-status-copy">${body}</p>`;

  if(slug===''||slug==='proyectos') {
    walk(root,n=>{
      if(!n.tagName||n.childNodes?.some(c=>c.tagName))return;
      const value=text(n);
      if(['Abierto','Financiado','Próximamente'].includes(value))n.childNodes=[{nodeName:'#text',value:'Concepto',parentNode:n}];
    });
  }
  if(slug===''||slug==='proyectos'||slug==='proyectos/atacama-ii') {
    walk(root,n=>{
      if(!n.tagName||n.childNodes?.some(c=>c.tagName))return;
      if(['Riesgo alto','Riesgo medio-alto'].includes(text(n)))n.childNodes=[{nodeName:'#text',value:'Riesgo por evaluar',parentNode:n}];
    });
  }
  if(slug==='') {
    for(const id of ['DYoWi','uc6Gd','T4K3q'])replace(id,pending);
    for(const id of ['S1AR3L','HGzOm','KkjsQ'])remove(find(id));
    replace('n5nwaO','PROYECTOS.<br>INFORMACIÓN ANTES DE DECIDIR.');
    walk(root,n=>{
      if(!n.tagName||n.childNodes?.some(c=>c.tagName))return;
      const value=text(n);
      const replacements={
        'PROYECTOS REALES · CONTABILIDAD ABIERTA':'CATÁLOGO ILUSTRATIVO · CONDICIONES POR VERIFICAR',
        'Tokeniza proyectos, gestiona cobros y acompaña el capital hasta su destino. Ventas, fondos liberados y utilidades tienen condiciones de comisión y un registro propio.':'Explora el modelo de DRACMA y sus fichas conceptuales. Las cifras del libro contable son ejemplos de interfaz; no acreditan recaudación real ni contratos de proyecto verificados.',
        'Cada movimiento, visible en blockchain.':'Consulta el estado de publicación de los contratos.',
        'Cada movimiento con su transacción en Avalanche':'Trazabilidad prevista para los movimientos que se verifiquen.',
        'Cada comisión cobrada por contrato, con tope':'Comisiones sujetas a condiciones publicadas por proyecto.',
        'Cada wallet administrativa, pública y separada':'Direcciones administrativas pendientes de verificación pública.',
        'Verlo en la blockchain →':'Consultar estado de contratos →',
        'Ver los 12 proyectos →':'Ver las 12 fichas de ejemplo →',
      };
      if(replacements[value])n.childNodes=[{nodeName:'#text',value:replacements[value],parentNode:n}];
    });
  }
  if(slug==='proyectos') {
    replace('tk9LW','FICHAS CONCEPTUALES.<br>CONDICIONES POR VERIFICAR.');
    label('tsOnq','Explora ejemplos por sector. Antes de evaluar una participación, deben publicarse y verificarse los documentos, el uso del capital y las condiciones de cada proyecto.');
    replace('X32khD',note('INFORMACIÓN NECESARIA PARA UNA RONDA','El mínimo, el límite de captación y las reglas de desembolso deben publicarse antes de habilitar aportes. No se muestran importes ni porcentajes recaudados sin evidencia verificable.'));
    label('vArjv','Fichas conceptuales para mostrar el modelo. No acreditan proyectos operativos, retornos ni actividad de financiación.');
    remove(find('Q8EN2d'));
    replace('f49N1',pending);
    set(find('f49N1'),'class',(attrs(find('f49N1')).class||'')+' project-verification-panel');
    walk(root,n=>{
      const a=attrs(n),name=a['data-pencil-name']||'';
      if(/· Financiación$/.test(name))content(n,pending);
      if(/· Descripción$/.test(name)) {
        const description=n.childNodes.filter(c=>c.tagName).at(-1);
        if(description)content(description,'Ejemplo conceptual: '+text(description));
        set(n,'data-project-concept-description','');
      }
      if(/· Condiciones principales$/.test(name))remove(n);
      if(a['data-project-card']!==undefined)n.attrs=n.attrs.filter(a=>a.name!=='data-project-status-value');
    });
  }
  if(slug==='proyectos/atacama-ii') {
    label('n64KAt','Concepto ilustrativo');
    label('A75MF','Concepto ilustrativo de una planta solar. La capacidad y el contrato de venta de energía no están acreditados mediante documentos publicados.');
    label('wkwqP','CONCEPTO DEL PROYECTO');
    label('gMPHQ','Este ejemplo presenta el diseño de una ficha para una planta solar. No acredita una instalación, permisos aprobados, un contrato de venta de energía ni ingresos efectivos. La información documental del proyecto está pendiente de publicación y verificación.');
    replace('Bejj5','<p class="project-status-copy">Condiciones económicas: no publicadas para una ronda real.</p>');
    set(find('F4qd6q'),'class',(attrs(find('F4qd6q')).class||'')+' project-verification-panel');
    replace('F4qd6q',note('VERIFICACIÓN PENDIENTE','No se publica un importe recaudado, un porcentaje financiado ni un plazo de captación real.')+pending+'<a class="pencil-button pencil-button-outline" href="/tecnologia/#estado-contratos">Estado de los contratos</a><p class="project-status-copy">No se aceptan aportes desde esta ficha.</p>');
    label('fIBD6','Distribución del capital · ejemplo');
    replace('rUVfp',note('HITOS POR VERIFICAR','No se publican hitos aprobados. Los permisos, documentos comerciales y autorizaciones requieren evidencia verificable.'));
    replace('OqI9H',note('SIN CALENDARIO VERIFICADO','No hay fechas de apertura, cierre, puesta en operación o distribución verificadas publicadas para este concepto.'));
    replace('L9DD9',note('TRANSACCIONES DEL PROYECTO','No hay transacciones verificadas publicadas para este proyecto.'));
    for(const [id,value] of Object.entries({
      mawWP:'Blockchain prevista',U5GsY:'Estándar propuesto',
      EtF7q:'Dirección verificada no publicada',CuT2f:'Dirección verificada no publicada',
      FBkzG:'Serie no publicada',S0GjT:'No publicado',u1qKG:'Condiciones no publicadas',b523s7:'Fecha no publicada',Q418jz:'Condición no publicada',
      Cs76d:'DOCUMENTOS POR VERIFICAR',x6V8S:'Memorando · pendiente',PkPTP:'Contrato PPA · pendiente',p4XKrF:'Estudio de irradiación · pendiente',E2Grh:'Sociedad vehículo · pendiente',
      Pe6b4:'Consulta el estado de publicación de los documentos, contratos y condiciones de este concepto antes de evaluar cualquier participación.',
    })) {label(id,value);set(find(id),'class',(attrs(find(id)).class||'')+' project-pending-value');}
  }
  if(slug==='tecnologia') {
    const replacements={
      idFeJ:'Esta página presenta la arquitectura prevista para los proyectos. No acredita un despliegue operativo. Las direcciones verificadas de los contratos de proyecto y sus informes de auditoría no están publicados aquí.',
      BvQhq:'ARQUITECTURA PREVISTA EN AVALANCHE.',
      dbZmu:'El modelo prevé wallets y reglas de autorización por proyecto. Sus direcciones y controles deben verificarse antes de operar.',
      NJEtA:'Un contrato programaría las reglas de comisiones, custodia y reparto. El esquema requiere despliegue y verificación pública.',
      Bc06h:'El diseño contempla wallets separadas por proyecto. Sus saldos e historial solo pueden comprobarse con direcciones y transacciones verificadas.',
      vNjiF:'Código ilustrativo y simplificado. No acredita una versión en producción ni controles de seguridad auditados.',
      LTdFh:'El repositorio público permite revisar el código disponible. Las direcciones verificadas, pruebas de despliegue e informes de auditoría de los proyectos no están publicados en esta página.',
      sBJVq:'Informe independiente no publicado.',
      ddf1f:'Los límites deben poder comprobarse en código desplegado y verificado. Verificación pendiente.',
      gYKbB:'Configuración de firmas y política de cambios pendientes de verificación pública.',
      Liq32:'Verificación de contratos pendiente',mbh32:'Estado de publicación →',
    };
    for(const [id,value] of Object.entries(replacements))label(id,value);
  }
  set(root,'data-publication-clarified','true');
}
