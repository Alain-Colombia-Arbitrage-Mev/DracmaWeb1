
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { getAddress, isAddress } from 'viem';
import { LanguageContext, AiModalContext } from '../App';
import { WalletContext } from '../contexts/WalletContext';
import { PresaleData, CountdownDigits, TransactionStatus } from '../types';
import { TOKEN_PRICE, TOKEN_DISTRIBUTION_DATA, BSCSCAN_TX_URL, BSCSCAN_ADDRESS_URL, SALE_TOKEN_ADDRESS } from '../constants';
import {
  createNowPaymentsInvoice,
  getNowPaymentsPayment,
  getPresalePricing,
  getPresaleQuote,
  NowPaymentsInvoiceResponse,
  NowPaymentsPaymentStatus,
  PresaleQuote,
  PricingState,
} from '../services/nowPaymentsService';

interface PresaleProps {
  presaleData: PresaleData;
}

const initialCountdown: CountdownDigits = { days: '00', hours: '00', minutes: '00', seconds: '00' };
const TRACKABLE_PAYMENT_STATES = new Set([
  'creating_invoice',
  'invoice_created',
  'waiting',
  'confirming',
  'confirmed',
  'sending',
  'partially_paid',
]);

const formatPaymentStatusLabel = (status?: string | null) => {
  const labels: Record<string, string> = {
    creating_invoice: 'Creando invoice',
    invoice_created: 'Checkout creado',
    waiting: 'Esperando pago',
    confirming: 'Confirmando pago',
    confirmed: 'Pago confirmado',
    sending: 'Procesando pago',
    partially_paid: 'Pago parcial',
    paid_pending_distribution: 'Pago confirmado',
    distributed: 'Tokens enviados',
    distribution_failed: 'Distribucion fallida',
    failed: 'Pago fallido',
    expired: 'Pago expirado',
    refunded: 'Pago reembolsado',
    validation_error: 'Validacion fallida',
  };

  if (!status) return 'Consultando estado';
  return labels[status] || status.replace(/_/g, ' ');
};

const shouldPollPaymentStatus = (payment: NowPaymentsPaymentStatus | null) => {
  if (!payment) return true;
  return TRACKABLE_PAYMENT_STATES.has(payment.status) || TRACKABLE_PAYMENT_STATES.has(payment.nowPaymentsStatus || '');
};

// --- Transaction Status Display ---
const TransactionStatusUI: React.FC = () => {
  const { getTranslation } = useContext(LanguageContext);
  const { txState, resetTxState } = useContext(WalletContext);

  if (txState.status === TransactionStatus.IDLE) return null;

  const statusConfig: Record<string, { icon: string; textKey: string; color: string; spin?: boolean }> = {
    [TransactionStatus.AWAITING_APPROVAL]: { icon: 'fas fa-shield-alt', textKey: 'txPleaseApprove', color: 'text-yellow-500', spin: false },
    [TransactionStatus.APPROVAL_PENDING]: { icon: 'fas fa-spinner', textKey: 'txApprovePending', color: 'text-yellow-500', spin: true },
    [TransactionStatus.AWAITING_PURCHASE]: { icon: 'fas fa-wallet', textKey: 'txPleaseConfirm', color: 'text-brand-primary', spin: false },
    [TransactionStatus.PURCHASE_PENDING]: { icon: 'fas fa-spinner', textKey: 'txBuyPending', color: 'text-brand-primary', spin: true },
  };

  if (txState.status === TransactionStatus.SUCCESS) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-3 animate-fade-in-zoom">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <i className="fas fa-check-circle text-green-500 text-3xl"></i>
        </div>
        <p className="text-lg font-bold text-green-700">{getTranslation('txSuccess')}</p>
        {txState.txHash && (
          <a
            href={`${BSCSCAN_TX_URL}${txState.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-brand-primary hover:underline font-mono"
          >
            <i className="fas fa-external-link-alt mr-1.5"></i>
            {getTranslation('viewOnBSCScan')}
          </a>
        )}
        <button
          onClick={resetTxState}
          className="w-full btn-primary py-2.5 mt-2"
        >
          {getTranslation('buyMore')}
        </button>
      </div>
    );
  }

  if (txState.status === TransactionStatus.ERROR) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center space-y-3 animate-fade-in-zoom">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <i className="fas fa-times-circle text-red-500 text-3xl"></i>
        </div>
        <p className="text-lg font-bold text-red-700">{getTranslation('txFailed')}</p>
        <p className="text-sm text-red-600">{getTranslation(txState.errorMessage || 'txFailed')}</p>
        <button
          onClick={resetTxState}
          className="w-full btn-primary py-2.5 mt-2"
        >
          {getTranslation('buyMore')}
        </button>
      </div>
    );
  }

  const config = statusConfig[txState.status];
  if (!config) return null;

  return (
    <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-5 text-center space-y-3">
      {/* Step indicators */}
      <div className="flex items-center justify-center space-x-3 mb-3">
        <div className={`flex items-center space-x-1.5 text-xs font-semibold ${
          txState.status === TransactionStatus.AWAITING_APPROVAL || txState.status === TransactionStatus.APPROVAL_PENDING
            ? 'text-yellow-600' : 'text-green-500'
        }`}>
          <i className={`fas ${
            txState.status === TransactionStatus.AWAITING_APPROVAL || txState.status === TransactionStatus.APPROVAL_PENDING
              ? 'fa-spinner fa-spin' : 'fa-check-circle'
          }`}></i>
          <span>{getTranslation('approveStep')}</span>
        </div>
        <i className="fas fa-chevron-right text-gray-300 text-xs"></i>
        <div className={`flex items-center space-x-1.5 text-xs font-semibold ${
          txState.status === TransactionStatus.AWAITING_PURCHASE || txState.status === TransactionStatus.PURCHASE_PENDING
            ? 'text-brand-primary' : 'text-gray-400'
        }`}>
          <i className={`fas ${
            txState.status === TransactionStatus.AWAITING_PURCHASE || txState.status === TransactionStatus.PURCHASE_PENDING
              ? 'fa-spinner fa-spin' : 'fa-circle'
          } text-xs`}></i>
          <span>{getTranslation('buyStep')}</span>
        </div>
      </div>
      <i className={`${config.icon} ${config.color} text-3xl ${config.spin ? 'fa-spin' : ''}`}></i>
      <p className={`font-semibold ${config.color}`}>{getTranslation(config.textKey)}</p>
    </div>
  );
};


export const Presale: React.FC<PresaleProps> = ({ presaleData }) => {
  const { getTranslation, currentLang } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext);
  const { wallet, txState } = useContext(WalletContext);

  const [countdown, setCountdown] = useState<CountdownDigits>(initialCountdown);
  const [currentBonus, setCurrentBonus] = useState(0);
  const [activeBonusNameKey, setActiveBonusNameKey] = useState("presaleBonusEndedName");
  const [activeBonusInfoKey, setActiveBonusInfoKey] = useState("presaleBonusEndedInfo");

  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [baseTokens, setBaseTokens] = useState<number>(0);
  const [bonusTokens, setBonusTokens] = useState<number>(0);
  const [totalTokensReceived, setTotalTokensReceived] = useState<number>(0);
  const [hoveredDonut, setHoveredDonut] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentCheckout, setPaymentCheckout] = useState<NowPaymentsInvoiceResponse | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pricingState, setPricingState] = useState<PricingState | null>(null);
  const [quote, setQuote] = useState<PresaleQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteRefreshKey, setQuoteRefreshKey] = useState(0);
  const [recipientWalletAddress, setRecipientWalletAddress] = useState('');
  const [isRecipientWalletDirty, setIsRecipientWalletDirty] = useState(false);
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<NowPaymentsPaymentStatus | null>(null);
  const [isPaymentStatusLoading, setIsPaymentStatusLoading] = useState(false);
  const [paymentStatusError, setPaymentStatusError] = useState<string | null>(null);
  const [isDistributionPopupOpen, setIsDistributionPopupOpen] = useState(false);
  const [dismissedDistributionPopupKey, setDismissedDistributionPopupKey] = useState<string | null>(null);

  const tokenPrice = pricingState?.currentPriceUsd || TOKEN_PRICE;
  const displayedPurchasePrice = quote?.averagePriceUsd ?? tokenPrice;
  const displayedPurchasePriceDecimals = quote ? 4 : 2;

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
    const tokenAmount = parseFloat(investmentAmount) || 0;
    const base = tokenAmount;
    const bonus = base * currentBonus;
    const total = base + bonus;
    setBaseTokens(base);
    setBonusTokens(bonus);
    setTotalTokensReceived(total);
  }, [investmentAmount, currentBonus]);

  useEffect(() => {
    calculateTokens();
  }, [calculateTokens]);

  useEffect(() => {
    if (isRecipientWalletDirty) return;
    setRecipientWalletAddress(wallet.address || '');
  }, [isRecipientWalletDirty, wallet.address]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id') || params.get('orderId');
    if (orderId) {
      setTrackedOrderId(orderId);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadPricing = async () => {
      try {
        const pricing = await getPresalePricing();
        if (!isCancelled) {
          setPricingState(pricing);
          setQuoteRefreshKey((current) => current + 1);
        }
      } catch {
        // Keep the static fallback price if the API is unavailable.
      }
    };

    loadPricing();
    const timer = setInterval(loadPricing, 30000);

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const tokenAmount = parseFloat(investmentAmount) || 0;
    if (tokenAmount <= 0) {
      setQuote(null);
      setQuoteError(null);
      setIsQuoteLoading(false);
      return;
    }

    let isCancelled = false;
    setIsQuoteLoading(true);
    setQuoteError(null);

    const timer = setTimeout(async () => {
      try {
        const nextQuote = await getPresaleQuote(tokenAmount);
        if (isCancelled) return;
        setQuote(nextQuote);
        setPricingState(nextQuote.currentPricing);
      } catch (error) {
        if (isCancelled) return;
        setQuote(null);
        setQuoteError(error instanceof Error ? error.message : 'No se pudo calcular la cotizacion.');
      } finally {
        if (!isCancelled) setIsQuoteLoading(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [investmentAmount, quoteRefreshKey]);

  useEffect(() => {
    if (!trackedOrderId) return;

    let isCancelled = false;
    let pollTimer: number | undefined;

    const loadPaymentStatus = async () => {
      setIsPaymentStatusLoading(true);
      setPaymentStatusError(null);

      try {
        const nextStatus = await getNowPaymentsPayment(trackedOrderId);
        if (isCancelled) return;

        setPaymentStatus(nextStatus);
        if (shouldPollPaymentStatus(nextStatus)) {
          pollTimer = window.setTimeout(loadPaymentStatus, 15000);
        }
      } catch (error) {
        if (isCancelled) return;
        setPaymentStatusError(error instanceof Error ? error.message : 'No se pudo consultar el estado del pago.');
      } finally {
        if (!isCancelled) setIsPaymentStatusLoading(false);
      }
    };

    loadPaymentStatus();

    return () => {
      isCancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [trackedOrderId]);

  useEffect(() => {
    const txHash = paymentStatus?.distribution?.txHash;
    if (!txHash || !paymentStatus?.orderId) return;

    const popupKey = `${paymentStatus.orderId}:${txHash}`;
    if (dismissedDistributionPopupKey === popupKey) return;

    setIsDistributionPopupOpen(true);
  }, [dismissedDistributionPopupKey, paymentStatus?.distribution?.txHash, paymentStatus?.orderId]);

  const handleInvestmentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvestmentAmount(e.target.value);
    setQuote(null);
    setPaymentCheckout(null);
    setPaymentError(null);
  };

  const handlePresetAmount = (amount: number) => {
    setInvestmentAmount(String(amount));
    setQuote(null);
    setPaymentCheckout(null);
    setPaymentError(null);
  };

  const handleRecipientWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipientWalletAddress(e.target.value);
    setIsRecipientWalletDirty(true);
    setPaymentCheckout(null);
    setPaymentError(null);
  };

  const handleUseConnectedWallet = () => {
    if (!wallet.address) return;
    setRecipientWalletAddress(wallet.address);
    setIsRecipientWalletDirty(false);
    setPaymentCheckout(null);
    setPaymentError(null);
  };

  const handlePurchase = async () => {
    const tokenAmount = parseFloat(investmentAmount);
    if (!tokenAmount || tokenAmount <= 0) return;

    if (!isRecipientWalletValid) {
      setPaymentError('Ingresa una wallet BSC valida para recibir los tokens.');
      return;
    }

    const normalizedCheckoutWalletAddress = wallet.address && isAddress(wallet.address)
      ? getAddress(wallet.address)
      : normalizedRecipientWalletAddress;

    setIsCreatingPayment(true);
    setPaymentCheckout(null);
    setPaymentError(null);

    try {
      const checkout = await createNowPaymentsInvoice({
        walletAddress: normalizedCheckoutWalletAddress,
        recipientWalletAddress: normalizedRecipientWalletAddress,
        tokenAmount: baseTokens,
      });
      setPaymentCheckout(checkout);
      setTrackedOrderId(checkout.orderId);
      setPaymentStatus({
        orderId: checkout.orderId,
        status: checkout.status,
        nowPaymentsStatus: null,
        priceAmount: checkout.priceAmount,
        priceCurrency: checkout.priceCurrency,
        tokenAmount: checkout.tokenAmount,
        tokenPriceUsd: checkout.tokenPriceUsd,
        quote: checkout.quote,
        walletAddress: checkout.walletAddress,
        recipientWalletAddress: checkout.recipientWalletAddress,
        distribution: {
          status: 'pending_payment',
        },
        nowPaymentsInvoiceUrl: checkout.invoiceUrl,
      });

      if (checkout.invoiceUrl) {
        window.open(checkout.invoiceUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'No se pudo crear el pago.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleRefreshPaymentStatus = async () => {
    if (!trackedOrderId) return;

    setIsPaymentStatusLoading(true);
    setPaymentStatusError(null);

    try {
      const nextStatus = await getNowPaymentsPayment(trackedOrderId);
      setPaymentStatus(nextStatus);
    } catch (error) {
      setPaymentStatusError(error instanceof Error ? error.message : 'No se pudo consultar el estado del pago.');
    } finally {
      setIsPaymentStatusLoading(false);
    }
  };

  const handleCloseDistributionPopup = () => {
    if (paymentStatus?.distribution?.txHash && paymentStatus.orderId) {
      setDismissedDistributionPopupKey(`${paymentStatus.orderId}:${paymentStatus.distribution.txHash}`);
    }
    setIsDistributionPopupOpen(false);
  };

  const handleOpenDistributionPopup = () => {
    setIsDistributionPopupOpen(true);
  };

  const handleAnalyzeInvestment = () => {
    const amountUSD = quote?.totalUsd ?? amountDueUSD;
    if (amountUSD < 100) {
        showAiModal('aiModalTitleInvestment', undefined, `<p class="text-warning-orange">${getTranslation('presaleMinInvestment')}</p>`);
        return;
    }
    const prompt = `Como un analista financiero experto en Web3 y IA, evalúa brevemente una inversión de ${amountUSD} USD en la presale de DRACMA en la red BNB Smart Chain, que resulta en aproximadamente ${totalTokensReceived.toLocaleString(undefined, {maximumFractionDigits:0})} tokens $DRC (incluyendo un bono de ${getTranslation(activeBonusNameKey)}). DRACMA es un holding empresarial descentralizado respaldado por activos reales y potenciado por IA. Ofrece staking del 14% APR y dividendos. Proporciona una perspectiva concisa (2-3 frases) y optimista sobre el potencial de esta inversión. Idioma de la respuesta: ${currentLang}.`;
    showAiModal('aiModalTitleInvestment', prompt);
  };

  const overallProgress = (presaleData.raisedUSD / presaleData.targetUSD) * 100;
  const totalPresaleTokens = pricingState?.maxSaleTokens ?? presaleData.totalPresaleTokens;
  const tokensSold = pricingState?.tokensSold ?? presaleData.raisedUSD / TOKEN_PRICE;
  const tokensReserved = pricingState?.tokensReserved ?? 0;
  const tokensAllocated = pricingState?.tokensAllocated ?? tokensSold + tokensReserved;
  const tokensAvailable = pricingState?.tokensAvailable ?? Math.max(totalPresaleTokens - tokensAllocated, 0);
  const tokensProgress = totalPresaleTokens > 0 ? (tokensAllocated / totalPresaleTokens) * 100 : 0;

  const isInTransaction = txState.status !== TransactionStatus.IDLE && txState.status !== TransactionStatus.ERROR && txState.status !== TransactionStatus.SUCCESS;
  const tokenAmount = parseFloat(investmentAmount) || 0;
  const amountDueUSD = quote?.totalUsd ?? tokenAmount * tokenPrice;
  const averagePriceUsd = quote?.averagePriceUsd ?? tokenPrice;
  const minPurchaseUsd = quote?.minPurchaseUsd ?? 100;
  const trimmedRecipientWalletAddress = recipientWalletAddress.trim();
  const isRecipientWalletValid = isAddress(trimmedRecipientWalletAddress);
  const normalizedRecipientWalletAddress = isRecipientWalletValid ? getAddress(trimmedRecipientWalletAddress) : '';
  const shouldShowRecipientWalletError = isRecipientWalletDirty || tokenAmount > 0 || isCreatingPayment;
  const recipientWalletError = shouldShowRecipientWalletError && !trimmedRecipientWalletAddress
    ? 'Ingresa una wallet BSC valida para recibir los tokens.'
    : shouldShowRecipientWalletError && trimmedRecipientWalletAddress && !isRecipientWalletValid
      ? 'Ingresa una wallet BSC valida para recibir los tokens.'
      : null;
  const canCreatePayment = totalTokensReceived > 0 && amountDueUSD >= minPurchaseUsd && !isQuoteLoading && !quoteError && isRecipientWalletValid;
  const distributionStatus = paymentStatus?.distribution?.status || null;
  const distributionTxHash = paymentStatus?.distribution?.txHash || null;
  const isPaymentDistributed = paymentStatus?.status === 'distributed' || distributionStatus === 'sent';
  const isDistributionFailed = paymentStatus?.status === 'distribution_failed' || distributionStatus === 'failed';
  const isDistributionPendingConfiguration = distributionStatus === 'pending_configuration';
  const paymentStatusLabel = formatPaymentStatusLabel(paymentStatus?.status || paymentStatus?.nowPaymentsStatus);

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
                  <span className="text-brand-text-secondary/80 font-mono">{quote ? 'Precio cotizado' : getTranslation('presaleTokenPrice')}</span>
                  <span className="font-bold text-2xl brand-accent-gold-text font-display tracking-tighter">
                    ${displayedPurchasePrice.toFixed(displayedPurchasePriceDecimals)} <span className="text-xs text-brand-text-secondary/70">USD</span>
                  </span>
                </div>
                <p className="text-xs text-brand-text-secondary/60 font-mono">
                  Sube 10% por cada {((pricingState?.stepTokens || 100000)).toLocaleString()} tokens vendidos.
                </p>
              </div>
              {/* Network badge */}
              <div className="flex items-center justify-center bg-yellow-50 border border-yellow-200 rounded-lg py-2 px-3">
                <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png?v=032" className="h-5 mr-2" alt="BSC" />
                <span className="text-sm font-semibold text-yellow-700">{getTranslation('networkBSC')}</span>
              </div>
              <a
                href={`${BSCSCAN_ADDRESS_URL}${SALE_TOKEN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg border border-brand-primary/15 bg-brand-primary/5 px-3 py-2 text-xs font-mono text-brand-text-secondary hover:border-brand-primary/40 hover:text-brand-primary transition-colors"
              >
                <span>Contrato $DRC</span>
                <span className="truncate">{SALE_TOKEN_ADDRESS}</span>
                <i className="fas fa-external-link-alt"></i>
              </a>
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
                  <span id="tokens-sold-display">{tokensAllocated.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC reservados/vendidos</span>
                  <span id="total-presale-tokens-display">{totalPresaleTokens.toLocaleString()} $DRC</span>
                </div>
              </div>
              {pricingState && (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="rounded-lg bg-green-500/5 border border-green-500/15 p-3">
                    <p className="text-brand-text-secondary/70">Vendidos</p>
                    <p className="font-bold text-brand-text-primary">{tokensSold.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC</p>
                  </div>
                  <div className="rounded-lg bg-brand-primary/5 border border-brand-primary/15 p-3">
                    <p className="text-brand-text-secondary/70">Reservados</p>
                    <p className="font-bold text-brand-text-primary">{tokensReserved.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC</p>
                  </div>
                  <div className="rounded-lg bg-surface-medium/70 border border-brand-primary/10 p-3">
                    <p className="text-brand-text-secondary/70">Disponibles</p>
                    <p className="font-bold text-brand-text-primary">{tokensAvailable.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC</p>
                  </div>
                  <div className="rounded-lg bg-brand-secondary/5 border border-brand-secondary/15 p-3">
                    <p className="text-brand-text-secondary/70">Proxima subida</p>
                    <p className="font-bold text-brand-text-primary">{pricingState.nextIncreaseAt.toLocaleString()} $DRC</p>
                  </div>
                  <div className="rounded-lg bg-brand-accent-gold/10 border border-brand-accent-gold/25 p-3">
                    <p className="text-brand-text-secondary/70">Restan en tramo</p>
                    <p className="font-bold text-brand-text-primary">{pricingState.remainingInCurrentTier.toLocaleString()} $DRC</p>
                  </div>
                </div>
              )}
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
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-brand-primary/15 bg-brand-primary/5 p-3">
                  <p className="text-xs font-mono text-brand-text-secondary/70">Red requerida</p>
                  <p className="mt-1 font-semibold text-brand-text-primary">{getTranslation('networkBSC')}</p>
                </div>
                <div className="rounded-lg border border-brand-secondary/15 bg-brand-secondary/5 p-3">
                  <p className="text-xs font-mono text-brand-text-secondary/70">{quote ? 'Precio cotizado' : 'Precio actual'}</p>
                  <p className="mt-1 font-semibold text-brand-text-primary">
                    ${displayedPurchasePrice.toFixed(displayedPurchasePriceDecimals)} USD / $DRC
                  </p>
                </div>
                <div className="rounded-lg border border-brand-accent-gold/30 bg-brand-accent-gold/10 p-3">
                  <p className="text-xs font-mono text-brand-text-secondary/70">Procesador</p>
                  <p className="mt-1 font-semibold text-brand-text-primary">Pagar usando crypto</p>
                </div>
              </div>

              <div>
                <label className="presale-step-label">
                  Cantidad de tokens $DRC a comprar:
                </label>
                <div className="relative flex items-center">
                  <i className="fas fa-coins text-brand-text-secondary/50 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-lg"></i>
                  <input
                    type="number"
                    id="adv-presale-amount-input"
                    value={investmentAmount}
                    onChange={handleInvestmentAmountChange}
                    className="presale-input presale-input-with-icon flex-grow !text-brand-text-primary !placeholder-brand-text-secondary/70"
                    placeholder="Ej: 1000"
                    min="0"
                    step="1"
                    disabled={isInTransaction || isCreatingPayment}
                  />
                  <span className="absolute right-4 text-brand-text-secondary/60 font-mono text-sm">$DRC</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {[500, 1000, 5000, 10000].map(val => (
                     <button
                       key={val}
                       onClick={() => handlePresetAmount(val)}
                       className="btn-preset-amount text-xs py-2"
                       disabled={isInTransaction || isCreatingPayment}
                     >
                       {val.toLocaleString()} $DRC
                     </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="presale-step-label">
                  Wallet donde recibiras los tokens $DRC:
                </label>
                <div className="relative flex items-center">
                  <i className="fas fa-wallet text-brand-text-secondary/50 absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-lg"></i>
                  <input
                    type="text"
                    value={recipientWalletAddress}
                    onChange={handleRecipientWalletChange}
                    className="presale-input presale-input-with-icon flex-grow !text-brand-text-primary !placeholder-brand-text-secondary/70 font-mono text-sm"
                    placeholder="0x..."
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isInTransaction || isCreatingPayment}
                  />
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-brand-text-secondary/60 font-mono">
                    Disponible en movil y desktop para pagar usando crypto. No necesitas conectar wallet.
                  </p>
                  {wallet.address && (
                    <button
                      type="button"
                      onClick={handleUseConnectedWallet}
                      className="text-xs brand-primary-text hover:underline font-mono text-left sm:text-right"
                      disabled={isInTransaction || isCreatingPayment}
                    >
                      Usar wallet conectada
                    </button>
                  )}
                </div>
                {recipientWalletError && (
                  <p className="text-xs text-warning-orange mt-2 font-mono">
                    {recipientWalletError}
                  </p>
                )}
              </div>

              {/* Token Calculation */}
              <div className="bg-brand-background/50 border border-gray-200/70 rounded-lg p-4 space-y-2.5 shadow-inner">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-text-secondary/90">Subtotal USD</span>
                  <span className="font-bold brand-primary-text text-lg font-mono">
                    {isQuoteLoading ? 'Calculando...' : `$${amountDueUSD.toLocaleString(undefined, {maximumFractionDigits:2})}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-brand-text-secondary/90">Precio promedio</span>
                  <span className="font-semibold text-brand-text-primary font-mono">${averagePriceUsd.toFixed(4)} / $DRC</span>
                </div>
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
                {quote && quote.breakdown.length > 1 && (
                  <div className="rounded-lg border border-brand-primary/15 bg-white/70 p-3 text-xs font-mono text-brand-text-secondary/80">
                    <p className="mb-2 font-semibold text-brand-text-primary">Esta compra cruza tramos de precio:</p>
                    {quote.breakdown.map(item => (
                      <div key={`${item.tierIndex}-${item.tierStart}`} className="flex justify-between gap-3">
                        <span>{item.tokens.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC</span>
                        <span>${item.priceUsd.toFixed(4)} / $DRC</span>
                      </div>
                    ))}
                  </div>
                )}
                {quoteError && (
                  <p className="text-xs text-warning-orange font-mono">
                    {quoteError} El backend recalculara el precio al crear el pago.
                  </p>
                )}
              </div>

              {/* AI Analysis Button */}
              <button onClick={handleAnalyzeInvestment} className="btn-ai-feature w-full" disabled={isInTransaction || isCreatingPayment}>
                <i className="fas fa-magic mr-2"></i> <span>{getTranslation('btnAnalyzeInvestment')}</span>
              </button>

              {paymentError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <i className="fas fa-triangle-exclamation mr-2"></i>
                  {paymentError}
                </div>
              )}

              {paymentCheckout && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3 animate-fade-in-zoom">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <i className="fas fa-check text-green-600"></i>
                    </div>
                    <div>
                      <p className="font-bold text-green-800">Pago creado para pagar usando crypto</p>
                      <p className="text-sm text-green-700">
                        Orden {paymentCheckout.orderId} por ${paymentCheckout.priceAmount.toLocaleString(undefined, {maximumFractionDigits:2})}. El webhook liberara {paymentCheckout.tokenAmount.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC a {paymentCheckout.recipientWalletAddress} cuando el procesador confirme el estado finished.
                      </p>
                    </div>
                  </div>
                  {paymentCheckout.invoiceUrl && (
                    <a
                      href={paymentCheckout.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full btn-primary py-2.5 flex items-center justify-center"
                    >
                      <i className="fas fa-arrow-up-right-from-square mr-2"></i>
                      Abrir checkout
                    </a>
                  )}
                </div>
              )}

              {(trackedOrderId || paymentStatus || paymentStatusError) && (
                <div className={`rounded-xl border p-5 space-y-4 animate-fade-in-zoom ${
                  isPaymentDistributed
                    ? 'border-green-200 bg-green-50'
                    : isDistributionFailed
                      ? 'border-red-200 bg-red-50'
                      : 'border-brand-primary/20 bg-brand-primary/5'
                }`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className={`text-sm font-mono ${
                        isPaymentDistributed
                          ? 'text-green-700'
                          : isDistributionFailed
                            ? 'text-red-700'
                            : 'text-brand-primary'
                      }`}>
                        Seguimiento post-pago
                      </p>
                      <h4 className="mt-1 text-lg font-bold text-brand-text-primary">
                        {paymentStatusLabel}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshPaymentStatus}
                      className="inline-flex items-center justify-center rounded-lg border border-brand-primary/20 px-3 py-2 text-xs font-mono text-brand-primary hover:bg-white/70 transition-colors disabled:opacity-60"
                      disabled={isPaymentStatusLoading || !trackedOrderId}
                    >
                      <i className={`fas ${isPaymentStatusLoading ? 'fa-spinner fa-spin' : 'fa-rotate'} mr-2`}></i>
                      Actualizar
                    </button>
                  </div>

                  {paymentStatusError && (
                    <p className="rounded-lg border border-red-200 bg-white/70 p-3 text-sm text-red-700">
                      {paymentStatusError}
                    </p>
                  )}

                  {paymentStatus && (
                    <div className="space-y-3 text-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-white/70 border border-gray-200/70 p-3">
                          <p className="text-xs font-mono text-brand-text-secondary/60">Orden</p>
                          <p className="mt-1 font-semibold text-brand-text-primary break-all">{paymentStatus.orderId}</p>
                        </div>
                        <div className="rounded-lg bg-white/70 border border-gray-200/70 p-3">
                          <p className="text-xs font-mono text-brand-text-secondary/60">Tokens</p>
                          <p className="mt-1 font-semibold text-brand-text-primary">
                            {paymentStatus.tokenAmount.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-white/70 border border-gray-200/70 p-3">
                        <p className="text-xs font-mono text-brand-text-secondary/60">Wallet receptora</p>
                        <p className="mt-1 font-mono text-brand-text-primary break-all">{paymentStatus.recipientWalletAddress}</p>
                      </div>

                      {distributionTxHash ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={handleOpenDistributionPopup}
                            className="w-full btn-secondary py-2.5 flex items-center justify-center"
                          >
                            <i className="fas fa-receipt mr-2"></i>
                            Ver comprobante
                          </button>
                          <a
                            href={`${BSCSCAN_TX_URL}${distributionTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full btn-primary py-2.5 flex items-center justify-center"
                          >
                            <i className="fas fa-arrow-up-right-from-square mr-2"></i>
                            Ver transferencia en BscScan
                          </a>
                        </div>
                      ) : isDistributionFailed ? (
                        <p className="rounded-lg border border-red-200 bg-white/80 p-3 text-red-700">
                          La distribucion de tokens fallo. {paymentStatus.distribution?.error || 'Revisa la configuracion de gas y la wallet distribuidora.'}
                        </p>
                      ) : isDistributionPendingConfiguration ? (
                        <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-700">
                          Pago confirmado. La distribucion automatica esta pendiente de configuracion en el backend.
                        </p>
                      ) : (
                        <p className="rounded-lg border border-brand-primary/15 bg-white/70 p-3 text-brand-text-secondary">
                          Actualizando automaticamente. Cuando el pago quede confirmado y los tokens se envien, aparecerá aqui el hash de BscScan.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Status or Buy Button */}
              <div className="pt-2">
                {txState.status !== TransactionStatus.IDLE ? (
                  <TransactionStatusUI />
                ) : (
                  <button
                    onClick={handlePurchase}
                    disabled={isCreatingPayment || !canCreatePayment}
                    className="w-full btn-primary py-3.5 text-lg flex items-center justify-center animate-button-pulse-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none"
                  >
                    <i className={`fas ${isCreatingPayment ? 'fa-spinner fa-spin' : 'fa-credit-card'} mr-2.5`}></i>
                    <span>{isCreatingPayment ? 'Creando pago...' : 'Pagar usando crypto'}</span>
                  </button>
                )}
                {amountDueUSD > 0 && amountDueUSD < minPurchaseUsd && (
                  <p className="text-xs text-warning-orange mt-2 text-center font-mono">{getTranslation('presaleMinInvestment')}</p>
                )}
                {(normalizedRecipientWalletAddress || recipientWalletAddress) && (
                  <p className="text-xs text-brand-text-secondary/60 mt-2 text-center font-mono break-all">
                    Los tokens se enviaran a: {normalizedRecipientWalletAddress || recipientWalletAddress}
                  </p>
                )}
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

      {isDistributionPopupOpen && paymentStatus && distributionTxHash && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-surface-dark/70 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="distribution-popup-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-brand-primary/20 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wide text-brand-primary">Comprobante de envio</p>
                <h3 id="distribution-popup-title" className="mt-1 text-xl font-bold text-brand-text-primary">
                  Tokens enviados
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseDistributionPopup}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-brand-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
                aria-label="Cerrar comprobante de envio"
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <i className="fas fa-circle-check"></i>
                    <span className="text-sm font-semibold">Pago confirmado</span>
                  </div>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <i className="fas fa-circle-check"></i>
                    <span className="text-sm font-semibold">Tokens enviados</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-mono text-brand-text-secondary/70">Orden</p>
                  <p className="mt-1 break-all text-sm font-semibold text-brand-text-primary">{paymentStatus.orderId}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-mono text-brand-text-secondary/70">Tokens</p>
                  <p className="mt-1 text-sm font-semibold text-brand-text-primary">
                    {paymentStatus.tokenAmount.toLocaleString(undefined, {maximumFractionDigits:0})} $DRC
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-mono text-brand-text-secondary/70">Wallet receptora</p>
                <p className="mt-1 break-all font-mono text-sm text-brand-text-primary">
                  {paymentStatus.recipientWalletAddress}
                </p>
              </div>

              <div className="rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-3">
                <p className="text-xs font-mono text-brand-text-secondary/70">Hash de envio</p>
                <p className="mt-2 break-all font-mono text-sm text-brand-text-primary">
                  {distributionTxHash}
                </p>
              </div>
            </div>

            <div className="grid gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleCloseDistributionPopup}
                className="btn-secondary py-2.5"
              >
                Cerrar
              </button>
              <a
                href={`${BSCSCAN_TX_URL}${distributionTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center justify-center py-2.5"
              >
                <i className="fas fa-arrow-up-right-from-square mr-2"></i>
                Ver envio en BscScan
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
