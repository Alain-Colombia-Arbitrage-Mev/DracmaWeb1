import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { useAccount, useConnect, useDisconnect, useConnectors } from 'wagmi';
import { formatUnits } from 'viem';
import { $translations } from '../../stores/appStore';
import { useStaking, type StakeStep, type UnstakeStep, type ClaimStep } from '../../hooks/useStaking';
import { STAKING_ADDRESS, DRACMA_TOKEN_ADDRESS } from '../../config/contracts';
import Web3Provider from './Web3Provider';

const getBscScanTxUrl = (hash: string) => `https://bscscan.com/tx/${hash}`;

type ActiveTab = 'stake' | 'unstake' | 'claim';

function StakingTxOverlay({ stakeStep, unstakeStep, claimStep, txHash, errorMessage, onReset, t }: {
  stakeStep: StakeStep;
  unstakeStep: UnstakeStep;
  claimStep: ClaimStep;
  txHash: string | null;
  errorMessage: string | null;
  onReset: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const isStakeActive = stakeStep !== 'idle';
  const isUnstakeActive = unstakeStep !== 'idle';
  const isClaimActive = claimStep !== 'idle';

  if (!isStakeActive && !isUnstakeActive && !isClaimActive) return null;

  const isProcessing =
    stakeStep === 'approving' || stakeStep === 'waiting-approval' || stakeStep === 'staking' || stakeStep === 'confirming' ||
    unstakeStep === 'unstaking' || unstakeStep === 'confirming' ||
    claimStep === 'claiming' || claimStep === 'confirming';

  const isSuccess = stakeStep === 'success' || unstakeStep === 'success' || claimStep === 'success';
  const isError = stakeStep === 'error' || unstakeStep === 'error' || claimStep === 'error';

  const getProcessingText = () => {
    if (stakeStep === 'approving') return t('stakingApproving', 'Aprobando DRACMA...');
    if (stakeStep === 'waiting-approval') return t('stakingWaitingApproval', 'Confirmando aprobación...');
    if (stakeStep === 'staking') return t('stakingStaking', 'Haciendo staking...');
    if (unstakeStep === 'unstaking') return t('stakingUnstaking', 'Retirando tokens...');
    if (claimStep === 'claiming') return t('stakingClaiming', 'Reclamando recompensas...');
    return t('stakingConfirming', 'Confirmando en la blockchain...');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl p-6 md:p-8 max-w-md w-full text-center relative" style={{ background: 'var(--th-surface)', border: '1px solid var(--th-border-accent)', boxShadow: 'var(--th-shadow-lg)' }}>
        {(isSuccess || isError) && (
          <button
            onClick={onReset}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-brand-text-secondary/60 hover:text-brand-text-primary hover:bg-brand-text-secondary/10 transition-colors"
            aria-label="Cerrar"
          >
            <i className="fas fa-times"></i>
          </button>
        )}

        {isProcessing && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--th-primary-muted)' }}>
              <i className="fas fa-spinner fa-spin text-3xl text-brand-primary"></i>
            </div>
            <h3 className="text-xl font-bold text-brand-text-primary mb-2">{getProcessingText()}</h3>
            <p className="text-sm text-brand-text-secondary">
              {stakeStep === 'approving'
                ? t('stakingApproveHint', 'Confirma la aprobación en tu wallet')
                : t('stakingProcessingHint', 'Procesando transacción...')}
            </p>
            <p className="text-xs text-brand-text-secondary/60 mt-3 font-mono">
              {t('stakingDoNotClose', 'No cierres esta ventana')}
            </p>
          </>
        )}

        {isSuccess && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-500/20">
              <i className="fas fa-check-circle text-5xl text-success-green"></i>
            </div>
            <h3 className="text-2xl font-bold text-success-green mb-1">
              {t('stakingSuccess', '¡Transacción exitosa!')}
            </h3>
            <p className="text-sm text-brand-text-secondary mb-5">
              {t('stakingSuccessDesc', 'Tu operación de staking fue procesada correctamente.')}
            </p>
            {txHash && (
              <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
                <p className="text-[10px] text-brand-text-secondary/60 font-mono mb-1">{t('stakingTxHash', 'Hash de transacción')}</p>
                <a
                  href={getBscScanTxUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-primary hover:text-brand-secondary transition-colors"
                >
                  {txHash.slice(0, 16)}...{txHash.slice(-8)}
                  <i className="fas fa-external-link-alt text-[10px]"></i>
                </a>
              </div>
            )}
            <button onClick={onReset} className="btn-primary w-full">
              {t('stakingClose', 'Cerrar')}
            </button>
          </>
        )}

        {isError && (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--th-danger-muted)' }}>
              <i className="fas fa-exclamation-triangle text-5xl text-brand-accent-coral"></i>
            </div>
            <h3 className="text-2xl font-bold text-brand-accent-coral mb-1">
              {t('stakingError', 'Transacción Fallida')}
            </h3>
            <div className="rounded-xl p-4 mb-4 text-left" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
              <p className="text-sm text-brand-accent-coral font-medium break-words">
                {errorMessage || t('stakingErrorGeneric', 'Ocurrió un error inesperado.')}
              </p>
            </div>
            <button onClick={onReset} className="btn-primary w-full">
              <i className="fas fa-redo mr-2"></i>
              {t('stakingTryAgain', 'Intentar de Nuevo')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StakingInner() {
  const translations = useStore($translations);
  const t = useCallback((key: string, fallback?: string) => translations[key] || fallback || key, [translations]);

  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  const {
    stakingData,
    aprBasisPoints,
    totalStaked,
    rewardPoolBalance,
    dracmaBalance,
    stakeStep,
    unstakeStep,
    claimStep,
    txHash,
    errorMessage,
    stakeTokens,
    unstakeTokens,
    claimRewards,
    reset,
  } = useStaking();

  const [activeTab, setActiveTab] = useState<ActiveTab>('stake');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  const truncatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  // Format helpers
  const fmt = (val: bigint | undefined) => val !== undefined ? parseFloat(formatUnits(val, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
  const fmtInt = (val: bigint | undefined) => val !== undefined ? parseFloat(formatUnits(val, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0';
  const fmtRaw = (val: bigint | undefined) => val !== undefined ? parseFloat(formatUnits(val, 18)) : 0;

  // APR calculation
  const aprPercent = aprBasisPoints !== undefined ? Number(aprBasisPoints) / 100 : 10;

  // Wallet connection (same pattern as Presale)
  const handleConnectWallet = useCallback(() => {
    const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const hasInjected = typeof window !== 'undefined' && !!(window as any).ethereum;
    let connector;
    if (isMobile && !hasInjected) {
      connector = connectors.find(c => c.id === 'walletConnect');
    } else if (hasInjected) {
      connector = connectors.find(c => c.id === 'injected');
    } else {
      connector = connectors.find(c => c.id === 'walletConnect');
    }
    if (connector) connect({ connector });
  }, [connect, connectors]);

  const handleStake = useCallback(() => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) return;
    stakeTokens(stakeAmount);
  }, [stakeAmount, stakeTokens]);

  const handleUnstake = useCallback(() => {
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0) return;
    unstakeTokens(unstakeAmount);
  }, [unstakeAmount, unstakeTokens]);

  const handleStakePreset = (pct: number) => {
    const bal = fmtRaw(dracmaBalance);
    if (bal <= 0) return;
    const val = pct === 100 ? bal : Math.floor(bal * pct / 100 * 100) / 100;
    setStakeAmount(String(val));
  };

  const handleUnstakePreset = (pct: number) => {
    const staked = stakingData ? fmtRaw(stakingData.stakedAmount) : 0;
    if (staked <= 0) return;
    const val = pct === 100 ? staked : Math.floor(staked * pct / 100 * 100) / 100;
    setUnstakeAmount(String(val));
  };

  const isAnyProcessing =
    stakeStep !== 'idle' && stakeStep !== 'success' && stakeStep !== 'error' ||
    unstakeStep !== 'idle' && unstakeStep !== 'success' && unstakeStep !== 'error' ||
    claimStep !== 'idle' && claimStep !== 'success' && claimStep !== 'error';

  return (
    <section id="staking" className="py-16 bg-brand-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(99,102,241,0.06), rgba(99,102,241,0.06) 1px, transparent 1px, transparent 15px), repeating-linear-gradient(-45deg, rgba(139,92,246,0.04), rgba(139,92,246,0.04) 1px, transparent 1px, transparent 15px)" }}></div>
      <div className="absolute top-[15%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.04] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>
      <div className="absolute bottom-[10%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-[0.03] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>

      {/* Transaction overlay */}
      <StakingTxOverlay
        stakeStep={stakeStep}
        unstakeStep={unstakeStep}
        claimStep={claimStep}
        txHash={txHash}
        errorMessage={errorMessage}
        onReset={reset}
        t={t}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 animate-fade-in-zoom">
          <h2 className="text-4xl md:text-6xl font-bold mb-4 title-main-display brand-primary-text">
            {t('stakingTitle', 'DRACMA STAKING')}
          </h2>
          <div className="w-36 h-1 mx-auto mb-6 rounded-full" style={{ background: 'var(--th-primary)', opacity: 0.5 }}></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-3xl mx-auto leading-relaxed">
            {t('stakingSubtitle', 'Haz staking de tus tokens $DRACMA y gana recompensas pasivas. Contribuye al ecosistema mientras aumentas tu inversión.')}
          </p>

          {/* APR Badge */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5" style={{ background: 'var(--th-secondary-muted)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <i className="fas fa-percentage text-brand-secondary"></i>
            <span className="text-sm font-medium text-brand-secondary">{aprPercent}% APR — {t('stakingAPRBadge', 'Rendimiento anual estimado')}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* LEFT — Stats Overview */}
          <div className="lg:col-span-2 card-ui glass-card-premium p-6 md:p-8 animate-slide-in-left">
            <h3 className="text-2xl font-bold mb-6 title-section-display brand-accent-gold-text relative pb-3 title-underline-animated animate-on-visible">
              {t('stakingStatsTitle', 'Estado del Staking')}
            </h3>

            <div className="space-y-4">
              {/* APR */}
              <div className="rounded-lg p-4 text-center" style={{ background: 'var(--th-primary-muted)', border: '1px solid var(--th-border-accent)' }}>
                <p className="text-[10px] text-brand-text-secondary/60 font-mono uppercase tracking-wider mb-1">{t('stakingAPR', 'APR Actual')}</p>
                <p className="text-4xl font-bold brand-primary-text font-display">{aprPercent}%</p>
              </div>

              {/* Total Staked */}
              <div className="rounded-lg p-3" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-brand-text-secondary/80 font-mono">{t('stakingTotalStaked', 'Total en Staking')}</span>
                  <span className="font-bold brand-secondary-text font-mono">{fmtInt(totalStaked)} <span className="text-xs text-brand-text-secondary/60">$DRACMA</span></span>
                </div>
              </div>

              {/* Reward Pool */}
              <div className="rounded-lg p-3" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-brand-text-secondary/80 font-mono">{t('stakingRewardPool', 'Pool de Recompensas')}</span>
                  <span className="font-bold brand-accent-gold-text font-mono">{fmtInt(rewardPoolBalance)} <span className="text-xs text-brand-text-secondary/60">$DRACMA</span></span>
                </div>
              </div>

              {/* Divider */}
              {isConnected && stakingData && (
                <>
                  <hr style={{ borderColor: 'var(--th-border)' }} />

                  {/* Your Stake */}
                  <div className="rounded-lg p-3" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-brand-text-secondary/80 font-mono">{t('stakingYourStake', 'Tu Stake')}</span>
                      <span className="font-bold text-brand-text-primary font-mono">{fmt(stakingData.stakedAmount)} <span className="text-xs text-brand-text-secondary/60">$DRACMA</span></span>
                    </div>
                  </div>

                  {/* Pending Rewards */}
                  <div className="rounded-lg p-3" style={{ background: 'var(--th-secondary-muted)', border: '1px solid var(--th-border-accent)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-brand-text-secondary/80 font-mono">{t('stakingPendingRewards', 'Recompensas Pendientes')}</span>
                      <span className="font-bold text-success-green font-mono">{fmt(stakingData.pendingRewards)} <span className="text-xs text-brand-text-secondary/60">$DRACMA</span></span>
                    </div>
                  </div>
                </>
              )}

              {/* Wallet Balance */}
              {isConnected && (
                <div className="rounded-lg p-3" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-brand-text-secondary/80 font-mono">{t('stakingBalance', 'Tu Balance')}</span>
                    <span className="font-bold text-brand-text-primary font-mono">{fmt(dracmaBalance)} <span className="text-xs text-brand-text-secondary/60">$DRACMA</span></span>
                  </div>
                </div>
              )}

              {/* Contract Link */}
              <div className="pt-2">
                <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
                  <i className="fas fa-file-contract text-brand-primary text-sm"></i>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-brand-text-secondary/60 font-mono">{t('stakingContract', 'Contrato Staking BSC')}</p>
                    <a
                      href={`https://bscscan.com/address/${STAKING_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-brand-primary hover:text-brand-secondary transition-colors truncate block"
                    >
                      {STAKING_ADDRESS.slice(0, 10)}...{STAKING_ADDRESS.slice(-8)}
                    </a>
                  </div>
                  <i className="fas fa-external-link-alt text-brand-text-secondary/40 text-[10px]"></i>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Staking Actions */}
          <div className="lg:col-span-3 card-ui glass-card-premium p-6 md:p-8 animate-slide-in-right">
            {/* Tabs */}
            <div className="flex rounded-lg overflow-hidden mb-6" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
              {(['stake', 'unstake', 'claim'] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-brand-primary text-white'
                      : 'text-brand-text-secondary hover:text-brand-text-primary'
                  }`}
                >
                  <i className={`fas ${tab === 'stake' ? 'fa-arrow-down' : tab === 'unstake' ? 'fa-arrow-up' : 'fa-gift'} mr-1.5`}></i>
                  {tab === 'stake' ? t('stakingTabStake', 'Stake') : tab === 'unstake' ? t('stakingTabUnstake', 'Unstake') : t('stakingTabClaim', 'Reclamar')}
                </button>
              ))}
            </div>

            {!isConnected ? (
              /* Not Connected — Show connect prompt */
              <div className="text-center py-10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--th-primary-muted)' }}>
                  <i className="fas fa-wallet text-3xl text-brand-primary"></i>
                </div>
                <h4 className="text-xl font-bold text-brand-text-primary mb-2">
                  {t('stakingNoWallet', 'Conecta tu Wallet')}
                </h4>
                <p className="text-sm text-brand-text-secondary mb-6 max-w-sm mx-auto">
                  {t('stakingConnectHint', 'Conecta tu wallet para hacer staking de tokens $DRACMA y ganar recompensas.')}
                </p>
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="btn-primary px-8 py-3 text-base"
                >
                  {isConnecting ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>{t('stakingConnecting', 'Conectando...')}</>
                  ) : (
                    <><i className="fas fa-wallet mr-2"></i>{t('btnConnectWallet', 'Conectar Wallet')}</>
                  )}
                </button>
              </div>
            ) : activeTab === 'stake' ? (
              /* Stake Tab */
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-brand-text-primary">
                      {t('stakingAmountLabel', 'Cantidad a depositar')}
                    </label>
                    <span className="text-xs text-brand-text-secondary/70 font-mono">
                      {t('stakingBalance', 'Balance')}: {fmt(dracmaBalance)} $DRACMA
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="any"
                      className="presale-input w-full pr-24"
                      disabled={isAnyProcessing}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-text-secondary/60 font-mono">$DRACMA</span>
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handleStakePreset(pct)}
                      className="btn-preset-amount"
                      disabled={isAnyProcessing}
                    >
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>

                {/* Info Note */}
                <div className="rounded-lg p-3 mb-5 flex items-start gap-2" style={{ background: 'var(--th-primary-muted)', border: '1px solid var(--th-border)' }}>
                  <i className="fas fa-info-circle text-brand-primary mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-brand-text-secondary">
                    {t('stakingStakeInfo', 'Tus tokens ganarán recompensas automáticamente. Puedes retirar o reclamar en cualquier momento.')}
                  </p>
                </div>

                <button
                  onClick={handleStake}
                  disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isAnyProcessing}
                  className="w-full btn-primary py-3.5 text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-lock mr-2.5"></i>
                  {t('stakingStakeBtn', 'Hacer Staking')}
                </button>
              </div>
            ) : activeTab === 'unstake' ? (
              /* Unstake Tab */
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-brand-text-primary">
                      {t('stakingUnstakeAmountLabel', 'Cantidad a retirar')}
                    </label>
                    <span className="text-xs text-brand-text-secondary/70 font-mono">
                      {t('stakingStaked', 'En staking')}: {stakingData ? fmt(stakingData.stakedAmount) : '0'} $DRACMA
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="any"
                      className="presale-input w-full pr-24"
                      disabled={isAnyProcessing}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-text-secondary/60 font-mono">$DRACMA</span>
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handleUnstakePreset(pct)}
                      className="btn-preset-amount"
                      disabled={isAnyProcessing}
                    >
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>

                {/* Info Note */}
                <div className="rounded-lg p-3 mb-5 flex items-start gap-2" style={{ background: 'var(--th-primary-muted)', border: '1px solid var(--th-border)' }}>
                  <i className="fas fa-info-circle text-brand-primary mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-brand-text-secondary">
                    {t('stakingUnstakeInfo', 'Al retirar, las recompensas pendientes se reclamarán automáticamente junto con tus tokens.')}
                  </p>
                </div>

                {(!stakingData || stakingData.stakedAmount === BigInt(0)) ? (
                  <div className="text-center py-4">
                    <i className="fas fa-inbox text-brand-text-secondary/40 text-3xl mb-2"></i>
                    <p className="text-sm text-brand-text-secondary">{t('stakingNothingStaked', 'No tienes tokens en staking')}</p>
                  </div>
                ) : (
                  <button
                    onClick={handleUnstake}
                    disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || isAnyProcessing}
                    className="w-full btn-primary py-3.5 text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-unlock mr-2.5"></i>
                    {t('stakingUnstakeBtn', 'Retirar Tokens')}
                  </button>
                )}
              </div>
            ) : (
              /* Claim Tab */
              <div className="text-center py-6">
                {(!stakingData || stakingData.stakedAmount === BigInt(0)) ? (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--th-bg-alt)' }}>
                      <i className="fas fa-coins text-brand-text-secondary/40 text-2xl"></i>
                    </div>
                    <p className="text-sm text-brand-text-secondary mb-2">{t('stakingNothingStaked', 'No tienes tokens en staking')}</p>
                    <p className="text-xs text-brand-text-secondary/60">{t('stakingStakeFirst', 'Deposita tokens $DRACMA para empezar a ganar recompensas.')}</p>
                  </>
                ) : (
                  <>
                    {/* Rewards Display */}
                    <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--th-secondary-muted)', border: '1px solid var(--th-border-accent)' }}>
                      <p className="text-xs text-brand-text-secondary/60 font-mono uppercase tracking-wider mb-2">{t('stakingPendingRewards', 'Recompensas Pendientes')}</p>
                      <p className="text-4xl font-bold text-success-green font-display mb-1">
                        {stakingData ? fmt(stakingData.pendingRewards) : '0'}
                      </p>
                      <p className="text-sm text-brand-text-secondary font-mono">$DRACMA</p>
                    </div>

                    {/* Stake info */}
                    <div className="rounded-lg p-3 mb-5 flex items-start gap-2 text-left" style={{ background: 'var(--th-primary-muted)', border: '1px solid var(--th-border)' }}>
                      <i className="fas fa-info-circle text-brand-primary mt-0.5 flex-shrink-0"></i>
                      <p className="text-xs text-brand-text-secondary">
                        {t('stakingClaimInfo', 'Las recompensas se acumulan continuamente basadas en tu stake y el APR actual. Puedes reclamarlas en cualquier momento.')}
                      </p>
                    </div>

                    <button
                      onClick={claimRewards}
                      disabled={!stakingData || stakingData.pendingRewards === BigInt(0) || isAnyProcessing}
                      className="w-full btn-primary py-3.5 text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-gift mr-2.5"></i>
                      {stakingData && stakingData.pendingRewards > BigInt(0)
                        ? <span>{t('stakingClaimBtn', 'Reclamar')} {fmt(stakingData.pendingRewards)} $DRACMA</span>
                        : <span>{t('stakingNoRewards', 'Sin recompensas disponibles')}</span>
                      }
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Connected wallet info */}
            {isConnected && (
              <div className="mt-6 flex items-center justify-between rounded-lg p-3" style={{ background: 'var(--th-bg-alt)', border: '1px solid var(--th-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success-green"></div>
                  <span className="text-xs font-mono text-brand-text-secondary">{truncatedAddress}</span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-brand-accent-coral hover:text-red-400 transition-colors font-mono"
                >
                  {t('stakingDisconnect', 'Desconectar')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Staking() {
  return (
    <Web3Provider>
      <StakingInner />
    </Web3Provider>
  );
}
