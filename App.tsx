
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Vision } from './components/Vision';
import { Ecosystem } from './components/Ecosystem';
import { Crowdfunding } from './components/Crowdfunding';
import { Membership } from './components/Membership';
import { Presale } from './components/Presale';
import { Roadmap } from './components/Roadmap';
import { Ambassadors } from './components/Ambassadors';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { AiModal } from './components/AiModal';
import { WhitepaperModal } from './components/WhitepaperModal';
import { WalletModalWrapper } from './components/WalletModalWrapper';
import { SectionDivider } from './components/SectionDivider';
import { TRANSLATIONS, PRESALE_DATA, LANGUAGES, NAV_LINKS } from './constants';
import { Translations, LanguageData, AiModalInfo, WhitepaperModalInfo } from './types';
import { callGeminiAPI } from './services/geminiService';
import { WalletProvider } from './contexts/WalletContext';

// Context for managing language
export const LanguageContext = React.createContext<{
  translations: Translations;
  currentLang: string;
  changeLanguage: (lang: string) => void;
  getTranslation: (key: string, fallback?: string) => string;
}>({
  translations: TRANSLATIONS.es,
  currentLang: 'es',
  changeLanguage: () => {},
  getTranslation: (key, fallback = '') => TRANSLATIONS.es[key] || fallback || key,
});

// Context for AI Modal
export const AiModalContext = React.createContext<{
  aiModalInfo: AiModalInfo;
  showAiModal: (titleKey: string, prompt?: string, specificContent?: string) => Promise<void>;
  closeAiModal: () => void;
  setAiModalInfo: React.Dispatch<React.SetStateAction<AiModalInfo>>;
}>({
  aiModalInfo: { isOpen: false, titleKey: '', content: '', isLoading: false, showCopyButton: false },
  showAiModal: async () => {},
  closeAiModal: () => {},
  setAiModalInfo: () => {},
});

// Context for Whitepaper Modal
export const WhitepaperModalContext = React.createContext<{
  whitepaperModalInfo: WhitepaperModalInfo;
  showWhitepaperModal: () => void;
  closeWhitepaperModal: () => void;
}>({
  whitepaperModalInfo: { isOpen: false },
  showWhitepaperModal: () => {},
  closeWhitepaperModal: () => {},
});


const App: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<string>('es');
  const [translations, setTranslations] = useState<Translations>(TRANSLATIONS.es);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  const [aiModalInfo, setAiModalInfo] = useState<AiModalInfo>({
    isOpen: false,
    titleKey: '',
    content: '',
    isLoading: false,
    showCopyButton: false,
  });

  const [whitepaperModalInfo, setWhitepaperModalInfo] = useState<WhitepaperModalInfo>({isOpen: false});

  const appRef = useRef<HTMLDivElement>(null);

  const getTranslation = useCallback((key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  }, [translations]);
  
  const changeLanguage = useCallback((lang: string) => {
    const newTranslations = (TRANSLATIONS as LanguageData)[lang] || TRANSLATIONS.es;
    setTranslations(newTranslations);
    setCurrentLang(lang);
    document.documentElement.lang = lang;
    document.body.className = document.body.className.replace(/lang-\w+/g, '');
    document.body.classList.add(`lang-${lang}`);
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    changeLanguage('es'); 
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleSectionScroll = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  const showAiModal = useCallback(async (titleKey: string, prompt?: string, specificContent?: string) => {
    setAiModalInfo({ isOpen: true, titleKey, content: '', isLoading: true, showCopyButton: false });
    if (specificContent) {
        setAiModalInfo(prev => ({ ...prev, content: specificContent, isLoading: false, showCopyButton: true }));
    } else if (prompt) {
        const aiResponse = await callGeminiAPI(prompt, currentLang, getTranslation);
        setAiModalInfo(prev => ({ ...prev, content: aiResponse, isLoading: false, showCopyButton: true }));
    } else {
        setAiModalInfo(prev => ({ ...prev, content: getTranslation('aiModalError', 'Error generating content.'), isLoading: false, showCopyButton: false }));
    }
  }, [currentLang, getTranslation]);

  const closeAiModal = useCallback(() => {
    setAiModalInfo(prev => ({ ...prev, isOpen: false }));
  }, []);
  
  const showWhitepaperModal = useCallback(() => {
    setWhitepaperModalInfo({ isOpen: true });
  }, []);

  const closeWhitepaperModal = useCallback(() => {
    setWhitepaperModalInfo({ isOpen: false });
  }, []);

  useEffect(() => {
    const animatedElements = appRef.current?.querySelectorAll('.animate-slide-in-left, .animate-slide-in-right, .animate-fade-in-zoom, .animate-on-visible');
    if (!animatedElements) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('opacity-100', 'translate-y-0', 'translate-x-0', 'scale-100');
                entry.target.classList.remove('opacity-0');
                if(entry.target.classList.contains('animate-slide-in-left-init')) entry.target.classList.remove('translate-x-[-30px]');
                if(entry.target.classList.contains('animate-slide-in-right-init')) entry.target.classList.remove('translate-x-[30px]');
                if(entry.target.classList.contains('animate-fade-in-zoom-init')) entry.target.classList.remove('scale-95');
                if(entry.target.classList.contains('title-underline-animated')) { // Trigger underline animation
                    // The animation is handled by CSS class 'animate-on-visible' and keyframes
                }
                 observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    animatedElements.forEach(el => {
        el.classList.add('opacity-0', 'transition-all', 'duration-[800ms]', 'ease-[cubic-bezier(0.175,0.885,0.32,1.275)]');
        if (el.classList.contains('animate-slide-in-left')) el.classList.add('translate-x-[-30px]', 'animate-slide-in-left-init');
        if (el.classList.contains('animate-slide-in-right')) el.classList.add('translate-x-[30px]', 'animate-slide-in-right-init');
        if (el.classList.contains('animate-fade-in-zoom')) el.classList.add('scale-95', 'animate-fade-in-zoom-init');
        // For title underlines, ensure 'animate-on-visible' is applied if animation should trigger on visibility
        // The CSS already handles the animation for .animate-on-visible.title-underline-animated::after
        observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);


  return (
    <LanguageContext.Provider value={{ translations, currentLang, changeLanguage, getTranslation }}>
      <WalletProvider>
        <AiModalContext.Provider value={{ aiModalInfo, showAiModal, closeAiModal, setAiModalInfo }}>
          <WhitepaperModalContext.Provider value={{ whitepaperModalInfo, showWhitepaperModal, closeWhitepaperModal }}>
            <div ref={appRef} className={`antialiased font-sans text-brand-text-secondary lang-${currentLang}`}>
              <Navbar
                navLinks={NAV_LINKS}
                languages={LANGUAGES}
                isMobileMenuOpen={isMobileMenuOpen}
                toggleMobileMenu={toggleMobileMenu}
                onNavLinkClick={handleSectionScroll}
              />
              <main>
                <Hero />
                <Vision />
                <SectionDivider />
                <Ecosystem />
                <SectionDivider />
                <Crowdfunding />
                <SectionDivider />
                <Membership />
                <SectionDivider />
                <Presale presaleData={PRESALE_DATA} />
                <SectionDivider />
                <Roadmap />
                <SectionDivider />
                <Ambassadors />
                <SectionDivider />
                <Contact />
              </main>
              <Footer onNavLinkClick={handleSectionScroll} />
              <AiModal />
              <WhitepaperModal />
              <WalletModalWrapper />
            </div>
          </WhitepaperModalContext.Provider>
        </AiModalContext.Provider>
      </WalletProvider>
    </LanguageContext.Provider>
  );
};

export default App;
