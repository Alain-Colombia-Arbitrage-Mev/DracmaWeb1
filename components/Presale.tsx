
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { LanguageContext, AiModalContext } from '../App';
import { PresaleData, CountdownDigits, PresaleCurrency, TokenDistributionItem, PresaleBlockchain, BlockchainNetwork } from '../types';
import { TOKEN_PRICE, TOKEN_DISTRIBUTION_DATA, BLOCKCHAIN_NETWORKS } from '../constants';

interface PresaleProps {
  presaleData: PresaleData;
  onConnectWallet: (selectedNetwork?: PresaleBlockchain) => void;
}

const initialCountdown: CountdownDigits = { days: '00', hours: '00', minutes: '00', seconds: '00' };

export const Presale: React.FC<PresaleProps> = ({ presaleData, onConnectWallet }) => {
  const { getTranslation, currentLang } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext);

  const [countdown, setCountdown] = useState<CountdownDigits>(initialCountdown);
  const [currentBonus, setCurrentBonus] = useState(0);
  const [activeBonusNameKey, setActiveBonusNameKey] = useState("presaleBonusEndedName");
  const [activeBonusInfoKey, setActiveBonusInfoKey] = useState("presaleBonusEndedInfo");
  
  const [selectedBlockchain, setSelectedBlockchain] = useState<PresaleBlockchain>(BLOCKCHAIN_NETWORKS[0].id);
  const [selectedCurrency, setSelectedCurrency] = useState<PresaleCurrency>(PresaleCurrency.USDC);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [baseTokens, setBaseTokens] = useState<number>(0);
  const [bonusTokens, setBonusTokens] = useState<number>(0);
  const [totalTokensReceived, setTotalTokensReceived] = useState<number>(0);
  const [hoveredDonut, setHoveredDonut] = useState<string | null>(null);


  const updateActiveBonus = useCallback(() => {
    const now = new Date();
    let activeBonusRate = 0;
    let currentNameKey = "presaleBonusEndedName";
    let currentInfoKey = "presaleBonusEndedInfo";

    for (const tier of presaleData.bonusTiers) {
        if (now >= tier.start && now <= tier.end) {
            activeBonusRate = tier.rate;
            currentNameKey = tier.nameKey;
            currentInfoKey = tier.infoKey;
            break;
        }
    }
    setCurrentBonus(activeBonusRate);
    setActiveBonusNameKey(currentNameKey);
    setActiveBonusInfoKey(currentInfoKey);
  }, [presaleData.bonusTiers]);


  useEffect(() => {
    updateActiveBonus();
    const timer = setInterval(updateActiveBonus, 60000); 
    return () => clearInterval(timer);
  }, [updateActiveBonus]);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      const distance = presaleData.endDate.getTime() - now;

      if (distance < 0) {
        setCountdown({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        updateActiveBonus(); 
        clearInterval(intervalId);
        return;
      }

      const d = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
      const h = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
      const m = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const s = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
      
      setCountdown(prev => {
        if (prev.days !== d || prev.hours !== h || prev.minutes !== m || prev.seconds !== s) {
          return { days:d, hours:h, minutes:m, seconds:s };
        }
        return prev;
      });

    }, 1000);
    return () => clearInterval(intervalId);
  }, [presaleData.endDate, updateActiveBonus]);

  const animateDigit = useCallback((currentVal: string, newVal: string, elId: string) => {
    const el = document.getElementById(elId);
    if (el) {
        if (el.textContent !== newVal) { 
            el.classList.remove('animate-digit-flip');
            void el.offsetWidth; 
            el.classList.add('animate-digit-flip');
            el.textContent = newVal;
        } else if (!el.textContent) { 
             el.textContent = newVal;
        }
    }
  },[]);

  useEffect(() => animateDigit(countdown.days, countdown.days, 'presale-days'), [countdown.days, animateDigit]);
  useEffect(() => animateDigit(countdown.hours, countdown.hours, 'presale-hours'), [countdown.hours, animateDigit]);
  useEffect(() => animateDigit(countdown.minutes, countdown.minutes, 'presale-minutes'), [countdown.minutes, animateDigit]);
  useEffect(() => animateDigit(countdown.seconds, countdown.seconds, 'presale-seconds'), [countdown.seconds, animateDigit]);


  const calculateTokens = useCallback(() => {
    const amountUSD = parseFloat(investmentAmount) || 0;
    const base = amountUSD / TOKEN_PRICE;
    const bonus = base * currentBonus;
    const total = base + bonus;
    setBaseTokens(base);
    setBonusTokens(bonus);
    setTotalTokensReceived(total);
  }, [investmentAmount, currentBonus]);

  useEffect(() => {
    calculateTokens();
  }, [calculateTokens]);

  const handleInvestmentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvestmentAmount(e.target.value);
  };
  
  const handlePresetAmount = (amount: number | 'MAX') => {
    if (amount === 'MAX') {
      setInvestmentAmount('10000'); // Simulate max
    } else {
      setInvestmentAmount(String(amount));
    }
  };

  const handleAnalyzeInvestment = () => {
    const amountUSD = parseFloat(investmentAmount) || 0;
    if (amountUSD < 100) {
        showAiModal('aiModalTitleInvestment', undefined, `<p class="text-warning-orange">${getTranslation('presaleMinInvestment')}</p>`);
        return;
    }
    const prompt = `Como un analista financiero experto en Web3 y IA, evalúa brevemente una inversión de ${amountUSD} USD en la presale de DRACMA en la red ${selectedBlockchain}, que resulta en aproximadamente ${totalTokensReceived.toLocaleString(undefined, {maximumFractionDigits:0})} tokens $DRC (incluyendo un bono de ${getTranslation(activeBonusNameKey)}). DRACMA es un holding empresarial descentralizado respaldado por activos reales y potenciado por IA. Ofrece staking del 14% APR y dividendos. Proporciona una perspectiva concisa (2-3 frases) y optimista sobre el potencial de esta inversión. Idioma de la respuesta: ${currentLang}.`;
    showAiModal('aiModalTitleInvestment', prompt);
  };

  const overallProgress = (presaleData.raisedUSD / presaleData.targetUSD) * 100;
  const tokensSold = presaleData.raisedUSD / TOKEN_PRICE;
  const tokensProgress = (tokensSold / presaleData.totalPresaleTokens) * 100;

  return (
    <section id="presale" className="py-20 bg-brand-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{backgroundImage: "repeating-linear-gradient(45deg, rgba(59,130,246,0.05), rgba(59,130,246,0.05) 1px, transparent 1px, transparent 15px), repeating-linear-gradient(-45deg, rgba(16,185,129,0.05), rgba(16,185,129,0.05) 1px, transparent 1px, transparent 15px)", animation: "backgroundGridScroll 80s linear infinite"}}></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-4xl md:text-6xl font-bold mb-4 title-main-display brand-primary-text">
            {getTranslation('presaleTitle')} <span className="text-brand-secondary text-lg align-top">{getTranslation('presaleLive')}</span>
          </h2>
          <div className="w-36 h-1.5 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent-gold mx-auto mb-8 rounded-full shadow-primary-glow"></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-3xl mx-auto leading-relaxed">
            {getTranslation('presaleSubtitle')}
          </p>
        </div>
        <div className="max-w-2xl mx-auto mb-12 animate-fade-in-zoom" style={{animationDelay: '0.2s'}}>
          <h3 className="text-xl font-semibold text-center mb-4 title-section-display brand-accent-gold-text tracking-wider">
            {getTranslation('presaleEndsIn')}
          </h3>
          <div className="grid grid-cols-4 gap-2 md:gap-4 text-center">
            <div><div id="presale-days" className="presale-countdown-digit">{countdown.days}</div><span className="text-xs font-mono text-brand-text-secondary/70">{getTranslation('countdownDays')}</span></div>
            <div><div id="presale-hours" className="presale-countdown-digit">{countdown.hours}</div><span className="text-xs font-mono text-brand-text-secondary/70">{getTranslation('countdownHours')}</span></div>
            <div><div id="presale-minutes" className="presale-countdown-digit">{countdown.minutes}</div><span className="text-xs font-mono text-brand-text-secondary/70">{getTranslation('countdownMinutes')}</span></div>
            <div><div id="presale-seconds" className="presale-countdown-digit">{countdown.seconds}</div><span className="text-xs font-mono text-brand-text-secondary/70">{getTranslation('countdownSeconds')}</span></div>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 card-ui glassmorphism-light p-6 md:p-8 animate-slide-in-left">
            <h3 className="text-2xl font-bold mb-6 title-section-display brand-accent-gold-text relative pb-3 title-underline-animated animate-on-visible">
              {getTranslation('presaleStatusTitle')}
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-sm items-baseline">
                  <span className="text-brand-text-secondary/80 font-mono">{getTranslation('presaleTokenPrice')}</span>
                  <span className="font-bold text-2xl brand-accent-gold-text font-display tracking-tighter">${TOKEN_PRICE.toFixed(2)} <span className="text-xs text-brand-text-secondary/70">USD</span></span>
                </div>
              </div>
              <div className="pt-1">
                <div className="flex justify-between mb-1.5 text-sm">
                  <span className="text-brand-text-secondary/80 font-mono">{getTranslation('presaleTotalProgress')}</span>
                  <span id="total-progress-percentage" className="font-bold brand-primary-text font-mono">{overallProgress.toFixed(1)}%</span>
                </div>
                <div className="token-progress-bar"><div id="total-progress-fill" className="token-progress-fill" style={{'--progress-width': `${Math.min(overallProgress, 100)}%`} as React.CSSProperties}></div></div>
                <div className="flex justify-between text-xs text-brand-text-secondary/60 mt-1 font-mono">
                  <span id="raised-amount-display">${presaleData.raisedUSD.toLocaleString()}</span>
                  <span id="target-amount-display">${presaleData.targetUSD.toLocaleString()}</span>
                </div>
              </div>
              <div className="pt-1">
                <div className="flex justify-between mb-1.5 text-sm">
                  <span className="text-brand-text-secondary/80 font-mono">{getTranslation('presaleTokensSold')}</span>
                  <span id="tokens-sold-percentage" className="font-bold brand-secondary-text font-mono">{tokensProgress.toFixed(1)}%</span>
                </div>
                <div className="token-progress-bar"><div id="tokens-sold-fill" className="token-progress-fill bg-gradient-to-r from-brand-secondary to-brand-primary" style={{'--progress-width': `${Math.min(tokensProgress, 100)}%`} as React.CSSProperties}></div></div>
                <div className="flex justify-between text-xs text-brand-text-secondary/60 mt-1 font-mono">
                  <span id="tokens-sold-display">{tokensSold.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC</span>
                  <span id="total-presale-tokens-display">{presaleData.totalPresaleTokens.toLocaleString()} $DRC</span>
                </div>
              </div>
              <div className="pt-3">
                <h4 className="font-semibold mb-2 title-section-display brand-accent-gold-text text-lg">{getTranslation('presaleActiveBonus')}</h4>
                <div id="active-bonus-display" className="bg-brand-primary/5 p-4 rounded-lg text-center border border-brand-primary/20 shadow-sm">
                  <div className="flex items-center justify-center">
                     <i className="fas fa-star text-brand-accent-gold mr-2 animate-sparkle text-lg"></i>
                     <span className="text-xl font-bold text-success-green font-display tracking-wider">{getTranslation(activeBonusNameKey)}</span>
                  </div>
                  <p className="text-xs text-brand-text-secondary/70 font-mono mt-1.5">{getTranslation(activeBonusInfoKey)}</p>
                </div>
              </div>
              <div className="text-xs text-brand-text-secondary/60 font-mono pt-2 space-y-1">
                <p><i className="fas fa-info-circle mr-1 text-brand-primary"></i> {getTranslation('presaleMinInvestment')}</p>
                <p><i className="fas fa-info-circle mr-1 text-brand-primary"></i> {getTranslation('presaleTokenDistribution')}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 card-ui glassmorphism-light p-6 md:p-8 animate-slide-in-right">
            <h3 className="text-2xl font-bold mb-6 title-main-display brand-primary-text relative pb-3 title-underline-animated animate-on-visible">
                {getTranslation('presaleInvestTitle')}
            </h3>
            <div className="space-y-6">
              <div>
                <label className="presale-step-label">{getTranslation('presaleSelectBlockchain')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BLOCKCHAIN_NETWORKS.map(network => (
                    <button 
                      key={network.id}
                      onClick={() => setSelectedBlockchain(network.id)}
                      className={`blockchain-method-btn ${selectedBlockchain === network.id ? 'active' : ''}`}
                      title={getTranslation(network.nameKey)}
                    >
                       {selectedBlockchain === network.id && <i className="fas fa-check-circle text-brand-primary animated-check mr-1.5"></i>}
                      {network.logoUrl ? (
                        <img src={network.logoUrl} alt={getTranslation(network.nameKey)} className="blockchain-icon" />
                      ) : (
                        <i className={`${network.iconClass} blockchain-icon text-xl ${selectedBlockchain !== network.id ? 'ml-auto' : ''}`}></i>
                      )}
                      <span className={`text-sm font-medium text-brand-text-primary ${selectedBlockchain !== network.id ? 'mr-auto' : ''}`}>{getTranslation(network.nameKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="presale-step-label">{getTranslation('presaleSelectPayment')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.values(PresaleCurrency).map(currency => (
                    <button 
                      key={currency}
                      data-currency={currency} 
                      onClick={() => setSelectedCurrency(currency)}
                      className={`payment-method-btn ${selectedCurrency === currency ? 'active' : ''}`}
                    >
                       {selectedCurrency === currency && <i className="fas fa-check-circle text-brand-primary animated-check mr-1.5"></i>}
                      <img src={`https://cryptologos.cc/logos/${currency === PresaleCurrency.ETH ? 'ethereum-eth' : currency === PresaleCurrency.USDC ? 'usd-coin-usdc' : 'tether-usdt'}-logo.png?v=032`} className={`h-6 group-hover:scale-110 transition-transform ${selectedCurrency === currency ? 'mr-1.5' : 'mr-2'}`} alt={`${currency} logo`}/> 
                      <span className="text-sm font-medium text-brand-text-primary">{currency}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="presale-step-label">
                  {getTranslation('presaleEnterAmount')} ({selectedCurrency} on {getTranslation(BLOCKCHAIN_NETWORKS.find(n=>n.id===selectedBlockchain)?.nameKey || '') }):
                </label>
                <div className="relative flex items-center">
                  <i className="fas fa-coins text-brand-text-secondary/50 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-lg"></i>
                  <input 
                    type="number" 
                    id="adv-presale-amount-input" 
                    value={investmentAmount}
                    onChange={handleInvestmentAmountChange}
                    className="presale-input presale-input-with-icon flex-grow !text-brand-text-primary !placeholder-brand-text-secondary/70" 
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 text-brand-text-secondary/60 font-mono text-sm">{selectedCurrency}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {[100, 500, 1000, 'MAX'].map(val => (
                     <button key={val} onClick={() => handlePresetAmount(val as number | 'MAX')} className="btn-preset-amount text-xs py-2">
                       {val === 'MAX' ? getTranslation('btnMax') : val}
                     </button>
                  ))}
                </div>
              </div>
              <div className="bg-brand-background/50 border border-gray-200/70 rounded-lg p-4 space-y-2.5 shadow-inner">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-text-secondary/90">{getTranslation('presaleBaseTokens')}</span>
                  <span id="adv-base-tokens" className="font-bold brand-accent-gold-text text-lg font-mono">{baseTokens.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-text-secondary/90">{getTranslation('presaleCurrentBonus')} ({currentBonus*100}%):</span>
                  <span id="adv-bonus-tokens" className="font-bold text-success-green text-lg font-mono">+{bonusTokens.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
                <hr className="border-gray-300/50 my-2"/>
                <div className="flex justify-between items-center">
                  <span className="text-brand-text-primary font-semibold text-lg">{getTranslation('presaleTotalReceive')}</span>
                  <span id="adv-total-tokens-received" className="font-bold brand-accent-gold-text text-3xl font-display">{totalTokensReceived.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
              </div>
              <button onClick={handleAnalyzeInvestment} className="btn-ai-feature w-full">
                <i className="fas fa-magic mr-2"></i> <span>{getTranslation('btnAnalyzeInvestment')}</span>
              </button>
              
              <div className="pt-2">
                <button 
                    onClick={() => onConnectWallet(selectedBlockchain)} 
                    className="w-full btn-primary py-3.5 text-lg flex items-center justify-center animate-button-pulse-primary"
                >
                  <i className="fas fa-wallet mr-2.5"></i> <span>{getTranslation('btnConnectAndConfirm')} ({getTranslation(BLOCKCHAIN_NETWORKS.find(n=>n.id===selectedBlockchain)?.nameKey || '')})</span>
                </button>
                <div 
                    className="text-xs text-brand-text-secondary/60 mt-2.5 text-center font-mono"
                    dangerouslySetInnerHTML={{ __html: getTranslation('presaleAgreement').replace(/<a>/g, '<a href="#" class="brand-primary-text hover:underline">').replace(/<\/a>/g, '</a>') }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 max-w-5xl mx-auto animate-fade-in-zoom">
          <h3 className="text-2xl font-bold mb-10 text-center title-section-display brand-accent-gold-text relative pb-3 title-underline-animated animate-on-visible">
              {getTranslation('tokenDistributionTitle')}
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {TOKEN_DISTRIBUTION_DATA.map(item => (
              <div 
                key={item.nameKey} 
                className="card-ui p-5 glassmorphism-light hover:shadow-lg donut-chart-card"
                onMouseEnter={() => setHoveredDonut(item.nameKey)}
                onMouseLeave={() => setHoveredDonut(null)}
              >
                <div className="donut-chart" style={{background: `conic-gradient(${item.colorClass.replace('bg-','var(--').replace('text-','var(--').replace('-gold','-accent-gold')}) 0% ${item.percentage}%, var(--surface-medium) ${item.percentage}% 100%)`}}>
                  <div className="donut-hole !bg-surface-light"><span className={`donut-text ${item.colorClass.replace('bg-','brand-').replace('-text','-text').replace('-gold','-accent-gold-text')}`}>{item.percentage}%</span></div>
                </div>
                 <h4 className={`font-semibold mb-1.5 text-lg donut-chart-title transition-colors duration-300 ${
                    hoveredDonut === item.nameKey 
                    ? item.colorClass.replace('bg-','brand-').replace('-text','-text').replace('-gold','-accent-gold-text') + ' underline'
                    : item.colorClass.replace('bg-','brand-').replace('-text','-text').replace('-gold','-accent-gold-text')
                } ${
                    hoveredDonut === item.nameKey && item.nameKey === 'distPresale' ? '!text-brand-accent-gold' :
                    hoveredDonut === item.nameKey && item.nameKey === 'distLiquidity' ? '!text-brand-secondary' :
                    hoveredDonut === item.nameKey && item.nameKey === 'distStaking' ? '!text-brand-primary' :
                    hoveredDonut === item.nameKey && item.nameKey === 'distEcosystem' ? '!text-green-500' : ''
                }`}>
                    {getTranslation(item.nameKey)}
                </h4>
                <p className="text-brand-text-secondary/80 text-xs font-mono">{getTranslation(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};