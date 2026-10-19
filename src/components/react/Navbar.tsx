import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { useAccount, useConnect, useDisconnect, useConnectors } from 'wagmi';
import { $currentLang, $translations, changeLanguage, showAiModal, $aiModalInfo, getTranslation, $theme, toggleTheme, initTheme, initLang } from '../../stores/appStore';
import { NAV_LINKS, LANGUAGES, BLOCKCHAIN_NETWORKS } from '../../data/constants';
import type { PresaleBlockchain } from '../../types';
import Web3Provider from './Web3Provider';

const NavLogo = () => (
  <img src="/brand/dracma-eagle.webp" alt="" width="42" height="49" className="brand-logo" />
);

function NavbarInner() {
  const currentLang = useStore($currentLang);
  const translations = useStore($translations);
  const theme = useStore($theme);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileLangOpen, setIsMobileLangOpen] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  useEffect(() => { initTheme(); initLang(); }, []);

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const handleLanguageChange = (e: React.MouseEvent<HTMLAnchorElement>, langCode: string) => {
    e.preventDefault();
    const basePath = langCode === 'es' ? '/' : `/${langCode}/`;
    window.location.href = basePath;
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleConnectWallet = useCallback(() => {
    // Use injected wallet if available (MetaMask, Trust Wallet in-app browser),
    // otherwise fall back to WalletConnect (QR code / deep link for mobile)
    const hasInjected = typeof window !== 'undefined' && !!(window as any).ethereum;
    const connector = hasInjected
      ? connectors.find(c => c.id === 'injected')
      : connectors.find(c => c.id === 'walletConnect');
    if (connector) {
      connect({ connector });
    }
  }, [connect, connectors]);

  return (
    <nav className="site-navigation fixed w-full z-50 backdrop-blur-lg" style={{background: 'var(--th-nav-bg)', borderBottom: '1px solid var(--th-nav-border)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <a href="#hero" onClick={(e) => handleNavClick(e, "#hero")} className="brand-wordmark flex-shrink-0 flex items-center">
              <NavLogo />
              DRACMA
            </a>
          </div>
          <div className="hidden xl:flex items-center">
            <div className="ml-10 flex items-baseline space-x-5">
              {NAV_LINKS.map(link => (
                <a key={link.key} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className={link.isActive ? 'nav-link-active' : 'nav-link'}>
                  {t(link.key)}
                </a>
              ))}
            </div>
            <button onClick={toggleTheme} className="theme-toggle ml-4" aria-label="Toggle theme">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
            </button>
            <div className="language-selector ml-3" onMouseEnter={() => setIsLangOpen(true)} onMouseLeave={() => setIsLangOpen(false)}>
              <button
                onClick={() => setIsLangOpen(prev => !prev)}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsLangOpen(false); }}
                aria-expanded={isLangOpen}
                aria-haspopup="true"
                aria-label={t('srLanguageSelector', 'Select language')}
                className="flex items-center text-brand-text-secondary hover:text-brand-primary transition duration-300 text-sm font-semibold"
              >
                <i className="fas fa-globe mr-1.5" aria-hidden="true"></i>
                <span>{currentLang.toUpperCase()}</span>
                <i className="fas fa-chevron-down fa-xs ml-1.5" aria-hidden="true"></i>
              </button>
              <div className={`language-dropdown ${isLangOpen ? '!opacity-100 !translate-y-0 !pointer-events-auto' : ''}`} role="menu">
                {LANGUAGES.map(lang => (
                  <a key={lang.code} href="#" role="menuitem" onClick={(e) => { handleLanguageChange(e, lang.code); setIsLangOpen(false); }} onKeyDown={(e) => { if (e.key === 'Escape') setIsLangOpen(false); }} className={currentLang === lang.code ? 'active-lang' : ''}>
                    {lang.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden xl:block ml-4">
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-brand-secondary">{truncatedAddress}</span>
                <button onClick={() => disconnect()} className="btn-primary py-2 px-4 text-xs">{t('btnDisconnect', 'Desconectar')}</button>
              </div>
            ) : (
              <button onClick={handleConnectWallet} disabled={isConnecting} className="btn-primary py-2.5 px-6 text-sm">
                {isConnecting ? <><i className="fas fa-spinner fa-spin mr-2"></i>{t('walletConnecting', 'Conectando...')}</> : t('btnConnectWallet')}
              </button>
            )}
          </div>
          <div className="-mr-2 flex xl:hidden items-center">
            <button onClick={toggleTheme} className="theme-toggle mr-1" aria-label="Toggle theme">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
            </button>
            <div className="language-selector mr-2" onMouseEnter={() => setIsMobileLangOpen(true)} onMouseLeave={() => setIsMobileLangOpen(false)}>
              <button
                onClick={() => setIsMobileLangOpen(prev => !prev)}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsMobileLangOpen(false); }}
                aria-expanded={isMobileLangOpen}
                aria-haspopup="true"
                aria-label={t('srLanguageSelector', 'Select language')}
                className="flex items-center text-brand-text-secondary hover:text-brand-primary transition duration-300 p-2 rounded-md"
              >
                <i className="fas fa-globe" aria-hidden="true"></i>
                <span className="ml-1 text-xs">{currentLang.toUpperCase()}</span>
              </button>
              <div className={`language-dropdown right-0 left-auto min-w-[120px] ${isMobileLangOpen ? '!opacity-100 !translate-y-0 !pointer-events-auto' : ''}`} role="menu">
                {LANGUAGES.map(lang => (
                  <a key={lang.code} href="#" role="menuitem" onClick={(e) => { handleLanguageChange(e, lang.code); setIsMobileLangOpen(false); }} onKeyDown={(e) => { if (e.key === 'Escape') setIsMobileLangOpen(false); }} className={currentLang === lang.code ? 'active-lang' : ''}>
                    {lang.name}
                  </a>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setIsMobileMenuOpen(prev => !prev)} className="inline-flex items-center justify-center p-2 rounded-md transition-colors" style={{color: 'var(--th-text-secondary)'}} aria-controls="mobile-navigation" aria-expanded={isMobileMenuOpen} aria-label={isMobileMenuOpen ? t('srCloseMenu', 'Close menu') : t('srOpenMenu', 'Open menu')}>
              {isMobileMenuOpen ? <i className="fas fa-times text-2xl" aria-hidden="true"></i> : <i className="fas fa-bars text-2xl" aria-hidden="true"></i>}
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div id="mobile-navigation" className="mobile-navigation xl:hidden backdrop-blur-lg" style={{background: 'var(--th-nav-bg)', borderTop: '1px solid var(--th-nav-border)'}}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {NAV_LINKS.map(link => (
              <a key={link.key} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className={`block text-base py-3 ${link.isActive ? 'nav-link-active' : 'nav-link'}`}>
                {t(link.key)}
              </a>
            ))}
          </div>
          <div className="pt-4 pb-3 px-5" style={{borderTop: '1px solid var(--th-border)'}}>
            {isConnected ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-mono text-brand-secondary">{truncatedAddress}</span>
                <button onClick={() => disconnect()} className="w-full btn-primary py-2.5">{t('btnDisconnect', 'Desconectar')}</button>
              </div>
            ) : (
              <button onClick={handleConnectWallet} disabled={isConnecting} className="w-full btn-primary py-2.5">
                {isConnecting ? <><i className="fas fa-spinner fa-spin mr-2"></i>{t('walletConnecting', 'Conectando...')}</> : t('btnConnectWallet')}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default function Navbar() {
  return (
    <Web3Provider>
      <NavbarInner />
    </Web3Provider>
  );
}
