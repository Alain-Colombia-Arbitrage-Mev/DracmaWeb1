import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $currentLang, $translations, changeLanguage, showAiModal, $aiModalInfo, getTranslation, $theme, toggleTheme, initTheme, initLang } from '../../stores/appStore';
import { NAV_LINKS, LANGUAGES, BLOCKCHAIN_NETWORKS } from '../../data/constants';
import type { PresaleBlockchain } from '../../types';

const NavLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-9 h-9 mr-2 transform transition-transform duration-700 hover:rotate-[360deg] hover:scale-110">
    <defs><linearGradient id="navLogoGradientNew" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F0E68C"/><stop offset="100%" stopColor="#D4AF37"/></linearGradient></defs>
    <path d="M50 15 C 35 20, 20 35, 20 50 C 20 65, 35 80, 50 85 C 65 80, 80 65, 80 50 C 80 35, 65 20, 50 15 Z M 50 25 C 58.28 25, 65 31.72, 65 40 C 65 48.28, 58.28 55, 50 55 C 41.72 55, 35 48.28, 35 40 C 35 31.72, 41.72 25, 50 25 Z" fill="url(#navLogoGradientNew)" />
    <circle cx="50" cy="40" r="8" fill="#2C3E50" opacity="0.7"/>
  </svg>
);

export default function Navbar() {
  const currentLang = useStore($currentLang);
  const translations = useStore($translations);
  const theme = useStore($theme);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => { initTheme(); initLang(); }, []);

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const handleLanguageChange = (e: React.MouseEvent<HTMLAnchorElement>, langCode: string) => {
    e.preventDefault();
    // Navigate to the correct locale URL
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
    const connectingText = t('walletConnecting');
    showAiModal('walletConnecting', undefined, `<div class="flex items-center justify-center mb-3"><i class="fas fa-spinner fa-spin text-2xl mr-3"></i><span class="text-lg">${connectingText}</span></div><p class="text-xs font-sans text-brand-text-secondary/80">${t('walletSim')}</p><div class="w-full h-1 bg-brand-primary/30 rounded-full mt-4 overflow-hidden"><div class="h-full bg-brand-primary animate-pulse" style="width: 0%; animation: fakeLoad 3s linear forwards;"></div></div><style> @keyframes fakeLoad { 0% { width: 0%; } 100% { width: 100%; } } </style>`);
    setTimeout(() => {
      const current = $aiModalInfo.get();
      if (current.isOpen && current.titleKey === 'walletConnecting') {
        $aiModalInfo.set({ ...current, isOpen: false });
      }
    }, 3500);
  }, [translations]);

  return (
    <nav className="fixed w-full z-50 backdrop-blur-lg" style={{background: 'var(--th-nav-bg)', borderBottom: '1px solid var(--th-nav-border)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <a href="#hero" onClick={(e) => handleNavClick(e, "#hero")} className="flex-shrink-0 flex items-center text-3xl font-bold brand-accent-gold-gradient-text title-main-display">
              <NavLogo />
              DRACMA
            </a>
          </div>
          <div className="hidden md:flex items-center">
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
            <div className="language-selector ml-3">
              <button className="flex items-center text-brand-text-secondary hover:text-brand-primary transition duration-300 text-sm font-semibold">
                <i className="fas fa-globe mr-1.5"></i>
                <span>{currentLang.toUpperCase()}</span>
                <i className="fas fa-chevron-down fa-xs ml-1.5"></i>
              </button>
              <div className="language-dropdown">
                {LANGUAGES.map(lang => (
                  <a key={lang.code} href="#" onClick={(e) => handleLanguageChange(e, lang.code)} className={currentLang === lang.code ? 'active-lang' : ''}>
                    {lang.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:block ml-4">
            <button onClick={handleConnectWallet} className="btn-primary py-2.5 px-6 text-sm">{t('btnConnectWallet')}</button>
          </div>
          <div className="-mr-2 flex md:hidden items-center">
            <button onClick={toggleTheme} className="theme-toggle mr-1" aria-label="Toggle theme">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
            </button>
            <div className="language-selector mr-2">
              <button className="flex items-center text-brand-text-secondary hover:text-brand-primary transition duration-300 p-2 rounded-md">
                <i className="fas fa-globe"></i>
                <span className="ml-1 text-xs">{currentLang.toUpperCase()}</span>
              </button>
              <div className="language-dropdown !right-auto left-0 min-w-[120px]">
                {LANGUAGES.map(lang => (
                  <a key={lang.code} href="#" onClick={(e) => handleLanguageChange(e, lang.code)} className={currentLang === lang.code ? 'active-lang' : ''}>
                    {lang.name}
                  </a>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setIsMobileMenuOpen(prev => !prev)} className="inline-flex items-center justify-center p-2 rounded-md focus:outline-none transition-colors" style={{color: 'var(--th-text-secondary)'}} aria-expanded={isMobileMenuOpen}>
              <span className="sr-only">{t('srOpenMenu')}</span>
              {isMobileMenuOpen ? <i className="fas fa-times text-2xl"></i> : <i className="fas fa-bars text-2xl"></i>}
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="md:hidden backdrop-blur-lg" style={{background: 'var(--th-nav-bg)', borderTop: '1px solid var(--th-nav-border)'}}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {NAV_LINKS.map(link => (
              <a key={link.key} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className={`block text-base py-3 ${link.isActive ? 'nav-link-active' : 'nav-link'}`}>
                {t(link.key)}
              </a>
            ))}
          </div>
          <div className="pt-4 pb-3 px-5" style={{borderTop: '1px solid var(--th-border)'}}>
            <button onClick={handleConnectWallet} className="w-full btn-primary py-2.5">{t('btnConnectWallet')}</button>
          </div>
        </div>
      )}
    </nav>
  );
}
