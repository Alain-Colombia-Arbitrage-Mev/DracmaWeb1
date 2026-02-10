import { useState, useEffect, useCallback, memo } from 'react';
import { useStore } from '@nanostores/react';
import { useAccount, useConnect, useDisconnect, useConnectors } from 'wagmi';
import { $currentLang, $translations, showAiModal, $aiModalInfo } from '../../stores/appStore';
import { PRESALE_DATA, TOKEN_PRICE, TOKEN_DISTRIBUTION_DATA, BLOCKCHAIN_NETWORKS } from '../../data/constants';
import { PresaleCurrency, PresaleBlockchain } from '../../types';
import type { CountdownDigits } from '../../types';
import Web3Provider from './Web3Provider';

const initialCountdown: CountdownDigits = { days: '00', hours: '00', minutes: '00', seconds: '00' };

// Simulated live purchases for FOMO ticker
const FOMO_NAMES = ['Carlos M.', 'Ana R.', 'David K.', 'Maria L.', 'James T.', 'Sofia P.', 'Ahmed B.', 'Yuki S.', 'Elena V.', 'Pedro G.', 'Linda W.', 'Omar H.', 'Priya S.', 'Marco F.', 'Nina Z.', 'Wei L.', 'Isabella C.', 'Raj P.', 'Fatima A.', 'Lucas B.'];
const FOMO_AMOUNTS = [250, 500, 1000, 2500, 5000, 750, 1500, 3000, 800, 2000, 350, 4000, 600, 1200, 7500];
const FOMO_COUNTRIES = ['🇨🇴', '🇪🇸', '🇺🇸', '🇲🇽', '🇦🇷', '🇧🇷', '🇩🇪', '🇯🇵', '🇦🇪', '🇮🇳', '🇬🇧', '🇫🇷', '🇨🇱', '🇵🇪', '🇨🇦'];
const FOMO_TIMES = ['hace 2 min', 'hace 5 min', 'hace 12 min', 'hace 18 min', 'hace 23 min', 'hace 30 min', 'hace 1h', 'hace 45 min'];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Memoized countdown so FOMO state changes don't re-render it
const CountdownDisplay = memo(function CountdownDisplay({ endDate, t }: { endDate: Date; t: (key: string, fallback?: string) => string }) {
  const [countdown, setCountdown] = useState<CountdownDigits>(initialCountdown);

  useEffect(() => {
    // Calculate immediately on mount
    const calc = () => {
      const now = Date.now();
      const distance = endDate.getTime() - now;
      if (distance < 0) {
        setCountdown({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        return false;
      }
      const d = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
      const h = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
      const m = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const s = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
      setCountdown({ days: d, hours: h, minutes: m, seconds: s });
      return true;
    };

    calc();
    const intervalId = setInterval(() => {
      if (!calc()) clearInterval(intervalId);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [endDate]);

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-4 text-center">
      <div><div id="presale-days" className="presale-countdown-digit">{countdown.days}</div><span className="text-xs font-mono text-brand-text-secondary/70">{t('countdownDays')}</span></div>
      <div><div id="presale-hours" className="presale-countdown-digit">{countdown.hours}</div><span className="text-xs font-mono text-brand-text-secondary/70">{t('countdownHours')}</span></div>
      <div><div id="presale-minutes" className="presale-countdown-digit">{countdown.minutes}</div><span className="text-xs font-mono text-brand-text-secondary/70">{t('countdownMinutes')}</span></div>
      <div><div id="presale-seconds" className="presale-countdown-digit">{countdown.seconds}</div><span className="text-xs font-mono text-brand-text-secondary/70">{t('countdownSeconds')}</span></div>
    </div>
  );
});

function PresaleInner() {
  const currentLang = useStore($currentLang);
  const translations = useStore($translations);
  const t = useCallback((key: string, fallback?: string) => translations[key] || fallback || key, [translations]);

  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

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

  // FOMO state
  const [fomoNotification, setFomoNotification] = useState<{name: string; amount: number; country: string; time: string} | null>(null);
  const [fomoVisible, setFomoVisible] = useState(false);
  const [liveInvestors, setLiveInvestors] = useState(10000);
  const [recentPurchases, setRecentPurchases] = useState(23);

  // FOMO: live purchase ticker
  useEffect(() => {
    const showNotification = () => {
      const notif = {
        name: getRandomItem(FOMO_NAMES),
        amount: getRandomItem(FOMO_AMOUNTS),
        country: getRandomItem(FOMO_COUNTRIES),
        time: getRandomItem(FOMO_TIMES),
      };
      setFomoNotification(notif);
      setFomoVisible(true);
      setTimeout(() => setFomoVisible(false), 4000);
    };

    // First notification after 5 seconds
    const initialTimer = setTimeout(showNotification, 5000);
    // Then every 8-15 seconds
    const interval = setInterval(() => {
      showNotification();
      setLiveInvestors(prev => prev + Math.floor(Math.random() * 3));
      setRecentPurchases(prev => prev + 1);
    }, 8000 + Math.random() * 7000);

    return () => { clearTimeout(initialTimer); clearInterval(interval); };
  }, []);

  const updateActiveBonus = useCallback(() => {
    const now = new Date();
    let activeBonusRate = 0;
    let currentNameKey = "presaleBonusEndedName";
    let currentInfoKey = "presaleBonusEndedInfo";
    for (const tier of PRESALE_DATA.bonusTiers) {
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
  }, []);

  useEffect(() => {
    updateActiveBonus();
    const timer = setInterval(updateActiveBonus, 60000);
    return () => clearInterval(timer);
  }, [updateActiveBonus]);

  // Countdown is now handled by the memoized CountdownDisplay component

  const calculateTokens = useCallback(() => {
    const amountUSD = parseFloat(investmentAmount) || 0;
    const base = amountUSD / TOKEN_PRICE;
    const bonus = base * currentBonus;
    setBaseTokens(base);
    setBonusTokens(bonus);
    setTotalTokensReceived(base + bonus);
  }, [investmentAmount, currentBonus]);

  useEffect(() => { calculateTokens(); }, [calculateTokens]);

  const handlePresetAmount = (amount: number | 'MAX') => {
    setInvestmentAmount(amount === 'MAX' ? '10000' : String(amount));
  };

  const handleAnalyzeInvestment = () => {
    const amountUSD = parseFloat(investmentAmount) || 0;
    if (amountUSD < 100) {
      showAiModal('aiModalTitleInvestment', undefined, `<p class="text-warning-orange">${t('presaleMinInvestment')}</p>`);
      return;
    }
    const prompt = `Como un analista financiero experto en Web3 y IA, evalúa brevemente una inversión de ${amountUSD} USD en la presale de DRACMA en la red ${selectedBlockchain}, que resulta en aproximadamente ${totalTokensReceived.toLocaleString(undefined, {maximumFractionDigits:0})} tokens $DRC (incluyendo un bono de ${t(activeBonusNameKey)}). DRACMA es un holding empresarial descentralizado con proyectos de agricultura, granjas solares para minería, app de empleo, wallet y chat seguro. Ofrece staking del 14% APR. Perspectiva concisa (2-3 frases) y optimista. Idioma: ${currentLang}.`;
    showAiModal('aiModalTitleInvestment', prompt);
  };

  const handleConnectWallet = useCallback(() => {
    const hasInjected = typeof window !== 'undefined' && !!window.ethereum;
    const connector = hasInjected
      ? connectors.find(c => c.id === 'injected')
      : connectors.find(c => c.id === 'walletConnect');
    if (connector) {
      connect({ connector });
    }
  }, [connect, connectors]);

  const getCurrencyLogo = (currency: PresaleCurrency) => {
    switch (currency) {
      case PresaleCurrency.USDC: return 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=032';
      case PresaleCurrency.USDT: return 'https://cryptologos.cc/logos/tether-usdt-logo.png?v=032';
      case PresaleCurrency.WBNB: return 'https://cryptologos.cc/logos/bnb-bnb-logo.png?v=032';
    }
  };

  const overallProgress = (PRESALE_DATA.raisedUSD / PRESALE_DATA.targetUSD) * 100;
  const tokensSold = PRESALE_DATA.raisedUSD / TOKEN_PRICE;
  const tokensProgress = (tokensSold / PRESALE_DATA.totalPresaleTokens) * 100;

  return (
    <section id="presale" className="py-16 bg-brand-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{backgroundImage: "repeating-linear-gradient(45deg, rgba(99,102,241,0.06), rgba(99,102,241,0.06) 1px, transparent 1px, transparent 15px), repeating-linear-gradient(-45deg, rgba(139,92,246,0.04), rgba(139,92,246,0.04) 1px, transparent 1px, transparent 15px)", animation: "backgroundGridScroll 80s linear infinite"}}></div>
      {/* Gradient mesh orbs */}
      <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)', filter: 'blur(80px)'}}></div>
      <div className="absolute bottom-[5%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.03] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)', filter: 'blur(80px)'}}></div>

      {/* FOMO Notification Toast */}
      <div className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${fomoVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
        <div className="rounded-xl shadow-2xl p-4 max-w-xs flex items-center gap-3 backdrop-blur-md" style={{background: 'var(--th-surface)', border: '1px solid var(--th-border-accent)'}}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{background: 'var(--th-secondary-muted)'}}>
            <i className="fas fa-check-circle text-brand-secondary text-lg"></i>
          </div>
          {fomoNotification && (
            <div>
              <p className="text-sm font-semibold text-brand-text-primary">
                {fomoNotification.country} {fomoNotification.name}
              </p>
              <p className="text-xs text-brand-text-secondary">
                {t('fomoJustInvested', 'invirtió')} <span className="font-bold text-brand-secondary">${fomoNotification.amount.toLocaleString()} USD</span>
              </p>
              <p className="text-[10px] text-brand-text-secondary/60">{fomoNotification.time}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Social Proof Bar */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8">
          <div className="flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm" style={{background: 'var(--th-surface)', border: '1px solid var(--th-border)'}}>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white text-[10px] font-bold">C</div>
              <div className="w-6 h-6 rounded-full bg-brand-secondary flex items-center justify-center text-white text-[10px] font-bold">A</div>
              <div className="w-6 h-6 rounded-full bg-brand-accent-gold flex items-center justify-center text-white text-[10px] font-bold">M</div>
            </div>
            <span className="text-sm font-semibold text-brand-text-primary">{liveInvestors.toLocaleString()}+</span>
            <span className="text-xs text-brand-text-secondary">{t('fomoInvestorsActive', 'inversores activos')}</span>
          </div>
          <div className="flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm" style={{background: 'var(--th-surface)', border: '1px solid var(--th-secondary-muted)'}}>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-secondary"></span>
            </span>
            <span className="text-sm font-semibold text-brand-secondary">{recentPurchases}</span>
            <span className="text-xs text-brand-text-secondary">{t('fomoRecentPurchases', 'compras en la última hora')}</span>
          </div>
        </div>

        <div className="text-center mb-12 animate-fade-in-zoom">
          <h2 className="text-4xl md:text-6xl font-bold mb-4 title-main-display brand-primary-text">
            {t('presaleTitle')} <span className="text-brand-secondary text-lg align-top">{t('presaleLive')}</span>
          </h2>
          <div className="w-36 h-1 mx-auto mb-6 rounded-full" style={{background: 'var(--th-primary)', opacity: 0.5}}></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-3xl mx-auto leading-relaxed">{t('presaleSubtitle')}</p>

          {/* Urgency / Scarcity Banner */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5" style={{background: 'var(--th-accent-muted)', border: '1px solid rgba(245,158,11,0.2)'}}>
            <i className="fas fa-fire text-amber-400"></i>
            <span className="text-sm font-medium text-amber-300">{t('fomoUrgency', '⚡ Solo queda el 55% de los tokens — No te quedes afuera')}</span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-10 animate-fade-in-zoom" style={{animationDelay: '0.2s'}}>
          <h3 className="text-xl font-semibold text-center mb-4 title-section-display brand-accent-gold-text tracking-wider">{t('presaleEndsIn')}</h3>
          <CountdownDisplay endDate={PRESALE_DATA.endDate} t={t} />
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 card-ui glass-card-premium p-6 md:p-8 animate-slide-in-left">
            <h3 className="text-2xl font-bold mb-6 title-section-display brand-accent-gold-text relative pb-3 title-underline-animated animate-on-visible">{t('presaleStatusTitle')}</h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-sm items-baseline">
                  <span className="text-brand-text-secondary/80 font-mono">{t('presaleTokenPrice')}</span>
                  <span className="font-bold text-2xl brand-accent-gold-text font-display tracking-tighter">${TOKEN_PRICE.toFixed(2)} <span className="text-xs text-brand-text-secondary/70">USD</span></span>
                </div>
              </div>
              <div className="pt-1">
                <div className="flex justify-between mb-1.5 text-sm">
                  <span className="text-brand-text-secondary/80 font-mono">{t('presaleTotalProgress')}</span>
                  <span className="font-bold brand-primary-text font-mono">{overallProgress.toFixed(1)}%</span>
                </div>
                <div className="token-progress-bar"><div className="token-progress-fill" style={{'--progress-width': `${Math.min(overallProgress, 100)}%`} as React.CSSProperties}></div></div>
                <div className="flex justify-between text-xs text-brand-text-secondary/60 mt-1 font-mono">
                  <span>${PRESALE_DATA.raisedUSD.toLocaleString()}</span>
                  <span>${PRESALE_DATA.targetUSD.toLocaleString()}</span>
                </div>
              </div>
              <div className="pt-1">
                <div className="flex justify-between mb-1.5 text-sm">
                  <span className="text-brand-text-secondary/80 font-mono">{t('presaleTokensSold')}</span>
                  <span className="font-bold brand-secondary-text font-mono">{tokensProgress.toFixed(1)}%</span>
                </div>
                <div className="token-progress-bar"><div className="token-progress-fill bg-gradient-to-r from-brand-secondary to-brand-primary" style={{'--progress-width': `${Math.min(tokensProgress, 100)}%`} as React.CSSProperties}></div></div>
                <div className="flex justify-between text-xs text-brand-text-secondary/60 mt-1 font-mono">
                  <span>{tokensSold.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC</span>
                  <span>{PRESALE_DATA.totalPresaleTokens.toLocaleString()} $DRC</span>
                </div>
              </div>
              <div className="pt-3">
                <h4 className="font-semibold mb-2 title-section-display brand-accent-gold-text text-lg">{t('presaleActiveBonus')}</h4>
                <div className="p-4 rounded-lg text-center shadow-sm" style={{background: 'var(--th-primary-muted)', border: '1px solid var(--th-border-accent)'}}>
                  <div className="flex items-center justify-center">
                    <i className="fas fa-star text-brand-accent-gold mr-2 animate-sparkle text-lg"></i>
                    <span className="text-xl font-bold text-success-green font-display tracking-wider">{t(activeBonusNameKey)}</span>
                  </div>
                  <p className="text-xs text-brand-text-secondary/70 font-mono mt-1.5">{t(activeBonusInfoKey)}</p>
                </div>
              </div>

              {/* FOMO: Recent activity summary */}
              <div className="rounded-lg p-3 mt-4" style={{background: 'var(--th-secondary-muted)', border: '1px solid var(--th-border)'}}>
                <p className="text-xs font-semibold text-brand-text-primary flex items-center gap-1.5 mb-2">
                  <i className="fas fa-chart-line text-brand-secondary"></i> {t('fomoActivityTitle', 'Actividad reciente')}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-brand-text-secondary">🇨🇴 Carlos M.</span>
                    <span className="font-semibold text-brand-secondary">$2,500 USD</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-brand-text-secondary">🇪🇸 Ana R.</span>
                    <span className="font-semibold text-brand-secondary">$1,000 USD</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-brand-text-secondary">🇺🇸 David K.</span>
                    <span className="font-semibold text-brand-secondary">$5,000 USD</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-brand-text-secondary/60 font-mono pt-2 space-y-1">
                <p><i className="fas fa-info-circle mr-1 text-brand-primary"></i> {t('presaleMinInvestment')}</p>
                <p><i className="fas fa-info-circle mr-1 text-brand-primary"></i> {t('presaleTokenDistribution')}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 card-ui glass-card-premium p-6 md:p-8 animate-slide-in-right">
            <h3 className="text-2xl font-bold mb-6 title-main-display brand-primary-text relative pb-3 title-underline-animated animate-on-visible">{t('presaleInvestTitle')}</h3>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3 rounded-lg px-4 py-2.5" style={{background: 'var(--th-surface-raised)', border: '1px solid var(--th-border)'}}>
                  <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png?v=032" alt="BSC" className="h-6 w-6" />
                  <span className="text-sm font-semibold text-brand-text-primary">Binance Smart Chain (BSC)</span>
                  <i className="fas fa-check-circle text-brand-secondary ml-auto"></i>
                </div>
              </div>
              <div>
                <label className="presale-step-label">{t('presaleSelectPayment')}</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(PresaleCurrency).map(currency => (
                    <button key={currency} onClick={() => setSelectedCurrency(currency)} className={`payment-method-btn ${selectedCurrency === currency ? 'active' : ''}`}>
                      {selectedCurrency === currency && <i className="fas fa-check-circle text-brand-primary animated-check mr-1.5"></i>}
                      <img src={getCurrencyLogo(currency)} className="h-6 mr-1.5" alt={`${currency} logo`}/>
                      <span className="text-sm font-medium text-brand-text-primary">{currency}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="presale-step-label">{t('presaleEnterAmount')} ({selectedCurrency} on BSC):</label>
                <div className="relative flex items-center">
                  <i className="fas fa-coins text-brand-text-secondary/50 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-lg"></i>
                  <input type="number" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} className="presale-input presale-input-with-icon flex-grow" placeholder="0.00" />
                  <span className="absolute right-4 text-brand-text-secondary/60 font-mono text-sm">{selectedCurrency}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {[100, 500, 1000, 'MAX' as const].map(val => (
                    <button key={val} onClick={() => handlePresetAmount(val)} className="btn-preset-amount text-xs py-2">{val === 'MAX' ? t('btnMax') : `$${val}`}</button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg p-4 space-y-2.5" style={{background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)'}}>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-text-secondary/90">{t('presaleBaseTokens')}</span>
                  <span className="font-bold brand-accent-gold-text text-lg font-mono">{baseTokens.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-text-secondary/90">{t('presaleCurrentBonus')} ({currentBonus*100}%):</span>
                  <span className="font-bold text-success-green text-lg font-mono">+{bonusTokens.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
                <hr className="my-2" style={{borderColor: 'var(--th-border)'}}/>
                <div className="flex justify-between items-center">
                  <span className="text-brand-text-primary font-semibold text-lg">{t('presaleTotalReceive')}</span>
                  <span className="font-bold brand-accent-gold-text text-3xl font-display">{totalTokensReceived.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
              </div>
              <button onClick={handleAnalyzeInvestment} className="btn-ai-feature w-full">
                <i className="fas fa-magic mr-2"></i> <span>{t('btnAnalyzeInvestment')}</span>
              </button>
              <div className="pt-2">
                {isConnected ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 rounded-lg py-2.5 px-4" style={{background: 'var(--th-secondary-muted)', border: '1px solid var(--th-border-accent)'}}>
                      <i className="fas fa-check-circle text-brand-secondary"></i>
                      <span className="text-sm font-mono text-brand-secondary">{truncatedAddress}</span>
                      <button onClick={() => disconnect()} className="text-xs text-brand-text-secondary hover:text-brand-primary ml-2 underline">{t('btnDisconnect', 'Desconectar')}</button>
                    </div>
                    <button className="w-full btn-primary py-3.5 text-lg flex items-center justify-center animate-button-pulse-primary">
                      <i className="fas fa-paper-plane mr-2.5"></i> <span>{t('btnConfirmPurchase', 'Confirmar Compra')} (BSC)</span>
                    </button>
                  </div>
                ) : (
                  <button onClick={handleConnectWallet} disabled={isConnecting} className="w-full btn-primary py-3.5 text-lg flex items-center justify-center animate-button-pulse-primary">
                    {isConnecting
                      ? <><i className="fas fa-spinner fa-spin mr-2.5"></i><span>{t('walletConnecting', 'Conectando...')}</span></>
                      : <><i className="fas fa-wallet mr-2.5"></i><span>{t('btnConnectAndConfirm')} (BSC)</span></>
                    }
                  </button>
                )}
                {/* FOMO under CTA */}
                <p className="text-xs text-center mt-2 text-brand-accent-coral font-semibold">
                  <i className="fas fa-users mr-1"></i> {t('fomoCTAMessage', `${liveInvestors}+ personas ya invirtieron. ¿Y tú?`)}
                </p>
                <div className="text-xs text-brand-text-secondary/60 mt-2.5 text-center font-mono" dangerouslySetInnerHTML={{ __html: t('presaleAgreement').replace(/<a>/g, '<a href="#" class="brand-primary-text hover:underline">').replace(/<\/a>/g, '</a>') }} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 max-w-5xl mx-auto animate-fade-in-zoom">
          <h3 className="text-2xl font-bold mb-10 text-center title-section-display brand-accent-gold-text relative pb-3 title-underline-animated animate-on-visible">{t('tokenDistributionTitle')}</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {TOKEN_DISTRIBUTION_DATA.map(item => (
              <div key={item.nameKey} className="card-ui p-5 glassmorphism-light hover:shadow-lg donut-chart-card" onMouseEnter={() => setHoveredDonut(item.nameKey)} onMouseLeave={() => setHoveredDonut(null)}>
                <div className="donut-chart" style={{background: `conic-gradient(${item.colorClass.replace('bg-','var(--color-').replace(/-(?=[^-]*$)/, '-')})) 0% ${item.percentage}%, var(--color-surface-medium) ${item.percentage}% 100%)`}}>
                  <div className="donut-hole !bg-surface-light"><span className="donut-text">{item.percentage}%</span></div>
                </div>
                <h4 className={`font-semibold mb-1.5 text-lg transition-colors duration-300 ${hoveredDonut === item.nameKey ? 'underline' : ''}`}>{t(item.nameKey)}</h4>
                <p className="text-brand-text-secondary/80 text-xs font-mono">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Presale() {
  return (
    <Web3Provider>
      <PresaleInner />
    </Web3Provider>
  );
}
