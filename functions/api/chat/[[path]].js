export async function onRequest({request,env}) {
 const url=new URL(request.url);
 const routes={'/api/chat/questions':['GET'],'/api/chat/session':['POST'],'/api/chat/messages':['GET','POST']};
 const fail=(error,status,extra={})=>Response.json({error},{status,headers:{'Cache-Control':'no-store',...extra}});
 const methods=routes[url.pathname];
 if(!methods)return fail('No encontrado.',404);
 if(!methods.includes(request.method))return fail('Método no permitido.',405,{Allow:methods.join(', ')});
 if(request.method==='POST'){
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return fail('Origen no permitido.',403);
  if(request.headers.get('sec-fetch-site')==='cross-site')return fail('Origen no permitido.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return fail('Se requiere JSON.',415);
 }
 let target;
 try {const base=new URL(env.CHAT_API_ORIGIN);if(base.protocol!=='https:'||base.username||base.password||base.origin===url.origin||!env.CHAT_PROXY_SECRET)throw Error();target=new URL(url.pathname.replace('/api/chat/','/chat/'),base.origin);}catch{return fail('El chat todavía no está configurado.',503);}
 const headers=new Headers({'Accept':'application/json','X-Dracma-Chat-Proxy':env.CHAT_PROXY_SECRET,'X-Dracma-Client-IP':request.headers.get('cf-connecting-ip')||'unknown'});
 for(const key of ['authorization','content-type'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
 try {
  let body;
  if(request.method==='POST'){const reader=request.body?.getReader();const chunks=[];let size=0;
   if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return fail('Mensaje demasiado largo.',413);}chunks.push(value);}}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}body=new TextDecoder().decode(bytes);}
  const response=await fetch(target,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(!response.headers.get('content-type')?.includes('application/json'))return fail('El chat no está disponible. Inténtalo más tarde.',502);
  return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(response.headers.has('retry-after')?{'Retry-After':response.headers.get('retry-after')}: {})}});
 }catch{return fail('No se pudo conectar con el chat. Revisa el historial antes de volver a enviar.',502);}
}
