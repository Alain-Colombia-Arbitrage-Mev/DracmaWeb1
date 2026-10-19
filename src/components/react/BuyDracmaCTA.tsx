import {useMarketPrice} from './useMarketPrice';
import {formatMarketUSD} from '../../services/marketCheckout';

export default function BuyDracmaCTA(){
  const {market,loading,error}=useMarketPrice();
  return <section className="dracma-buy-banner" aria-labelledby="buy-dracma-heading">
    <div><p className="buy-eyebrow">DRACMA · BNB SMART CHAIN</p><h2 id="buy-dracma-heading">Compra DRACMA al precio de mercado.</h2><p>Cotiza tu compra y paga con crypto a través de NOWPayments.</p></div>
    <div className="buy-market-price"><span>Precio de referencia · Dexscreener</span><strong>{market?formatMarketUSD(market.price.priceUsd):'—'}</strong><small aria-live="polite">{loading?'Consultando precio…':error||`Consultado ${new Date(market!.price.observedAt).toLocaleTimeString('es')} · actualización cada 15 s`}</small></div>
    <a className="pencil-button" href="/comprar/">Comprar DRACMA <span aria-hidden="true">→</span></a>
  </section>;
}
