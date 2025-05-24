
import React, { useContext } from 'react';
import { LanguageContext, AiModalContext } from '../App';
import { MEMBERSHIP_TIERS_DATA } from '../constants';

export const Membership: React.FC = () => {
  const { getTranslation, currentLang } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext);

  const handleRecommendMembership = () => {
    const prompt = `Soy un inversor interesado en DRACMA. DRACMA ofrece tres niveles de membresía: CORE (acceso esencial, 5% bonus staking), QUANTUM (beneficios premium, acceso temprano a RWA, 10% bonus staking), y PHOTON (experiencia élite, acceso VIP global, 15% bonus staking, concierge). Basado en los principios de DRACMA de innovación, inversión en activos reales y gobernanza comunitaria, ¿qué tipo de inversor se beneficiaría más de cada nivel? Proporciona una breve recomendación para cada uno (1-2 frases por nivel). Responde de forma amigable, profesional y fácil de entender. Idioma de la respuesta: ${currentLang}.`;
    showAiModal('aiModalTitleMembership', prompt);
  };
  
  return (
    <section id="membership" className="py-20 bg-brand-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-section-display brand-accent-gold-text">
            {getTranslation('membershipTitle')}
          </h2>
          <div className="w-28 h-1.5 bg-gradient-to-r from-brand-accent-gold to-brand-primary mx-auto mb-8 rounded-full"></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed">
            {getTranslation('membershipSubtitle')}
          </p>
          <div className="mt-8">
            <button onClick={handleRecommendMembership} className="btn-ai-feature text-base">
              <i className="fas fa-user-check mr-2"></i> <span>{getTranslation('btnRecommendMembership')}</span>
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {MEMBERSHIP_TIERS_DATA.map((tier, index) => (
            <div 
              key={tier.nameKey} 
              className={`card-ui ${index === 0 ? 'animate-slide-in-left' : index === 1 ? 'animate-fade-in-zoom' : 'animate-slide-in-right'} ${tier.isPopular ? `relative ${tier.shadowClass} ${tier.borderColorClass}` : ''}`}
              style={{ animationDelay: `${0.2 * (index + 1)}s`, transform: tier.isPopular ? 'scale(1.05)' : 'scale(1)'}}
            >
              {tier.isPopular && tier.popularTagKey && (
                <div className="absolute top-0 right-0 bg-brand-primary text-white text-xs font-bold px-3 py-1.5 transform translate-x-2 -translate-y-2 rotate-12 shadow-md rounded-sm">
                  {getTranslation(tier.popularTagKey)}
                </div>
              )}
              <div className={`${tier.gradientClass} py-6 px-8 border-b ${tier.isPopular ? 'border-blue-300/50' : 'border-gray-300'} rounded-t-xl`}>
                <h3 className={`text-2xl font-bold ${tier.textColorClass} font-display`}>{getTranslation(tier.nameKey)}</h3>
                <p className={`${tier.isPopular ? 'text-blue-100' : tier.nameKey === 'memberTier3Name' ? 'text-green-100' : 'text-brand-text-secondary'} text-sm`}>{getTranslation(tier.descKey)}</p>
              </div>
              <div className="p-8">
                <div className={`text-4xl font-bold mb-6 ${tier.nameKey === 'memberTier3Name' ? 'brand-secondary-text' : 'brand-accent-gold-text'}`}>
                  {tier.price} <span className="text-lg text-brand-text-secondary/70">{getTranslation(tier.priceSuffixKey)}</span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-brand-text-secondary">
                  {tier.features.map(feature => (
                    <li key={feature.key} className="flex items-start">
                      <i className={`${feature.iconClass} mt-1 mr-2.5`}></i> <span>{getTranslation(feature.key)}</span>
                    </li>
                  ))}
                </ul>
                <button className={tier.buttonClass}>{getTranslation(tier.buttonKey)}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-24 text-center animate-fade-in-zoom">
          <h3 className="text-2xl md:text-3xl font-bold mb-6 title-section-display brand-accent-gold-text">
            {getTranslation('membershipCardTitle')}
          </h3>
          <p className="text-brand-text-secondary max-w-3xl mx-auto mb-12">
            {getTranslation('membershipCardSubtitle')}
          </p>
          <div className="flex justify-center">
            <div className="membership-card w-96 h-56 mx-auto">
              <div className="membership-card-inner relative w-full h-full">
                <div className="membership-card-front absolute bg-gradient-to-br from-surface-medium to-surface-light p-6 shadow-xl border border-gray-300 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" className="h-8 w-auto">
                      <defs><linearGradient id="cardLogoGradNew2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#F0E68C"/></linearGradient></defs>
                      <text x="0" y="35" fontFamily="Inter, sans-serif" fontSize="30" fontWeight="bold" fill="url(#cardLogoGradNew2)">DRACMA</text>
                    </svg>
                    <span className="text-xs text-brand-text-secondary/70 font-mono">{getTranslation('cardType')}</span>
                  </div>
                  <div className="my-auto">
                    <img src="https://placehold.co/50x30/2C3E50/F8F9FA?text=Chip" alt="Secure Card Chip" className="w-12 h-8 rounded-md mb-3 border border-gray-400"/>
                    <div className="text-xl brand-accent-gold-text font-mono tracking-widest">XXXX XXXX XXXX XXXX</div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs text-brand-text-secondary/70 font-mono">{getTranslation('cardHolder')}</div>
                      <div className="text-sm text-brand-text-primary font-medium font-mono">VISIONARIO</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-brand-text-secondary/70 font-mono">{getTranslation('cardExpires')}</div>
                      <div className="text-sm text-brand-text-primary font-medium font-mono">12/20XX</div>
                    </div>
                    <div className="w-12 h-8 bg-gradient-to-tr from-brand-accent-gold to-brand-primary rounded-md flex items-center justify-center shadow-md">
                      <i className="fas fa-atom text-white text-lg"></i>
                    </div>
                  </div>
                </div>
                <div className="membership-card-back absolute bg-gradient-to-tl from-surface-medium to-surface-light p-6 shadow-xl border border-gray-300 flex flex-col justify-between">
                  <div className="h-10 bg-brand-text-primary/80 mb-4 -mx-6 mt-4"></div>
                  <div className="text-right mb-auto">
                    <span className="text-xs bg-brand-text-primary text-brand-text-secondary px-2 py-1 rounded-md font-mono">CVV</span>
                    <div className="text-right font-mono text-brand-text-primary mt-1 text-lg">XXX</div>
                  </div>
                  <p className="text-xs text-brand-text-secondary/60 mb-2 text-center font-mono">
                    {getTranslation('cardBackText').split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-brand-text-secondary/70 font-mono">
                      <div className="font-semibold">{getTranslation('cardBlockchainId')}</div>
                      <div>0x0...DЯCMA</div>
                    </div>
                    <i className="fas fa-qrcode text-4xl text-brand-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};