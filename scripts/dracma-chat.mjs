// Preserve the functional chat mount when reimporting the Pencil homepage.
export function normalizeDracmaChat(root) {
 const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
 const set=(n,k,v)=>{n.attrs=n.attrs||[];const a=n.attrs.find(a=>a.name===k);if(a)a.value=v;else n.attrs.push({name:k,value:v});};
 const walk=n=>{const id=attr(n,'data-pencil-id');
  if(id==='C3jEn')set(n,'id','agente-dracma');
  if(id==='tQhrb')set(n,'class','canvas-container dracma-agent-layout');
  if(id==='z7k2I2'){set(n,'class','dracma-agent-copy');n.attrs=n.attrs.filter(a=>a.name!=='data-adaptive-width');}
  if(id==='t4TDnd'){set(n,'class','dracma-agent-mount');set(n,'data-dracma-chat','');n.attrs=n.attrs.filter(a=>a.name!=='data-adaptive-width');n.childNodes=[];}
  if(n.nodeName==='#text')n.value=n.value.replace('Te avisa si algo cambia en la contabilidad de tus proyectos.','Aclara qué información está publicada y qué sigue pendiente de verificar.').replace('Consulta documentos, movimientos y riesgos en un mismo lugar. El Agente dracma te ayuda a interpretar la información del proyecto en lenguaje claro.','Consulta documentos públicos, condiciones y riesgos en un mismo lugar. El Agente dracma explica la información publicada del proyecto en lenguaje claro.');
  for(const c of n.childNodes||[])walk(c);
 };walk(root);
}
