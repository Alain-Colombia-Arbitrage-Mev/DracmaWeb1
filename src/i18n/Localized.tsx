import {Children,cloneElement,isValidElement,type ReactNode,type ReactElement} from 'react';
import {runtimeDictionary,runtimeLocale} from './runtime';
import {localePath,translateCopy} from './locales.mjs';
function localize(node:ReactNode):ReactNode{
 if(typeof node==='string')return translateCopy(node,runtimeDictionary);
 if(!isValidElement(node))return node;
 const element=node as ReactElement<Record<string,any>>;const props=element.props;
 if(props['data-no-translate']!==undefined||/dracma-chat-message|debit-card/.test(props.className||''))return node;
 const next:Record<string,any>={};
 for(const name of ['aria-label','alt','title','placeholder'])if(typeof props[name]==='string')next[name]=translateCopy(props[name],runtimeDictionary);
 if(typeof document!=='undefined'&&typeof props.dangerouslySetInnerHTML?.__html==='string'){
  const template=document.createElement('template');template.innerHTML=props.dangerouslySetInnerHTML.__html;
  const walk=(root:Node)=>{if(root instanceof Element&&['SCRIPT','STYLE','CODE','PRE'].includes(root.tagName))return;if(root.nodeType===Node.TEXT_NODE)root.nodeValue=translateCopy(root.nodeValue||'',runtimeDictionary);if(root instanceof HTMLAnchorElement){const href=root.getAttribute('href');if(href?.startsWith('/'))root.setAttribute('href',localePath(href,runtimeLocale));}for(const child of root.childNodes)walk(child);};
  walk(template.content);next.dangerouslySetInnerHTML={__html:template.innerHTML};
 }
 if(typeof props.href==='string'&&props.href.startsWith('/')&&!props.href.startsWith('/api/'))next.href=localePath(props.href,runtimeLocale);
 if(props.children!==undefined)next.children=Children.map(props.children,localize);
 return cloneElement(element,next);
}
export default function Localized({children}:{children:ReactNode}){return runtimeLocale==='es'?children:localize(children);}
