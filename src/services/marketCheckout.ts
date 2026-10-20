export type MarketSnapshot = {priceUsd:string;tokenAddress:string;pairAddress:string;chain:string;source:string;sourceUrl:string;observedAt:string;expiresAt:string};
export type MarketState = {price:MarketSnapshot;checkoutAvailable:boolean;minimumUsd:string;maximumUsd:string;quoteTtlSeconds:number;refreshSeconds:number;tokenDecimals:number;chainId:number};
export type MarketQuote = {id:string;walletAddress:string;amountUsd:string;tokenAmount:string;tokenDecimals:number;market:MarketSnapshot;createdAt:string;expiresAt:string};
export type PurchaseOrder = {id:string;quote:MarketQuote;status:string;invoiceUrl?:string;txHash?:string;createdAt:string;updatedAt:string};
export type PaymentOptions = {provider:'nowpayments';selection:'hosted';currencies:{code:string;name:string;network:string}[];observedAt:string;expiresAt:string};
export class CheckoutError extends Error {
  constructor(message:string,public code:string,public orderId?:string){super(message);}
}
const address=/^0x[a-fA-F0-9]{40}$/;
const decimal=/^\d+(?:\.\d+)?$/;
const date=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
function snapshot(p:any):p is MarketSnapshot{return p&&decimal.test(p.priceUsd)&&Number(p.priceUsd)>0&&p.tokenAddress?.toLowerCase()==='0x8a9f07fdbc75144c9207373597136c6e280a872d'&&p.pairAddress?.toLowerCase()==='0x055486ea52317a38c15259b1b65f1b9003bfafc2'&&p.chain==='bsc'&&p.source==='dexscreener'&&date(p.observedAt)&&date(p.expiresAt);}
export function validMarketQuote(q:any):q is MarketQuote{return q&&/^q_[a-f0-9]{32}$/.test(q.id)&&address.test(q.walletAddress)&&decimal.test(q.amountUsd)&&decimal.test(q.tokenAmount)&&q.tokenDecimals===18&&snapshot(q.market)&&date(q.createdAt)&&date(q.expiresAt);}
function order(o:any):o is PurchaseOrder{return o&&/^o_[a-f0-9]{32}$/.test(o.id)&&validMarketQuote(o.quote)&&typeof o.status==='string'&&date(o.createdAt)&&date(o.updatedAt);}
function verified<T>(data:T,valid:boolean):T{if(!valid)throw new CheckoutError('La respuesta de compra no se pudo verificar.','invalid_response');return data;}
const base=(import.meta.env.PUBLIC_CHECKOUT_API_BASE_URL||'').replace(/\/$/,'');
async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(base+path,{...init,cache:'no-store',signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data)throw new CheckoutError(data?.error||'El servicio de compra no está disponible.',data?.code||'unavailable',data?.orderId);
    return data as T;
  }catch(error){if(error instanceof CheckoutError)throw error;throw new CheckoutError('No se pudo conectar con el servicio de compra.','unavailable');}
  finally{clearTimeout(timeout);}
}
export async function getMarket(){const data=await request<MarketState>('/api/v1/market/price');return verified(data,snapshot(data.price)&&Date.parse(data.price.expiresAt)>Date.now()&&data.chainId===56&&data.tokenDecimals===18&&typeof data.checkoutAvailable==='boolean'&&decimal.test(data.minimumUsd)&&decimal.test(data.maximumUsd));}
export async function getPaymentOptions(){
  const data=await request<PaymentOptions>('/api/v1/payments/currencies');
  const code=(value:unknown)=>typeof value==='string'&&/^[a-z0-9_]{1,40}$/.test(value);
  return verified(data,data?.provider==='nowpayments'&&data.selection==='hosted'&&date(data.observedAt)&&date(data.expiresAt)&&Date.parse(data.expiresAt)>Date.now()&&Array.isArray(data.currencies)&&data.currencies.length>0&&data.currencies.length<=2000&&data.currencies.every(c=>c&&code(c.code)&&code(c.network)&&typeof c.name==='string'&&c.name.length>0&&c.name.length<=120));
}
export async function createMarketQuote(walletAddress:string,amountUsd:string){const data=await request<MarketQuote>('/api/v1/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({walletAddress,amountUsd})});return verified(data,validMarketQuote(data)&&data.walletAddress.toLowerCase()===walletAddress.toLowerCase());}
export async function createMarketInvoice(quoteId:string,receiptToken:string,key:string){const data=await request<PurchaseOrder>('/api/v1/checkout/invoices',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({quoteId,receiptToken})});return verified(data,order(data)&&data.quote.id===quoteId);}
export async function getPurchaseOrder(id:string,receiptToken:string){const data=await request<PurchaseOrder>(`/api/v1/orders/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${receiptToken}`}});return verified(data,order(data)&&data.id===id);}
export function randomReceiptToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export function formatMarketUSD(price:string){return `US$ ${price.replace('.',',')}`;}
