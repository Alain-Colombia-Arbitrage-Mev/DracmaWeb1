
import React, { useContext } from 'react';
import { LanguageContext, AiModalContext } from '../App';
import { ECOSYSTEM_CARDS_DATA } from '../constants';

export const Ecosystem: React.FC = () => {
  const { getTranslation, currentLang } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext);

  const handleExplainComponent = (titleKey: string, descKey: string) => {
    const componentName = getTranslation(titleKey);
    const componentDesc = getTranslation(descKey);
    const prompt = `Explica de forma sencilla y amigable para un inversor potencial, la importancia y el funcionamiento de '${componentName}' (descrito como: '${componentDesc}') dentro del ecosistema DRACMA. DRACMA es un holding Web3 innovador que combina activos reales, IA y blockchain. Destaca los beneficios clave de este componente específico en 2-3 frases concisas, manteniendo un tono profesional pero accesible. Idioma de la respuesta: ${currentLang}.`;
    showAiModal('aiModalTitleEcosystem', prompt);
  };

  return (
    <section id="ecosystem" className="py-20 bg-brand-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-section-display brand-primary-text">
            {getTranslation('ecosystemTitle')}
          </h2>
          <div className="w-28 h-1.5 bg-gradient-to-r from-brand-primary to-brand-secondary mx-auto mb-8 rounded-full"></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed">
            {getTranslation('ecosystemSubtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ECOSYSTEM_CARDS_DATA.map((card, index) => (
            <div key={card.titleKey} className="card-ui animate-fade-in-zoom group" style={{animationDelay: `${0.1 * (index + 1)}s`}}>
              <div className="flex items-center mb-4">
                <i className={`${card.iconClass} fa-2x ${card.colorClass} mr-4 group-hover:scale-110 transition-transform`}></i>
                <h3 className={`text-xl font-bold ${card.colorClass} font-display`}>
                  {getTranslation(card.titleKey)}
                </h3>
              </div>
              <p className="text-brand-text-secondary text-sm mb-3">
                {getTranslation(card.descKey)}
              </p>
              <button 
                onClick={() => handleExplainComponent(card.titleKey, card.descKey)}
                className="btn-ai-feature-small analyze-eco-btn"
              >
                <i className="fas fa-robot mr-1.5"></i> <span>{getTranslation(card.aiButtonKey)}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};