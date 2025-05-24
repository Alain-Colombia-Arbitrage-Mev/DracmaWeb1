
import React, { useContext } from 'react';
import { LanguageContext, AiModalContext } from '../App';
import ThreeBackground from './ThreeBackground'; // Placeholder for Three.js background

export const Hero: React.FC = () => {
  const { getTranslation } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext); // Assuming you might want AI interaction here later

  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-32 min-h-screen flex items-center justify-center text-center overflow-hidden animated-gradient-subtle">
      <ThreeBackground />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="md:flex md:items-center md:justify-between">
          <div className="md:w-1/2 animate-slide-in-left text-center md:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 title-main-display">
              <span className="brand-accent-gold-gradient-text block">{getTranslation('heroTitleBrand')}</span>
              <span className="block text-3xl sm:text-4xl md:text-5xl text-brand-primary mt-2">{getTranslation('heroTitlePhoenix')}</span>
            </h1>
            <p className="text-xl text-brand-text-secondary mb-10 max-w-md mx-auto md:mx-0">
              {getTranslation('heroSubtitle')}
            </p>
            <div className="flex space-x-4 justify-center md:justify-start">
              <a href="#presale" className="btn-primary text-lg">
                {getTranslation('btnJoinPresale')}
              </a>
              <a href="#ecosystem" className="btn-secondary text-lg">
                {getTranslation('btnExplore')}
              </a>
            </div>
          </div>
          <div className="hidden md:flex md:w-1/2 justify-center mt-10 md:mt-0 animate-fade-in-zoom" style={{animationDelay: '0.3s'}}>
            <img 
              src="https://placehold.co/500x500/00000000/3B82F6?text=DRACMA+Concepto+Abstracto" 
              alt={getTranslation('altHeroAbstract', '[Representación Abstracta de DRACMA]')}
              className="hero-asset-animation h-80 w-auto md:h-[450px] filter drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};