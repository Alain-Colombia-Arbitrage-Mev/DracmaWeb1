import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $currentLang, $translations } from '../../stores/appStore';
import { callGeminiAPI } from '../../services/geminiService';
import { AMBASSADORS_DATA } from '../../data/constants';

export default function Ambassadors() {
  const currentLang = useStore($currentLang);
  const translations = useStore($translations);
  const [generatedPitch, setGeneratedPitch] = useState('');
  const [isPitchLoading, setIsPitchLoading] = useState(false);
  const [pitchError, setPitchError] = useState('');

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const handleGeneratePitch = async () => {
    const prompt = `Eres un experto en marketing y copywriting para proyectos Web3. Genera un 'elevator pitch' conciso (3-4 frases cortas) y persuasivo para un embajador que quiera promover el proyecto DRACMA. DRACMA es un holding empresarial descentralizado con proyectos de agricultura sostenible, granjas solares de minería de criptomonedas, una app de generación de empleo, wallet multi-cadena y chat seguro, todo impulsado por IA y gobernado por una DAO. Ofrece staking del 14% APR y membresías exclusivas. Enfócate en el potencial de transformación y los beneficios para los inversores y la comunidad. Idioma de la respuesta: ${currentLang}.`;

    setIsPitchLoading(true);
    setGeneratedPitch('');
    setPitchError('');

    try {
      const aiResponse = await callGeminiAPI(prompt, currentLang, t);
      if (aiResponse.toLowerCase().includes("error") || aiResponse.includes(t('aiModalError').substring(0, 10))) {
        setPitchError(aiResponse);
      } else {
        setGeneratedPitch(aiResponse);
      }
    } catch (error: any) {
      setPitchError(error.message || t('aiModalError'));
    } finally {
      setIsPitchLoading(false);
    }
  };

  const clearPitch = () => {
    setGeneratedPitch('');
    setPitchError('');
  };

  const hasPitchOutput = isPitchLoading || generatedPitch || pitchError;

  return (
    <section id="ambassadors" className="py-20 bg-brand-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-section-display brand-accent-gold-text">
            {t('ambassadorsTitle')}
          </h2>
          <div className="w-28 h-1 mx-auto mb-8 rounded-full" style={{background: 'var(--th-primary)', opacity: 0.5}}></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed">
            {t('ambassadorsSubtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {AMBASSADORS_DATA.map((tier, index) => (
            <div
              key={tier.titleKey}
              className={`card-ui glassmorphism-light ${index === 0 ? 'animate-slide-in-left' : index === 1 ? 'animate-fade-in-zoom' : 'animate-slide-in-right'} ${tier.isElite ? `relative ${tier.eliteBgClass ? tier.eliteBgClass.replace('bg-', 'border-') : 'border-brand-primary'} shadow-primary-glow` : ''}`}
              style={{ animationDelay: `${0.2 * (index + 1)}s`, transform: tier.isElite ? 'scale(1.05)' : 'scale(1)' }}
            >
              {tier.isElite && tier.eliteTagKey && (
                <div className={`absolute top-0 right-0 ${tier.eliteBgClass || 'bg-brand-primary'} text-white text-xs font-bold px-3 py-1.5 transform translate-x-2 -translate-y-2 rotate-12 shadow-md rounded-sm`}>
                  {t(tier.eliteTagKey)}
                </div>
              )}
              <div className={`${tier.iconBgGradientClass} w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto ${tier.iconShadowClass}`}>
                <i className={`${tier.iconClass} text-3xl ${index === 1 ? 'text-white' : 'text-brand-text-primary'}`}></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-center font-display" style={{color: 'var(--th-text)'}}>
                {t(tier.titleKey)}
              </h3>
              <p className="text-brand-text-secondary/90 text-sm mb-6 text-center">
                {t(tier.descKey)}
              </p>
              <div className="p-3 rounded-lg mb-6 text-center" style={{background: 'var(--th-surface-raised)', border: '1px solid var(--th-border)'}}>
                <div className="text-brand-text-secondary/70 text-xs font-mono">{t(tier.rewardsTitleKey)}</div>
                <div className="font-bold text-brand-text-primary text-lg">{t(tier.rewardsDescKey)}</div>
              </div>
              <button className={tier.buttonClass}>{t(tier.buttonKey)}</button>
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
              <><i className="fas fa-spinner fa-spin mr-2"></i> {t('aiModalLoading', 'Generando...')}</>
            ) : (
              <><i className="fas fa-lightbulb mr-2"></i> {t('btnGeneratePitch')}</>
            )}
          </button>
          <div
            className={`mt-6 text-base bg-transparent rounded-lg min-h-[60px] max-w-2xl mx-auto text-left transition-opacity duration-300 ease-in-out ${hasPitchOutput ? 'opacity-100' : 'opacity-0 hidden'}`}
            aria-live="assertive"
          >
            {isPitchLoading && (
              <div className="flex items-center justify-center p-4 text-sm text-brand-text-secondary">
                <div className="ai-modal-loader !w-6 !h-6 !border-2 !mx-0 !my-0 !mr-3"></div> {t('aiModalLoading')}
              </div>
            )}
            {!isPitchLoading && pitchError && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-md text-sm text-red-700 shadow-sm">
                {pitchError}
              </div>
            )}
            {!isPitchLoading && generatedPitch && (
              <textarea
                aria-label={t('aiModalTitlePitch')}
                className="w-full h-36 p-3 rounded-lg text-brand-text-primary text-sm resize-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all"
                style={{background: 'var(--th-surface)', border: '1px solid var(--th-border)', color: 'var(--th-text)'}}
                readOnly
                value={generatedPitch}
              />
            )}
          </div>
          {!isPitchLoading && (generatedPitch || pitchError) && (
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
}
