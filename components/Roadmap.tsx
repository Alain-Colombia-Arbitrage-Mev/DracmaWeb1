
import React, { useContext } from 'react';
import { LanguageContext, AiModalContext } from '../App';
import { ROADMAP_DATA } from '../constants';

export const Roadmap: React.FC = () => {
  const { getTranslation, currentLang } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext);

  const handleRoadmapOutlook = () => {
    const prompt = `Basado en el roadmap de DRACMA (Fase 1: Cimientos y Presale; Fase 2: Expansión del Ecosistema RWA y listados; Fase 3: Consolidación Global y neutralidad de carbono; Fase 4: Liderazgo Visionario con Micronations DAO y +$50B AUM), genera una perspectiva inspiradora y realista (2-3 frases concisas) sobre el impacto potencial a largo plazo de DRACMA en el panorama de inversión Web3 y la economía descentralizada, si logra ejecutar su visión. Mantén un tono profesional, humano y fácil de entender. Idioma de la respuesta: ${currentLang}.`;
    showAiModal('aiModalTitleRoadmap', prompt);
  };

  return (
    <section id="roadmap" className="py-20 bg-brand-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-section-display brand-accent-gold-text">
            {getTranslation('roadmapTitle')}
          </h2>
          <div className="w-28 h-1.5 bg-gradient-to-r from-brand-accent-gold to-brand-secondary mx-auto mb-8 rounded-full"></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed">
            {getTranslation('roadmapSubtitle')}
          </p>
        </div>
        <div className="relative roadmap-timeline max-w-3xl mx-auto">
          {ROADMAP_DATA.map((item, index) => (
            <div key={item.titleKey} className={`roadmap-item ${index % 2 === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}>
              <div className={`roadmap-icon ${item.itemIconBgClass} ${item.itemIconShadowClass}`}>
                <i className={`${item.iconClass} text-brand-background text-xl`}></i>
              </div>
              <div className="roadmap-content">
                <h3 className={`text-xl font-bold mb-2 font-display ${item.itemTitleColorClass}`}>
                  {getTranslation(item.titleKey)}
                </h3>
                <ul className="list-disc list-inside text-brand-text-secondary/90 text-sm space-y-1.5 pl-2">
                  {getTranslation(item.listKey).split('|').map((listItem, i) => (
                    <li key={i}>{listItem}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12 animate-fade-in-zoom">
          <button onClick={handleRoadmapOutlook} className="btn-ai-feature text-base">
            <i className="fas fa-chart-line mr-2"></i> <span>{getTranslation('btnRoadmapOutlook')}</span>
          </button>
        </div>
      </div>
    </section>
  );
};