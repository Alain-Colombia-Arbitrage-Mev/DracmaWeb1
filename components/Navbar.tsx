
import React, { useContext } from 'react';
import { NavLinkItem, Translations } from '../types';
import { LanguageContext } from '../App';

interface Language {
  code: string;
  name: string;
}
interface NavbarProps {
  navLinks: NavLinkItem[];
  languages: Language[];
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  onConnectWallet: ()  => void;
  onNavLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}

const NavLogo: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-9 h-9 mr-2 transform transition-transform duration-700 hover:rotate-[360deg] hover:scale-110">
      <defs><linearGradient id="navLogoGradientNew" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F0E68C"/><stop offset="100%" stopColor="#D4AF37"/></linearGradient></defs>
      <path d="M50 15 C 35 20, 20 35, 20 50 C 20 65, 35 80, 50 85 C 65 80, 80 65, 80 50 C 80 35, 65 20, 50 15 Z M 50 25 C 58.28 25, 65 31.72, 65 40 C 65 48.28, 58.28 55, 50 55 C 41.72 55, 35 48.28, 35 40 C 35 31.72, 41.72 25, 50 25 Z" fill="url(#navLogoGradientNew)" />
      <circle cx="50" cy="40" r="8" fill="#2C3E50" opacity="0.7"/>
  </svg>
);


export const Navbar: React.FC<NavbarProps> = ({
  navLinks,
  languages,
  isMobileMenuOpen,
  toggleMobileMenu,
  onConnectWallet,
  onNavLinkClick
}) => {
  const { getTranslation, currentLang, changeLanguage } = useContext(LanguageContext);

  const handleLanguageChange = (e: React.MouseEvent<HTMLAnchorElement>, langCode: string) => {
    e.preventDefault();
    changeLanguage(langCode);
  };

  return (
    <nav className="fixed w-full z-50 bg-brand-background/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <a href="#hero" onClick={(e) => onNavLinkClick(e, "#hero")} className="flex-shrink-0 flex items-center text-3xl font-bold brand-accent-gold-gradient-text title-main-display">
              <NavLogo />
              DRACMA
            </a>
          </div>
          <div className="hidden md:flex items-center">
            <div className="ml-10 flex items-baseline space-x-5">
              {navLinks.map(link => (
                <a
                  key={link.key}
                  href={link.href}
                  onClick={(e) => onNavLinkClick(e, link.href)}
                  className={link.isActive ? 'nav-link-active' : 'nav-link'}
                >
                  {getTranslation(link.key)}
                </a>
              ))}
            </div>
            <div className="language-selector ml-6">
              <button id="current-language-btn" className="flex items-center text-brand-text-secondary hover:text-brand-primary transition duration-300 text-sm font-semibold">
                <i className="fas fa-globe mr-1.5"></i>
                <span id="current-language-text">{currentLang.toUpperCase()}</span>
                <i className="fas fa-chevron-down fa-xs ml-1.5 transform transition-transform duration-200 group-hover:rotate-180"></i>
              </button>
              <div id="language-dropdown" className="language-dropdown">
                {languages.map(lang => (
                  <a
                    key={lang.code}
                    href="#"
                    data-lang={lang.code}
                    onClick={(e) => handleLanguageChange(e, lang.code)}
                    className={currentLang === lang.code ? 'active-lang' : ''}
                  >
                    {lang.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:block ml-4">
            <button onClick={onConnectWallet} className="btn-primary py-2.5 px-6 text-sm">
              {getTranslation('btnConnectWallet')}
            </button>
          </div>
          <div className="-mr-2 flex md:hidden items-center">
            <div className="language-selector mr-2">
              <button id="current-language-btn-mobile" className="flex items-center text-brand-text-secondary hover:text-brand-primary transition duration-300 p-2 rounded-md">
                <i className="fas fa-globe"></i>
                <span id="current-language-text-mobile" className="ml-1 text-xs">{currentLang.toUpperCase()}</span>
              </button>
              <div id="language-dropdown-mobile" className="language-dropdown !right-auto left-0 min-w-[120px]">
                 {languages.map(lang => (
                  <a
                    key={lang.code}
                    href="#"
                    data-lang={lang.code}
                    onClick={(e) => handleLanguageChange(e, lang.code)}
                    className={currentLang === lang.code ? 'active-lang' : ''}
                  >
                    {lang.name}
                  </a>
                ))}
              </div>
            </div>
            <button
              type="button"
              id="mobile-menu-button"
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-brand-text-secondary hover:text-brand-primary focus:outline-none transition-colors"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">{getTranslation('srOpenMenu')}</span>
              {isMobileMenuOpen ? <i className="fas fa-times text-2xl"></i> : <i className="fas fa-bars text-2xl"></i>}
            </button>
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden bg-brand-background/95 backdrop-blur-lg border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map(link => (
              <a
                key={link.key}
                href={link.href}
                onClick={(e) => onNavLinkClick(e, link.href)}
                className={`block text-base py-3 ${link.isActive ? 'nav-link-active' : 'nav-link'}`}
              >
                {getTranslation(link.key)}
              </a>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200 px-5">
            <button onClick={onConnectWallet} className="w-full btn-primary py-2.5">
              {getTranslation('btnConnectWallet')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};