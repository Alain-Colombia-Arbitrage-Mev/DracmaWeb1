
import React, { useContext } from 'react';
import { LanguageContext, AiModalContext } from '../App';
import { VISION_CARDS_DATA } from '../constants';

export const Vision: React.FC = () => {
  const { getTranslation } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext);

  const handleExplorePhilosophy = () => {
    const prompt = `Explica la filosofía de DRACMA de forma concisa y motivadora, como si fueras un IA entusiasta. DRACMA es un holding Web3 que une activos reales, IA y blockchain para un futuro financiero accesible y transparente, empoderando a la comunidad. Menciona brevemente cómo transforma oro, bienes raíces, energía renovable y agricultura. El objetivo es inspirar confianza y mostrar un futuro próspero. Idioma de la respuesta: ${document.documentElement.lang}.`;
    showAiModal('aiModalTitlePhilosophy', prompt);
  };
  
  return (
    <section id="vision" className="py-20 bg-brand-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-section-display brand-accent-gold-text">
            {getTranslation('visionTitle')}
          </h2>
          <div className="w-28 h-1.5 bg-gradient-to-r from-brand-primary to-brand-secondary mx-auto mb-8 rounded-full"></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed" dangerouslySetInnerHTML={{ __html: getTranslation('visionSubtitle').replace(/\n/g, '<br />') }} />
          <div className="mt-10">
            <button onClick={handleExplorePhilosophy} className="btn-ai-feature text-base">
              <i className="fas fa-brain mr-2"></i> <span>{getTranslation('btnExplorePhilosophy')}</span>
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {VISION_CARDS_DATA.map((card, index) => (
            <div key={card.titleKey} className={`card-ui ${index === 0 ? 'animate-slide-in-left' : index === 1 ? 'animate-fade-in-zoom' : 'animate-slide-in-right'}`} style={{animationDelay: `${0.2 * (index + 1)}s`}}>
              <div className={`${card.gradientClass} w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${card.shadowClass}`}>
                <i className={`${card.iconClass} text-3xl ${card.titleKey === 'visionCard1Title' ? 'text-brand-text-primary' : 'text-white'}`}></i>
              </div>
              <h3 className={`text-2xl font-bold mb-4 font-display ${
                  card.titleKey === 'visionCard1Title' ? 'brand-accent-gold-text' : 
                  card.titleKey === 'visionCard2Title' ? 'brand-primary-text' : 'brand-secondary-text'
              }`}>
                {getTranslation(card.titleKey)}
              </h3>
              <p className="text-brand-text-secondary text-sm">
                {getTranslation(card.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};