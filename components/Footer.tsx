
import React, { useContext } from 'react';
import { LanguageContext, WhitepaperModalContext } from '../App';
import { WalletContext } from '../contexts/WalletContext';
import { FOOTER_SECTIONS_DATA, FOOTER_SOCIAL_LINKS } from '../constants';

interface FooterProps {
    onNavLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}

const FooterLogo: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-8 h-8 mr-2">
        <defs><linearGradient id="footLogoGradNew2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F0E68C"/><stop offset="100%" stopColor="#D4AF37"/></linearGradient></defs>
        <path d="M50 15 C 35 20, 20 35, 20 50 C 20 65, 35 80, 50 85 C 65 80, 80 65, 80 50 C 80 35, 65 20, 50 15 Z M 50 25 C 58.28 25, 65 31.72, 65 40 C 65 48.28, 58.28 55, 50 55 C 41.72 55, 35 48.28, 35 40 C 35 31.72, 41.72 25, 50 25 Z" fill="url(#footLogoGradNew2)" />
    </svg>
);

export const Footer: React.FC<FooterProps> = ({ onNavLinkClick }) => {
  const { getTranslation } = useContext(LanguageContext);
  const { showWhitepaperModal } = useContext(WhitepaperModalContext);
  const { wallet, connectWallet } = useContext(WalletContext);

  const handleFooterLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, isWhitepaper?: boolean) => {
    if (isWhitepaper) {
        e.preventDefault();
        showWhitepaperModal();
    } else {
        onNavLinkClick(e, href);
    }
  };

  return (
    <footer className="bg-brand-background border-t-2 border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <a href="#hero" onClick={(e) => onNavLinkClick(e, "#hero")} className="flex items-center text-2xl font-bold brand-accent-gold-text title-main-display mb-4">
              <FooterLogo />
              DRACMA
            </a>
            <p className="text-brand-text-secondary/70 text-sm mb-6">{getTranslation('footerDesc')}</p>
            {wallet.isConnected ? (
              <div className="flex items-center bg-brand-background/80 rounded-full py-1.5 px-3 border border-gray-200 shadow-sm inline-flex">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-xs font-mono text-brand-text-primary">
                  {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                </span>
              </div>
            ) : (
              <button onClick={connectWallet} className="btn-primary py-2.5 px-5 text-sm">{getTranslation('btnConnectWallet')}</button>
            )}
          </div>
          {FOOTER_SECTIONS_DATA.map(section => (
            <div key={section.titleKey}>
              <h4 className={`text-lg font-semibold mb-4 font-display ${section.titleColorClass}`}>{getTranslation(section.titleKey)}</h4>
              <ul className="space-y-2 text-sm">
                {section.links.map(link => (
                  <li key={link.key}>
                    <a
                        href={link.href}
                        onClick={(e) => handleFooterLinkClick(e, link.href, link.isWhitepaperModalTrigger)}
                        className={`text-brand-text-secondary/80 transition ${
                            section.titleColorClass === 'brand-accent-gold-text' ? 'hover:text-brand-accent-gold' :
                            section.titleColorClass === 'brand-primary-text' ? 'hover:text-brand-primary' :
                            'hover:text-brand-secondary'
                        }`}
                    >
                        {getTranslation(link.key)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-brand-text-secondary/60 text-xs font-mono mb-4 md:mb-0">{getTranslation('footerCopyright')}</p>
          <div className="flex space-x-5">
            {FOOTER_SOCIAL_LINKS.map(link => (
              <a key={link.label} href={link.href} aria-label={link.label} target="_blank" rel="noopener noreferrer" className={`text-brand-text-secondary/70 transition ${link.hoverColorClass}`}>
                <i className={link.iconClass}></i>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
