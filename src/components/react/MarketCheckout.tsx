import Localized from '../../i18n/Localized';
import {useEffect,useId,useRef,useState} from 'react';
import {useAccount,useConnect,useConnectors} from 'wagmi';
import {isAddress} from 'viem';
import Web3Provider from './Web3Provider';
import {useMarketPrice} from './useMarketPrice';
import {CheckoutError,createMarketInvoice,createMarketQuote,formatMarketUSD,getPurchaseOrder,randomReceiptToken,validMarketQuote,type MarketQuote,type PurchaseOrder} from '../../services/marketCheckout';
import {DRACMA_TOKEN_ADDRESS} from '../../config/contracts';
import {localeFor} from '../../i18n/locales.mjs';
import {estimateTokens,formatTokenEstimate,usdCents} from '../../services/tokenEstimate';
import {runtimeLocale} from '../../i18n/runtime';

const tokenKey=(id:string)=>`dracma-receipt:${id}`;
const pendingKey='dracma-pending-checkout';
const states:Record<string,string>={invoice_creating:'Preparando factura',invoice_unknown:'Factura pendiente de verificación',awaiting_payment:'Esperando el pago',waiting:'Esperando el pago',confirming:'Confirmando el pago',confirmed:'Pago confirmado por NOWPayments',sending:'Procesando el pago',partially_paid:'Pago parcial: revisa NOWPayments',delivery_pending:'Pago verificado. Entrega de DRACMA en cola',submitted:'Transferencia enviada a BSC; esperando confirmaciones',delivered:'DRACMA entregados en tu wallet',failed:'El pago no se completó',expired:'El pago caducó',refunded:'Pago reembolsado',manual_review:'La orden requiere revisión del equipo'};
function Checkout(){
  const fieldId=useId();
  const {address}=useAccount();const connectors=useConnectors();const {connectAsync,isPending}=useConnect();const {market,loading,error:priceError,retry}=useMarketPrice();
  const [amount,setAmount]=useState('');const [wallet,setWallet]=useState('');const [quote,setQuote]=useState<MarketQuote|null>(null);const [order,setOrder]=useState<PurchaseOrder|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [now,setNow]=useState(Date.now());const [uncertain,setUncertain]=useState(false);const [returningId,setReturningId]=useState('');const [pendingId,setPendingId]=useState('');
  const [stage,setStage]=useState<'amount'|'wallet'>('amount');const [walletTouched,setWalletTouched]=useState(false);
  const titleRef=useRef<HTMLHeadingElement>(null);const previousStep=useRef(1);
  const attempt=useRef<{quoteId:string;key:string;receiptToken:string}|null>(null);
  const currentMarket=market&&Date.parse(market.price.expiresAt)>now?market:null;
  const cents=usdCents(amount);
  const minimum=market?usdCents(market.minimumUsd):null;const maximum=market?usdCents(market.maximumUsd):null;
  const withinLimits=cents!==null&&minimum!==null&&maximum!==null&&cents>0n&&cents>=minimum&&cents<=maximum;
  const estimatedTokens=currentMarket&&withinLimits?estimateTokens(amount,currentMarket.price.priceUsd,currentMarket.tokenDecimals):null;
  const estimateHelp=!amount.trim()?'Introduce un importe para calcular los DRACMA a recibir.':cents===null?'Usa un importe en USD con hasta dos decimales.':!market?'Esperando un precio de mercado vigente.':!withinLimits?'El importe debe estar dentro de los límites de compra.':!currentMarket?'El precio ha caducado. Actualizando la estimación…':'Estimación al precio actual. La cantidad final se confirma al revisar la cotización.';
  useEffect(()=>{if(address&&!quote)setWallet(address);},[address,quote]);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    const id=new URLSearchParams(location.search).get('order_id');
    if(!id||!/^o_[a-f0-9]{32}$/.test(id)){
      try{const saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(saved&&validMarketQuote(saved.quote)&&saved.attempt?.quoteId===saved.quote.id&&/^[a-f0-9]{64}$/.test(saved.attempt.receiptToken)&&/^[A-Za-z0-9_-]{16,128}$/.test(saved.attempt.key)){attempt.current=saved.attempt;setAmount(saved.quote.amountUsd);setWallet(saved.quote.walletAddress);setQuote(saved.quote);setUncertain(true);setError('Hay una factura pendiente de comprobar. Reintenta esta misma compra para recuperar su estado.');}}catch{}
      return;
    }
    setReturningId(id);
    let token='';try{token=sessionStorage.getItem(tokenKey(id))||'';if(!token){const saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(saved?.orderId===id)token=saved.attempt?.receiptToken||'';}}catch{}
    if(!/^[a-f0-9]{64}$/.test(token)){setError(`No se puede consultar esta orden en este navegador. Conserva la referencia ${id} para soporte.`);return;}
    let active=true,pending=false,terminal=false;
    const refresh=async()=>{if(pending||terminal||document.hidden)return;pending=true;try{const result=await getPurchaseOrder(id,token);if(active){setOrder(result);setError('');terminal=['delivered','invoice_rejected','failed','expired','refunded','manual_review'].includes(result.status);}}catch(e){if(active)setError(e instanceof Error?e.message:'No se pudo verificar la orden.');}finally{pending=false;}};
    void refresh();const timer=setInterval(refresh,5000);return()=>{active=false;clearInterval(timer);};
  },[]);
  const validWallet=isAddress(wallet)&&!/^0x0{40}$/i.test(wallet)&&wallet.toLowerCase()!==DRACMA_TOKEN_ADDRESS.toLowerCase();
  const step=quote?3:stage==='wallet'?2:1;
  useEffect(()=>{if(step!==previousStep.current){previousStep.current=step;titleRef.current?.focus();}},[step]);
  const connectWallet=async()=>{
    setError('');const injected=!!(window as any).ethereum;const connector=connectors.find(c=>c.id===(injected?'injected':'walletConnect'));
    if(!connector){setError('No se pudo abrir la conexión. Puedes pegar tu dirección de wallet.');return;}
    try{await connectAsync({connector});}catch{setError('La conexión no se completó. Inténtalo otra vez o pega tu dirección.');}
  };
  const review=async()=>{
    setError('');setWalletTouched(true);if(!validWallet){document.getElementById(`${fieldId}-wallet`)?.focus();return;}if(cents===null||!withinLimits||!estimatedTokens){setError('Revisa el importe y espera un precio actualizado.');return;}
    const amountUsd=`${cents/100n}.${(cents%100n).toString().padStart(2,'0')}`;
    setBusy(true);try{const q=await createMarketQuote(wallet,amountUsd);setQuote(q);setNow(Date.now());attempt.current={quoteId:q.id,key:crypto.randomUUID(),receiptToken:randomReceiptToken()};setUncertain(false);}catch(e){setError(e instanceof Error?e.message:'No se pudo obtener la cotización.');}finally{setBusy(false);}
  };
  const pay=async()=>{
    const current=attempt.current;if(!quote||!current||!market?.checkoutAvailable)return;setBusy(true);setError('');let sent=false;
    try{
      // Persist recovery before any side effect. Do not create an invoice if storage is blocked.
      try{sessionStorage.setItem(pendingKey,JSON.stringify({quote,attempt:current}));sessionStorage.setItem('dracma-checkout-locale',localeFor(location.pathname));}catch{throw Error('Permite el almacenamiento de esta pestaña para conservar el acceso a tu orden antes de pagar.');}
      sent=true;
      const result=await createMarketInvoice(current.quoteId,current.receiptToken,current.key);
      if(!result.invoiceUrl)throw new CheckoutError('La factura sigue pendiente de verificación.','invoice_pending',result.id);
      const target=new URL(result.invoiceUrl);if(target.protocol!=='https:'||!['nowpayments.io','sandbox.nowpayments.io'].includes(target.hostname)||target.username||target.password||target.port)throw Error('El destino de pago no es válido.');
      sessionStorage.setItem(tokenKey(result.id),current.receiptToken);
      sessionStorage.removeItem(pendingKey);
      window.location.assign(target.href);
    }catch(e){
      const definitive=e instanceof CheckoutError&&['invoice_rejected','quote_expired','checkout_disabled','inventory','invalid_request'].includes(e.code);
      setUncertain(sent&&!definitive);
      if(definitive)try{sessionStorage.removeItem(pendingKey);}catch{}
      if(e instanceof CheckoutError&&e.orderId){setPendingId(e.orderId);try{sessionStorage.setItem(tokenKey(e.orderId),current.receiptToken);sessionStorage.setItem(pendingKey,JSON.stringify({quote,attempt:current,orderId:e.orderId}));}catch{}}
      setError(e instanceof Error?e.message:'No se pudo preparar NOWPayments.');
    }finally{setBusy(false);}
  };
  const seconds=quote?Math.max(0,Math.ceil((Date.parse(quote.expiresAt)-now)/1000)):0;
  if(returningId&&!order)return <Localized><div className="flow-widget"><p className="buy-eyebrow">ESTADO DE TU COMPRA</p><h2 className="mt-4">Verificación de la orden</h2><p className="flow-summary break-all">Referencia: {returningId}</p><p role="status">{error||'Consultando el estado confirmado por el servicio de compra…'}</p><p className="field-help">No realices otro pago para esta orden mientras verificas su estado.</p></div></Localized>;
  if(order)return <Localized><div className="flow-widget"><p className="buy-eyebrow">ESTADO DE TU COMPRA</p><h2 className="mt-4" aria-live="polite">{states[order.status]||'Verificando orden'}</h2><p className="mt-4">El regreso desde NOWPayments no confirma por sí mismo el pago ni la entrega.</p><div className="flow-summary"><p>Referencia: {order.id}</p><p>Importe: US$ {order.quote.amountUsd}</p><p>DRACMA: {order.quote.tokenAmount}</p><p className="break-all">Wallet BSC: {order.quote.walletAddress}</p></div>{order.txHash&&/^0x[a-fA-F0-9]{64}$/.test(order.txHash)&&<a className="pencil-button flow-next" href={`https://bscscan.com/tx/${order.txHash}`} target="_blank" rel="noreferrer">Ver transferencia en BscScan ↗</a>}{error&&<p role="alert" className="flow-error">{error}</p>}</div></Localized>;
  const expired=!!quote&&seconds===0&&!uncertain;
  const amountError=amount.trim()&&(cents===null||!withinLimits)&&!!market;
  return <Localized><section className="flow-widget market-checkout" aria-label="Comprar DRACMA" aria-busy={busy}>
    <div className="purchase-brand"><span className="purchase-token"><img src="/brand/dracma-eagle.webp" alt="" width="24" height="28"/>DRACMA</span><span className="purchase-network">BNB Smart Chain</span></div>
    <ol className="purchase-steps" aria-label="Pasos de compra">{['Importe','Wallet','Revisión'].map((label,index)=><li key={label} aria-current={step===index+1?'step':undefined} data-complete={step>index+1}><span aria-hidden="true">{step>index+1?'✓':index+1}</span>{label}</li>)}</ol>
    {market&&!market.checkoutAvailable&&<p className="purchase-availability" role="status">Puedes cotizar tu compra. El pago aún no está disponible.</p>}
    {!quote&&stage==='amount'&&<form onSubmit={e=>{e.preventDefault();if(estimatedTokens){setError('');setStage('wallet');}}}>
      <h2 ref={titleRef} tabIndex={-1}>¿Cuánto quieres comprar?</h2><p className="purchase-subtitle">Elige el importe. Calculamos tus DRACMA al instante.</p>
      <div className="checkout-field-group">
        <label htmlFor={`${fieldId}-amount`}>Importe en USD</label>
        <div className="checkout-amount"><input id={`${fieldId}-amount`} className="flow-field" inputMode="decimal" type="text" value={amount} onChange={e=>{setAmount(e.target.value);setError('');}} aria-label="Importe de compra en USD" aria-describedby={`${fieldId}-amount-help`} aria-invalid={!!amountError} placeholder="0,00" autoComplete="off" maxLength={28} spellCheck={false}/><span className="checkout-currency" aria-hidden="true">USD</span></div>
        <div className="purchase-presets" role="group" aria-label="Importes rápidos">{[25,50,100,250].map(value=><button type="button" key={value} aria-pressed={cents===BigInt(value)*100n} disabled={!!market&&(minimum===null||maximum===null||BigInt(value)*100n<minimum||BigInt(value)*100n>maximum)} onClick={()=>{setAmount(String(value));setError('');}}>US$ {value}</button>)}</div>
        <p id={`${fieldId}-amount-help`} className={amountError?'purchase-field-error':'checkout-input-help'}>{amountError?estimateHelp:market?`Mínimo: US$ ${market.minimumUsd} · Máximo: US$ ${market.maximumUsd}`:'Introduce un importe en dólares estadounidenses.'}</p>
      </div>
      <div className="purchase-receive"><span id={`${fieldId}-estimate-label`}>DRACMA estimados a recibir</span><output htmlFor={`${fieldId}-amount`} aria-labelledby={`${fieldId}-estimate-label`} aria-live="polite" title={estimatedTokens?`${estimatedTokens} DRACMA`:undefined}><bdi dir="ltr">{estimatedTokens?`≈ ${formatTokenEstimate(estimatedTokens,runtimeLocale)}`:'—'}</bdi><small>DRACMA</small></output><p>La cantidad final se confirma antes del pago.</p></div>
      <div className="purchase-rate"><span>Precio por DRACMA</span><strong>{currentMarket?formatMarketUSD(currentMarket.price.priceUsd):'—'}</strong></div>
      {!currentMarket&&<div className="purchase-market-error" role="status"><p>{loading?'Consultando precio…':priceError||'Esperando un precio de mercado vigente.'}</p>{!loading&&<button type="button" className="purchase-link" onClick={retry}>Reintentar precio</button>}</div>}
      <button type="submit" className="pencil-button flow-next" disabled={!estimatedTokens||loading}>Continuar <span aria-hidden="true">→</span></button><p className="purchase-reassurance">Calcular no realiza ningún pago.</p>
    </form>}
    {!quote&&stage==='wallet'&&<form noValidate onSubmit={e=>{e.preventDefault();void review();}}>
      <h2 ref={titleRef} tabIndex={-1}>¿Dónde recibes tus DRACMA?</h2><p className="purchase-subtitle">Pega tu dirección o conecta una wallet.</p>
      <div className="purchase-mini-summary"><span>Tu compra</span><strong><bdi>US$ {amount}</bdi></strong><span>DRACMA estimados</span><strong><bdi>{estimatedTokens?`≈ ${formatTokenEstimate(estimatedTokens,runtimeLocale)}`:'—'}</bdi></strong></div>
      <div className="checkout-field-group"><label htmlFor={`${fieldId}-wallet`}>Wallet de recepción en BSC</label><input id={`${fieldId}-wallet`} className="flow-field checkout-wallet" aria-label="Wallet de recepción BSC" aria-describedby={`${fieldId}-wallet-help`} aria-invalid={walletTouched&&!validWallet} value={wallet} onChange={e=>{setWallet(e.target.value.trim());setError('');}} onBlur={()=>setWalletTouched(true)} placeholder="0x…" autoComplete="off" autoCapitalize="none" autoCorrect="off" maxLength={42} spellCheck={false}/><p id={`${fieldId}-wallet-help`} className={walletTouched&&!validWallet?'purchase-field-error':'checkout-input-help'}>{walletTouched&&!validWallet?'Introduce una dirección BSC válida que controles.':'Usa una wallet compatible con BNB Smart Chain (BEP-20).'}</p></div>
      <button type="button" className="purchase-connect" disabled={isPending||busy} onClick={()=>void connectWallet()}>{isPending?'Conectando…':'Conectar una wallet'} <span>↗</span></button>
      <p className="checkout-input-help">Conectarla es opcional. No pediremos tu frase de recuperación.</p>
      {!currentMarket&&<p className="purchase-field-error" role="status">{priceError||'Esperando un precio de mercado vigente.'} <button type="button" className="purchase-link" disabled={loading} onClick={retry}>Reintentar precio</button></p>}
      <button type="submit" className="pencil-button flow-next" disabled={busy||isPending||!estimatedTokens}>{busy?'Obteniendo cotización…':'Revisar compra'} <span aria-hidden="true">→</span></button>
      <button type="button" className="purchase-back" disabled={busy} onClick={()=>{setStage('amount');setError('');}}>← Cambiar importe</button>
    </form>}
    {quote&&<>
      <h2 ref={titleRef} tabIndex={-1}>Revisa y confirma.</h2><p className="purchase-subtitle">Comprueba el importe y la dirección de recepción.</p>
      <div className="purchase-receive"><span>DRACMA cotizados</span><strong className="purchase-quoted"><bdi>{`≈ ${formatTokenEstimate(quote.tokenAmount,runtimeLocale)}`}</bdi><small>DRACMA</small></strong><p>La cantidad exacta está en los detalles de la operación.</p></div>
      <dl className="purchase-review"><div><dt>Importe de la orden</dt><dd><bdi>US$ {quote.amountUsd}</bdi></dd></div><div><dt>Wallet de recepción</dt><dd><bdi className="purchase-address" dir="ltr">{quote.walletAddress}</bdi></dd></div><div><dt>Red de entrega</dt><dd>BNB Smart Chain · BEP-20</dd></div></dl>
      <p className={expired?'purchase-field-error':'purchase-expiry'}>{expired?'La cotización venció. Actualízala para continuar.':uncertain?'Comprobando la factura existente. No realices otro pago.':`Precio reservado durante ${seconds} s para abrir el pago.`}</p>
      <p className="purchase-payment-note">Elige tu criptomoneda en NOWPayments. Allí verás el importe exacto y las comisiones antes de pagar.</p>
      <button type="button" className="pencil-button flow-next" disabled={busy||(expired?!estimatedTokens:!market?.checkoutAvailable)} onClick={()=>void(expired?review():pay())}>{busy?'Preparando compra…':expired?'Actualizar cotización':uncertain?'Comprobar la misma factura':!market?.checkoutAvailable?'Pago aún no disponible':'Pagar con NOWPayments'} <span aria-hidden="true">↗</span></button>
      {pendingId&&<a className="purchase-link" href={`/comprar/?order_id=${pendingId}`}>Ver estado de {pendingId}</a>}
      <button type="button" className="purchase-back" disabled={busy||uncertain} onClick={()=>{setQuote(null);setStage('wallet');attempt.current=null;setError('');}}>← Editar wallet o importe</button>
    </>}
    {error&&<p className="flow-error purchase-error" role="alert">{error}</p>}
    <details className="purchase-details"><summary>Detalles de la operación</summary><dl><div><dt>Contrato DRACMA</dt><dd><bdi dir="ltr">{DRACMA_TOKEN_ADDRESS}</bdi></dd></div><div><dt>Precio de referencia</dt><dd>Dexscreener · BNB Smart Chain</dd></div>{quote&&<><div><dt>Precio aplicado</dt><dd>{formatMarketUSD(quote.market.priceUsd)}</dd></div><div><dt>Cantidad exacta de DRACMA</dt><dd><bdi dir="ltr">{quote.tokenAmount}</bdi></dd></div></>}</dl><p>La entrega se procesa después de verificar el pago. El precio puede variar.</p></details>
  </section></Localized>;
}
export default function MarketCheckout(){return <Web3Provider><Checkout/></Web3Provider>;}
