import {parse,serialize} from 'parse5';

// A custom Cloudflare zone rewrites mailto/text and injects its email decoder.
// Normalize only that known transformation; all other content stays comparable.
export function normalizeDeploymentHTML(html) {
  const doc=parse(html),nodes=[];
  const walk=n=>{nodes.push(n);for(const c of n.childNodes||[])walk(c);};
  walk(doc);
  const decode=hex=>{
    if(!/^[a-f\d]+$/i.test(hex)||hex.length<4||hex.length%2) return null;
    const bytes=Buffer.from(hex,'hex');
    try {return new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(1).map(b=>b^bytes[0]));}
    catch {return null;}
  };
  for(const node of nodes) {
    const a=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
    if(node.tagName==='a' && a.href?.startsWith('/cdn-cgi/l/email-protection#')) {
      const email=decode(a.href.split('#')[1]);
      if(email) node.attrs.find(a=>a.name==='href').value=`mailto:${email}`;
    }
    if(node.tagName==='span' && a.class==='__cf_email__' && a['data-cfemail']) {
      const email=decode(a['data-cfemail']);
      if(email&&node.parentNode) {
        const parent=node.parentNode;
        parent.childNodes.splice(parent.childNodes.indexOf(node),1,{nodeName:'#text',value:email,parentNode:parent});
      }
    }
    if(node.tagName==='script' && /^\/cdn-cgi\/scripts\/[a-f\d]+\/cloudflare-static\/email-decode\.min\.js$/i.test(a.src||'') && !(node.childNodes||[]).some(c=>c.value?.trim())) {
      const parent=node.parentNode;
      if(parent) parent.childNodes.splice(parent.childNodes.indexOf(node),1);
    }
  }
  return serialize(doc);
}
