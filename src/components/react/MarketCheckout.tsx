import {useEffect,useId,useRef,useState} from 'react';
import {useAccount,useConnect,useConnectors} from 'wagmi';
import {isAddress} from 'viem';
import Web3Provider from './Web3Provider';
import {useMarketPrice} from './useMarketPrice';
import {CheckoutError,createMarketInvoice,createMarketQuote,formatMarketUSD,getPurchaseOrder,randomReceiptToken,validMarketQuote,type MarketQuote,type PurchaseOrder} from '../../services/marketCheckout';
import {DRACMA_TOKEN_ADDRESS} from '../../config/contracts';

const tokenKey=(id:string)=>`dracma-receipt:${id}`;
const pendingKey='dracma-pending-checkout';
const states:Record<string,string>={invoice_creating:'Preparando factura',invoice_unknown:'Factura pendiente de verificación',awaiting_payment:'Esperando el pago',waiting:'Esperando el pago',confirming:'Confirmando el pago',confirmed:'Pago confirmado por NOWPayments',sending:'Procesando el pago',partially_paid:'Pago parcial: revisa NOWPayments',delivery_pending:'Pago verificado. Entrega de DRACMA en cola',submitted:'Transferencia enviada a BSC; esperando confirmaciones',delivered:'DRACMA entregados en tu wallet',failed:'El pago no se completó',expired:'El pago caducó',refunded:'Pago reembolsado',manual_review:'La orden requiere revisión del equipo'};
function Checkout(){
  const fieldId=useId();
  const {address}=useAccount();const connectors=useConnectors();const {connect,isPending}=useConnect();const {market,loading,error:priceError}=useMarketPrice();
  const [amount,setAmount]=useState('');const [wallet,setWallet]=useState('');const [quote,setQuote]=useState<MarketQuote|null>(null);const [order,setOrder]=useState<PurchaseOrder|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [now,setNow]=useState(Date.now());const [uncertain,setUncertain]=useState(false);const [returningId,setReturningId]=useState('');const [pendingId,setPendingId]=useState('');
  const attempt=useRef<{quoteId:string;key:string;receiptToken:string}|null>(null);
  useEffect(()=>{if(address&&!quote)setWallet(address);},[address,quote]);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    const id=new URLSearchParams(location.search).get('order_id');
    if(!id||!/^o_[a-f0-9]{32}$/.test(id)){
      try{const saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(saved&&validMarketQuote(saved.quote)&&saved.attempt?.quoteId===saved.quote.id&&/^[a-f0-9]{64}$/.test(saved.attempt.receiptToken)&&/^[A-Za-z0-9_-]{16,128}$/.test(saved.attempt.key)){attempt.current=saved.attempt;setQuote(saved.quote);setUncertain(true);setError('Hay una factura pendiente de comprobar. Reintenta esta misma compra para recuperar su estado.');}}catch{}
      return;
    }
    setReturningId(id);
    let token='';try{token=sessionStorage.getItem(tokenKey(id))||'';if(!token){const saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(saved?.orderId===id)token=saved.attempt?.receiptToken||'';}}catch{}
    if(!/^[a-f0-9]{64}$/.test(token)){setError(`No se puede consultar esta orden en este navegador. Conserva la referencia ${id} para soporte.`);return;}
    let active=true,pending=false,terminal=false;
    const refresh=async()=>{if(pending||terminal||document.hidden)return;pending=true;try{const result=await getPurchaseOrder(id,token);if(active){setOrder(result);setError('');terminal=['delivered','invoice_rejected','failed','expired','refunded','manual_review'].includes(result.status);}}catch(e){if(active)setError(e instanceof Error?e.message:'No se pudo verificar la orden.');}finally{pending=false;}};
    void refresh();const timer=setInterval(refresh,5000);return()=>{active=false;clearInterval(timer);};
  },[]);
  const connectWallet=()=>{const injected=!!(window as any).ethereum;const c=connectors.find(c=>c.id===(injected?'injected':'walletConnect'));if(c)connect({connector:c});};
  const review=async()=>{
    const amountUsd=amount.trim().replace(',','.');
    setError('');if(!isAddress(wallet)||!/^\d+(\.\d{1,2})?$/.test(amountUsd)){setError('Indica un importe en USD con hasta dos decimales y una wallet BSC válida.');return;}
    setBusy(true);try{const q=await createMarketQuote(wallet,amountUsd);setQuote(q);setNow(Date.now());attempt.current={quoteId:q.id,key:crypto.randomUUID(),receiptToken:randomReceiptToken()};setUncertain(false);}catch(e){setError(e instanceof Error?e.message:'No se pudo obtener la cotización.');}finally{setBusy(false);}
  };
  const pay=async()=>{
    const current=attempt.current;if(!quote||!current||!market?.checkoutAvailable)return;setBusy(true);setError('');let sent=false;
    try{
      // Persist recovery before any side effect. Do not create an invoice if storage is blocked.
      try{sessionStorage.setItem(pendingKey,JSON.stringify({quote,attempt:current}));}catch{throw Error('Permite el almacenamiento de esta pestaña para conservar el acceso a tu orden antes de pagar.');}
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
  if(returningId&&!order)return <div className="flow-widget"><p className="buy-eyebrow">ESTADO DE TU COMPRA</p><h2 className="mt-4">Verificación de la orden</h2><p className="flow-summary break-all">Referencia: {returningId}</p><p role="status">{error||'Consultando el estado confirmado por el servicio de compra…'}</p><p className="field-help">No realices otro pago para esta orden mientras verificas su estado.</p></div>;
  if(order)return <div className="flow-widget"><p className="buy-eyebrow">ESTADO DE TU COMPRA</p><h2 className="mt-4" aria-live="polite">{states[order.status]||'Verificando orden'}</h2><p className="mt-4">El regreso desde NOWPayments no confirma por sí mismo el pago ni la entrega.</p><div className="flow-summary"><p>Referencia: {order.id}</p><p>Importe: US$ {order.quote.amountUsd}</p><p>DRACMA: {order.quote.tokenAmount}</p><p className="break-all">Wallet BSC: {order.quote.walletAddress}</p></div>{order.txHash&&/^0x[a-fA-F0-9]{64}$/.test(order.txHash)&&<a className="pencil-button flow-next" href={`https://bscscan.com/tx/${order.txHash}`} target="_blank" rel="noreferrer">Ver transferencia en BscScan ↗</a>}{error&&<p role="alert" className="flow-error">{error}</p>}</div>;
  return <div className="flow-widget market-checkout">
    <div className="crypto-label"><strong>Comprar DRACMA</strong><small>{quote?'02 / 02':'01 / 02'}</small></div>
    <div className="checkout-market"><span>Precio de mercado · Dexscreener</span><strong>{market?formatMarketUSD(market.price.priceUsd):'—'}</strong><small>{loading?'Consultando precio…':priceError||`Consultado ${new Date(market!.price.observedAt).toLocaleTimeString('es')}`}</small></div>
    {!quote?<>
      <div className="checkout-field-group">
        <label htmlFor={`${fieldId}-amount`}>Importe de compra</label>
        <div className="checkout-amount">
          <input id={`${fieldId}-amount`} className="flow-field" aria-label="Importe de compra en USD" aria-describedby={`${fieldId}-amount-help`} inputMode="decimal" type="text" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00" autoComplete="off" spellCheck={false}/>
          <span className="checkout-currency" aria-hidden="true">USD</span>
        </div>
        <p id={`${fieldId}-amount-help`} className="checkout-input-help">En dólares estadounidenses · Hasta 2 decimales</p>
      </div>
      <div className="checkout-field-group">
        <label htmlFor={`${fieldId}-wallet`}>Wallet de recepción en BSC</label>
        <input id={`${fieldId}-wallet`} className="flow-field checkout-wallet" aria-label="Wallet de recepción BSC" aria-describedby={`${fieldId}-wallet-help`} value={wallet} onChange={e=>setWallet(e.target.value.trim())} placeholder="0x…" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
        <p id={`${fieldId}-wallet-help`} className="checkout-input-help">Pega tu dirección de BNB Smart Chain.</p>
      </div>
      <button type="button" className="flow-back mt-3" disabled={isPending} onClick={connectWallet}>{address?'Wallet conectada':isPending?'Conectando…':'Conectar mi wallet'}</button>
      <div className="crypto-definition"><span>Red de entrega</span><strong>BNB Smart Chain · BEP-20</strong></div><div className="crypto-definition"><span>Pago</span><strong>Criptomonedas · NOWPayments</strong></div>
      <button className="pencil-button flow-next" disabled={loading||busy||!market||!amount||!isAddress(wallet)} onClick={review}>{busy?'Obteniendo cotización…':'Revisar mi cotización'}</button>
    </>:<>
      <h2 className="mt-5">Revisa tu compra.</h2><div className="crypto-definition"><span>Importe de la orden</span><strong>US$ {quote.amountUsd}</strong></div><div className="crypto-definition"><span>DRACMA cotizados</span><strong className="break-all">{quote.tokenAmount}</strong></div>
      <div className="crypto-definition"><span>Precio aplicado</span><strong>{formatMarketUSD(quote.market.priceUsd)}</strong></div><div className="crypto-definition"><span>Vigencia para crear la factura</span><strong aria-live="off">{seconds>0?`${seconds} s`:'Cotización caducada'}</strong></div>
      <div className="flow-summary break-all"><p>Wallet BSC: {quote.walletAddress}</p><p>Contrato: {quote.market.tokenAddress}</p></div>
      <p className="field-help">La factura conserva esta cantidad y este importe. NOWPayments indica las comisiones y el importe por pagar en criptomonedas. La entrega se procesa desde la wallet de ventas después de verificar el pago.</p>
      <button className="pencil-button flow-next" disabled={busy||(!uncertain&&seconds===0)||!market?.checkoutAvailable} onClick={pay}>{busy?'Preparando factura…':uncertain?'Comprobar la misma factura':'Pagar con NOWPayments'}</button>
      {pendingId&&<a className="flow-back mt-3 break-all" href={`/comprar/?order_id=${pendingId}`}>Ver estado de {pendingId}</a>}
      <button className="flow-back mt-3" disabled={busy||uncertain} onClick={()=>{setQuote(null);attempt.current=null;setError('');}}>← {seconds===0?'Solicitar otra cotización':'Editar la compra'}</button>
    </>}
    {market&&!market.checkoutAvailable&&<p className="flow-note">El precio se puede consultar, pero las compras todavía no están habilitadas.</p>}
    {error&&<p className="flow-error" role="alert">{error}</p>}
    <p className="field-help">Compra mínima: US$ {market?.minimumUsd||'1.00'}. Contrato DRACMA: <span className="break-all">{DRACMA_TOKEN_ADDRESS}</span>.</p>
  </div>;
}
export default function MarketCheckout(){return <Web3Provider><Checkout/></Web3Provider>;}
