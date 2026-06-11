
import React, { useContext } from 'react';
import { LanguageContext } from '../App';
import * as web3 from '../services/web3Service';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { getTranslation } = useContext(LanguageContext);

  if (!isOpen) return null;

  const isMobile = web3.isMobile();

  const walletOptions = isMobile
    ? [
        {
          name: 'MetaMask',
          icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
          action: () => { window.location.href = web3.getMetaMaskDeepLink(); },
          descKey: 'walletOpenInApp',
        },
        {
          name: 'Trust Wallet',
          icon: 'https://trustwallet.com/assets/images/media/assets/trust_platform.svg',
          action: () => { window.location.href = web3.getTrustWalletDeepLink(); },
          descKey: 'walletOpenInApp',
        },
      ]
    : [
        {
          name: 'MetaMask',
          icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
          action: () => { window.open('https://metamask.io/download/', '_blank'); },
          descKey: 'installMetaMask',
        },
      ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm mx-auto p-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-brand-text-primary">{getTranslation('walletSelectTitle')}</h3>
          <button onClick={onClose} className="text-brand-text-secondary/60 hover:text-brand-text-primary p-1">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {isMobile && (
          <p className="text-sm text-brand-text-secondary/70 mb-4">
            {getTranslation('walletMobileDesc')}
          </p>
        )}

        <div className="space-y-3">
          {walletOptions.map(opt => (
            <button
              key={opt.name}
              onClick={opt.action}
              className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-all group"
            >
              <img src={opt.icon} alt={opt.name} className="w-10 h-10 mr-4 rounded-lg" />
              <div className="text-left flex-1">
                <span className="font-semibold text-brand-text-primary group-hover:text-brand-primary transition-colors">{opt.name}</span>
                <p className="text-xs text-brand-text-secondary/60">{getTranslation(opt.descKey)}</p>
              </div>
              <i className="fas fa-chevron-right text-brand-text-secondary/40 group-hover:text-brand-primary transition-colors"></i>
            </button>
          ))}
        </div>

        {!isMobile && (
          <p className="text-xs text-brand-text-secondary/60 mt-4 text-center">
            {getTranslation('walletDesktopHint')}
          </p>
        )}
      </div>
    </div>
  );
};
