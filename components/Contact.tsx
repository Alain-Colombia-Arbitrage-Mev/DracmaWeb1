
import React, { useContext, useState } from 'react';
import { LanguageContext, AiModalContext } from '../App';
import { CONTACT_POINTS_DATA, SOCIAL_LINKS_DATA, CONTACT_FORM_SUBJECTS } from '../constants';

export const Contact: React.FC = () => {
  const { getTranslation } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext);
  const [formStatus, setFormStatus] = useState(''); // '', 'sending', 'sent'

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('sending');
    // Simulate form submission
    console.log("Contact form submitted (simulation). Data:", new FormData(e.currentTarget));
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const subject = formData.get('subject');
    const message = formData.get('message');

    const prompt = `Un usuario llamado ${name} (${email}) quiere contactar a DRACMA con el asunto "${subject}". Su mensaje es: "${message}". Genera una respuesta automática breve y amigable confirmando la recepción y asegurando que el equipo de DRACMA se pondrá en contacto pronto. Incluye un agradecimiento por su interés en DRACMA. Idioma de la respuesta: ${document.documentElement.lang}.`;
    
    // Using showAiModal for the confirmation, but normally you'd send an email
    showAiModal(getTranslation("formSent", "Mensaje Enviado"), prompt);

    setTimeout(() => {
      setFormStatus('sent');
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setFormStatus(''), 2000); // Reset status after a bit
    }, 1500);
  };

  return (
    <section id="contact" className="py-20 bg-brand-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-main-display brand-accent-coral-text">
            {getTranslation('contactTitle')}
          </h2>
          <div className="w-28 h-1.5 bg-gradient-to-r from-brand-accent-coral to-brand-primary mx-auto mb-8 rounded-full"></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed">
            {getTranslation('contactSubtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="card-ui glassmorphism-light p-8 animate-slide-in-left">
            <h3 className="text-2xl font-bold mb-6 title-section-display brand-accent-gold-text">
              {getTranslation('contactFormTitle')}
            </h3>
            <form id="contact-form" onSubmit={handleSubmit}>
              <div className="mb-5">
                <label htmlFor="contact-name" className="block text-brand-text-secondary/80 mb-1.5 text-sm font-mono">{getTranslation('formName')}</label>
                <input type="text" id="contact-name" name="name" className="presale-input !bg-white" placeholder={getTranslation('formNamePlaceholder', 'Tu Nombre Completo')} required/>
              </div>
              <div className="mb-5">
                <label htmlFor="contact-email" className="block text-brand-text-secondary/80 mb-1.5 text-sm font-mono">{getTranslation('formEmail')}</label>
                <input type="email" id="contact-email" name="email" className="presale-input !bg-white" placeholder={getTranslation('formEmailPlaceholder', 'tu.email@dominio.com')} required/>
              </div>
              <div className="mb-5">
                <label htmlFor="contact-subject" className="block text-brand-text-secondary/80 mb-1.5 text-sm font-mono">{getTranslation('formSubject')}</label>
                <select id="contact-subject" name="subject" className="presale-input !bg-white appearance-none" required>
                  {CONTACT_FORM_SUBJECTS.map(subject => (
                    <option key={subject.key} value={getTranslation(subject.key, subject.value)}>{getTranslation(subject.key, subject.value)}</option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <label htmlFor="contact-message" className="block text-brand-text-secondary/80 mb-1.5 text-sm font-mono">{getTranslation('formMessage')}</label>
                <textarea id="contact-message" name="message" className="presale-input !bg-white h-32" placeholder={getTranslation('formMessagePlaceholder', 'Escribe tu consulta aquí...')} required></textarea>
              </div>
              <button type="submit" className="w-full btn-primary py-3 text-base" disabled={formStatus === 'sending'}>
                {formStatus === 'sending' ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i> {getTranslation('formSending', 'Enviando...')}</>
                ) : formStatus === 'sent' ? (
                  <><i className="fas fa-check-circle mr-2"></i> {getTranslation('formSent', 'Enviado con Éxito')}</>
                ) : (
                  <><i className="fas fa-paper-plane mr-2"></i> {getTranslation('btnSendMessage')}</>
                )}
              </button>
            </form>
          </div>
          <div className="animate-slide-in-right">
            <div className="card-ui glassmorphism-light p-8 mb-8">
              <h3 className="text-2xl font-bold mb-6 title-main-display brand-primary-text">{getTranslation('contactPointsTitle')}</h3>
              <div className="space-y-5">
                {CONTACT_POINTS_DATA.map(point => (
                  <div key={point.titleKey} className="flex items-start">
                    <div className={`${point.iconBgGradient} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 ${point.iconShadow}`}>
                      <i className={`${point.iconClass} text-white text-lg`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-brand-text-primary">{getTranslation(point.titleKey)}</h4>
                      {point.isEmail ? (
                         <a href={point.link} className="text-brand-text-secondary/80 text-sm hover:text-brand-primary transition">{getTranslation(point.descKey)}</a>
                      ) : (
                         <p className="text-brand-text-secondary/80 text-sm">{getTranslation(point.descKey)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-ui glassmorphism-light p-8">
              <h4 className="font-bold mb-4 text-brand-secondary-text font-display text-xl">{getTranslation('contactFollowUs')}</h4>
              <div className="flex space-x-4">
                {SOCIAL_LINKS_DATA.map(social => (
                   <a key={social.label} href={social.href} aria-label={social.label} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 bg-gradient-to-br from-brand-secondary to-green-400 rounded-full flex items-center justify-center text-white hover:shadow-secondary-glow transform hover:scale-110 transition-all ${social.hoverColorClass}`}>
                     <i className={social.iconClass}></i>
                   </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};