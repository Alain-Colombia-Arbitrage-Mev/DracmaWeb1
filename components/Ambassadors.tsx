
import React, { useContext, useState } from 'react';
import { LanguageContext } from '../App';
import { AMBASSADORS_DATA } from '../constants';
import { callGeminiAPI } from '../services/geminiService';

export const Ambassadors: React.FC = () => {
  const { getTranslation, currentLang } = useContext(LanguageContext);

  const [generatedPitch, setGeneratedPitch] = useState<string>('');
  const [isPitchLoading, setIsPitchLoading] = useState<boolean>(false);
  const [pitchError, setPitchError] = useState<string>('');

  const handleGeneratePitch = async () => {
    const prompt = `Eres un experto en marketing y copywriting para proyectos Web3. Genera un 'elevator pitch' conciso (3-4 frases cortas) y persuasivo para un embajador que quiera promover el proyecto DRACMA. DRACMA es un holding empresarial descentralizado con respaldo en activos reales (oro, bienes raíces, energía solar, agricultura sostenible), impulsado por IA y gobernado por una DAO. Ofrece staking del 14% APR, dividendos y una tarjeta de membresía exclusiva. Enfócate en el potencial de transformación y los beneficios para los inversores y la comunidad. Adapta el tono para que sea profesional, visionario y emocionante. Idioma de la respuesta: ${currentLang}.`;
    
    setIsPitchLoading(true);
    setGeneratedPitch(''); 
    setPitchError('');
    
    const pitchOutputEl = document.getElementById('ai-ambassador-pitch-output');
    if(pitchOutputEl) {
      pitchOutputEl.innerHTML = `<div class="flex items-center justify-center p-4 text-sm text-brand-text-secondary"><div class="ai-modal-loader !w-6 !h-6 !border-2 !mx-0 !my-0 !mr-3"></div> ${getTranslation('aiModalLoading')}</div>`;
      pitchOutputEl.classList.remove('hidden', 'opacity-0');
      pitchOutputEl.classList.add('opacity-100');
    }

    try {
        const aiResponse = await callGeminiAPI(prompt, currentLang, getTranslation);
        if (aiResponse.toLowerCase().includes("error") || aiResponse.includes(getTranslation('aiModalError').substring(0,10))) {
            setPitchError(aiResponse);
            setGeneratedPitch(''); 
        } else {
            setGeneratedPitch(aiResponse);
            setPitchError('');
        }
    } catch (error: any) {
        console.error("Error generating ambassador pitch:", error);
        const errorMessage = error.message || getTranslation('aiModalError', 'Error al generar el pitch.');
        setPitchError(errorMessage);
        setGeneratedPitch('');
    } finally {
        setIsPitchLoading(false);
        if(pitchOutputEl) {
            if (pitchError) { 
                 pitchOutputEl.innerHTML = `<div class="p-3 bg-red-100 border border-red-300 rounded-md text-sm text-red-700 shadow-sm">${pitchError}</div>`;
            } else if (generatedPitch) { 
                 pitchOutputEl.innerHTML = `<textarea aria-label="${getTranslation('aiModalTitlePitch')}" class="w-full h-36 p-3 bg-surface-medium/70 border border-gray-300/80 rounded-lg text-brand-text-primary text-sm resize-none shadow-inner focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all" readonly>${generatedPitch}</textarea>`;
            } else { 
                 pitchOutputEl.classList.add('hidden', 'opacity-0');
                 pitchOutputEl.classList.remove('opacity-100');
                 pitchOutputEl.innerHTML = ''; 
            }
        }
    }
  };

  const clearPitch = () => {
    setGeneratedPitch('');
    setPitchError('');
    const pitchOutputEl = document.getElementById('ai-ambassador-pitch-output');
    if(pitchOutputEl) {
        pitchOutputEl.classList.add('hidden', 'opacity-0');
        pitchOutputEl.classList.remove('opacity-100');
        pitchOutputEl.innerHTML = ''; 
    }
  };

  return (
    <section id="ambassadors" className="py-20 bg-brand-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-section-display brand-accent-gold-text">
            {getTranslation('ambassadorsTitle')}
          </h2>
          <div className="w-28 h-1.5 bg-gradient-to-r from-brand-accent-gold to-brand-secondary mx-auto mb-8 rounded-full"></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed">
            {getTranslation('ambassadorsSubtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {AMBASSADORS_DATA.map((tier, index) => (
            <div 
              key={tier.titleKey} 
              className={`card-ui glassmorphism-light ${index === 0 ? 'animate-slide-in-left' : index === 1 ? 'animate-fade-in-zoom' : 'animate-slide-in-right'} ${tier.isElite ? `relative ${tier.eliteBgClass ? tier.eliteBgClass.replace('bg-','border-') : 'border-brand-primary'} shadow-primary-glow` : ''}`}
              style={{ animationDelay: `${0.2 * (index + 1)}s`, transform: tier.isElite ? 'scale(1.05)' : 'scale(1)' }}
            >
              {tier.isElite && tier.eliteTagKey && (
                <div className={`absolute top-0 right-0 ${tier.eliteBgClass || 'bg-brand-primary'} text-white text-xs font-bold px-3 py-1.5 transform translate-x-2 -translate-y-2 rotate-12 shadow-md rounded-sm`}>
                  {getTranslation(tier.eliteTagKey)}
                </div>
              )}
              <div className={`${tier.iconBgGradientClass} w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto ${tier.iconShadowClass}`}>
                <i className={`${tier.iconClass} text-3xl ${index === 1 ? 'text-white': 'text-brand-text-primary'}`}></i>
              </div>
              <h3 className={`text-2xl font-bold mb-3 text-center font-display ${
                index === 0 ? 'brand-accent-gold-text' : index === 1 ? 'brand-primary-text' : 'brand-secondary-text'
              }`}>
                {getTranslation(tier.titleKey)}
              </h3>
              <p className="text-brand-text-secondary/90 text-sm mb-6 text-center">
                {getTranslation(tier.descKey)}
              </p>
              <div className="bg-gray-100 p-3 rounded-lg mb-6 text-center">
                <div className="text-brand-text-secondary/70 text-xs font-mono">{getTranslation(tier.rewardsTitleKey)}</div>
                <div className="font-bold text-brand-text-primary text-lg">{getTranslation(tier.rewardsDescKey)}</div>
              </div>
              <button className={tier.buttonClass}>{getTranslation(tier.buttonKey)}</button>
            </div>
          ))}
        </div>
        <div className="text-center mt-16 animate-fade-in-zoom">
          <button 
            onClick={handleGeneratePitch} 
            className="btn-ai-feature text-base py-3 px-8"
            disabled={isPitchLoading}
            aria-live="polite" 
            aria-busy={isPitchLoading} 
          >
            {isPitchLoading ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i> {getTranslation('aiModalLoading', 'Generando...')}</>
            ) : (
              <><i className="fas fa-lightbulb mr-2"></i> {getTranslation('btnGeneratePitch')}</>
            )}
          </button>
          <div 
              id="ai-ambassador-pitch-output" 
              className="mt-6 text-base bg-transparent rounded-lg min-h-[60px] max-w-2xl mx-auto text-left transition-opacity duration-300 ease-in-out opacity-0 hidden"
              aria-live="assertive" 
          >
            {/* Content will be dynamically set by handleGeneratePitch */}
          </div>
          {(!isPitchLoading && (generatedPitch || pitchError)) && (
            <button 
              onClick={clearPitch} 
              className="mt-4 text-xs text-brand-text-secondary hover:text-brand-primary underline transition-colors duration-200"
              aria-label="Limpiar pitch generado"
            >
                <i className="fas fa-times mr-1"></i> Limpiar Pitch
            </button>
          )}
        </div>
      </div>
    </section>
  );
};