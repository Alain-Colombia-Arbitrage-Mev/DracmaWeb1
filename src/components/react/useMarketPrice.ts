import {useEffect,useState} from 'react';
import {getMarket,type MarketState} from '../../services/marketCheckout';

export function useMarketPrice(){
  const [market,setMarket]=useState<MarketState|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  useEffect(()=>{
    let active=true,pending=false;
    const refresh=async()=>{if(pending||document.hidden)return;pending=true;try{const value=await getMarket();if(active){setMarket(value);setError('');}}catch{if(active){setMarket(null);setError('Cotización de mercado no disponible.');}}finally{pending=false;if(active)setLoading(false);}};
    void refresh();const timer=setInterval(refresh,15000);document.addEventListener('visibilitychange',refresh);
    return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  return {market,loading,error};
}
