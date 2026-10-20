import Localized from '../../i18n/Localized';
import {useEffect,useRef,useState} from 'react';
type Message={id:number;content:string;kind:'user'|'agent';createdAt:number};
type Question={id:string;question:string};
const locale=()=>typeof document==='undefined'?'es':document.documentElement.lang.split('-')[0];
const storageKey=()=>`dracma-chat-session-v1${locale()==='es'?'':':'+locale()}`;
async function api(path:string,token='',body?:unknown){
 const r=await fetch(`/api/chat/${path}`,{method:body===undefined?'GET':'POST',headers:{'X-Dracma-Locale':locale(),...(token?{Authorization:`Bearer ${token}`} :{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!r.headers.get('content-type')?.includes('application/json'))throw new Error('El chat no está disponible. Inténtalo más tarde.');
 const data=await r.json();if(!r.ok){const e=new Error(data.error||'El chat no está disponible.') as Error&{status?:number};e.status=r.status;throw e;}return data;
}
function Content({text}:{text:string}){return <>{text.split(/(https:\/\/dracma\.club\/[^\s]*)/g).map((part,i)=>{if(!part.startsWith('https://dracma.club/'))return part;const url=part.replace(/[.,;:!?)]*$/,'');return <span key={i}><a href={url}>{url.replace('https://dracma.club','dracma.club')}</a>{part.slice(url.length)}</span>;})}</>;}

export default function DracmaChat(){
 const [token,setToken]=useState(''),[questions,setQuestions]=useState<Question[]>([]),[messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[expanded,setExpanded]=useState(false),[loaded,setLoaded]=useState(false);
 const session=useRef(''),sending=useRef(false),polling=useRef(false),log=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null);
 function report(e:unknown){setError(e instanceof Error?e.message:'No se pudo conectar con el chat.');}
 async function questionsLoad(){try{const data=await api('questions');setQuestions(data.questions);setLoaded(true);setError('');}catch(e){report(e);}}
 async function refresh(t=session.current){if(!t||polling.current)return;polling.current=true;try{const data=await api('messages',t);if(session.current===t){setMessages(data.messages);setError('');}}catch(e){report(e);}finally{polling.current=false;}}
 useEffect(()=>{try{const t=sessionStorage.getItem(storageKey())||'';session.current=t;setToken(t);}catch{}questionsLoad();const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},3000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(token)refresh(token);},[token]);
 useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:'smooth'});},[messages.length]);
 async function send(value=draft){const content=value.trim();if(!content||sending.current||content.length>2000)return;sending.current=true;setBusy(true);setError('');try{
  let t=session.current;if(!t){const data=await api('session','',{locale:locale()});t=data.sessionToken;session.current=t;setToken(t);try{sessionStorage.setItem(storageKey(),t);}catch{}}
  await api('messages',t,{content});setDraft('');await refresh(t);
 }catch(e){report(e);}finally{sending.current=false;setBusy(false);}}
 function reset(){if(sending.current)return;session.current='';setToken('');setMessages([]);setDraft('');setError('');try{sessionStorage.removeItem(storageKey());}catch{}input.current?.focus();}
 return <Localized><section className="dracma-chat" aria-label="Chat del Agente DRACMA">
  <header className="dracma-chat-header"><div><strong>Agente DRACMA</strong><span>Preguntas frecuentes · Chatwoot</span></div>{token&&<button type="button" onClick={reset} disabled={busy}>Nueva consulta</button>}</header>
  <div className="dracma-chat-log" role="log" aria-live="polite" aria-relevant="additions" ref={log} tabIndex={0} aria-label="Mensajes de la conversación">
   <p className="dracma-chat-intro">Consulta la información pública de proyectos, comisiones y riesgos. Las respuestas son automáticas y puedes solicitar revisión del equipo.</p>
   {messages.map(m=><div className={`dracma-chat-message dracma-chat-${m.kind}`} key={m.id}><span>{m.kind==='user'?'Tú':'Agente DRACMA'}</span><p><Content text={m.content}/></p></div>)}
   {busy&&<p role="status" className="dracma-chat-status">Enviando tu consulta…</p>}
  </div>
  <div className="dracma-chat-questions"><div className="dracma-chat-question-heading"><span>¿Qué quieres revisar?</span>{questions.length>4&&<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Ver menos':'Todas las preguntas'}</button>}</div><div className="dracma-chat-chips">{questions.slice(0,expanded?questions.length:4).map(q=><button type="button" key={q.id} disabled={busy} onClick={()=>send(q.question)}>{q.question}<span aria-hidden="true">↗</span></button>)}</div>{!loaded&&<button className="dracma-chat-retry" onClick={questionsLoad}>Cargar preguntas</button>}</div>
  {error&&<div className="dracma-chat-error" role="alert"><p>{error}</p><button type="button" onClick={()=>token?refresh():questionsLoad()}>Revisar conexión e historial</button>{token&&<button type="button" onClick={reset}>Iniciar nueva consulta</button>}</div>}
  <form className="dracma-chat-form" onSubmit={e=>{e.preventDefault();send();}}><label htmlFor="dracma-chat-input">Tu pregunta</label><div><textarea id="dracma-chat-input" ref={input} dir="auto" rows={2} maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Escribe tu pregunta…" disabled={busy} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><button type="submit" disabled={busy||!draft.trim()} aria-label="Enviar pregunta">{busy?'…':'↑'}</button></div></form>
  <p className="dracma-chat-privacy">Al enviar, tu consulta se guarda en Chatwoot para atenderla. No compartas claves ni documentos de identidad. <a href="/legal/#privacidad">Privacidad</a>. Información general, sin asesoramiento personalizado.</p>
 </section></Localized>;
}
