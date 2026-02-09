import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $translations, showAiModal, $currentLang } from '../../stores/appStore';
import { CONTACT_POINTS_DATA, SOCIAL_LINKS_DATA, CONTACT_FORM_SUBJECTS } from '../../data/constants';

export default function Contact() {
  const translations = useStore($translations);
  const currentLang = useStore($currentLang);
  const [formStatus, setFormStatus] = useState(''); // '', 'sending', 'sent'

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('sending');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const subject = formData.get('subject');
    const message = formData.get('message');

    const prompt = `Un usuario llamado ${name} (${email}) quiere contactar a DRACMA con el asunto "${subject}". Su mensaje es: "${message}". Genera una respuesta automática breve y amigable confirmando la recepción y asegurando que el equipo de DRACMA se pondrá en contacto pronto. Incluye un agradecimiento por su interés en DRACMA. Idioma de la respuesta: ${currentLang}.`;

    showAiModal(t('formSent', 'Mensaje Enviado'), prompt);

    const formElement = e.currentTarget;
    setTimeout(() => {
      setFormStatus('sent');
      formElement.reset();
      setTimeout(() => setFormStatus(''), 2000);
    }, 1500);
  };

  return (
    <section id="contact" className="py-20 bg-brand-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-main-display" style={{color: 'var(--th-text)'}}>
            {t('contactTitle')}
          </h2>
          <div className="w-28 h-1 mx-auto mb-8 rounded-full" style={{background: 'var(--th-primary)', opacity: 0.5}}></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed">
            {t('contactSubtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="card-ui glassmorphism-light p-8 animate-slide-in-left">
            <h3 className="text-2xl font-bold mb-6 title-section-display brand-accent-gold-text">
              {t('contactFormTitle')}
            </h3>
            <form id="contact-form" onSubmit={handleSubmit}>
              <div className="mb-5">
                <label htmlFor="contact-name" className="block text-brand-text-secondary/80 mb-1.5 text-sm font-mono">{t('formName')}</label>
                <input type="text" id="contact-name" name="name" className="presale-input" placeholder={t('formNamePlaceholder', 'Tu Nombre Completo')} required />
              </div>
              <div className="mb-5">
                <label htmlFor="contact-email" className="block text-brand-text-secondary/80 mb-1.5 text-sm font-mono">{t('formEmail')}</label>
                <input type="email" id="contact-email" name="email" className="presale-input" placeholder={t('formEmailPlaceholder', 'tu.email@dominio.com')} required />
              </div>
              <div className="mb-5">
                <label htmlFor="contact-subject" className="block text-brand-text-secondary/80 mb-1.5 text-sm font-mono">{t('formSubject')}</label>
                <select id="contact-subject" name="subject" className="presale-input appearance-none" required>
                  {CONTACT_FORM_SUBJECTS.map(subject => (
                    <option key={subject.key} value={t(subject.key, subject.value)}>{t(subject.key, subject.value)}</option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <label htmlFor="contact-message" className="block text-brand-text-secondary/80 mb-1.5 text-sm font-mono">{t('formMessage')}</label>
                <textarea id="contact-message" name="message" className="presale-input h-32" placeholder={t('formMessagePlaceholder', 'Escribe tu consulta aquí...')} required></textarea>
              </div>
              <button type="submit" className="w-full btn-primary py-3 text-base" disabled={formStatus === 'sending'}>
                {formStatus === 'sending' ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i> {t('formSending', 'Enviando...')}</>
                ) : formStatus === 'sent' ? (
                  <><i className="fas fa-check-circle mr-2"></i> {t('formSent', 'Enviado con Exito')}</>
                ) : (
                  <><i className="fas fa-paper-plane mr-2"></i> {t('btnSendMessage')}</>
                )}
              </button>
            </form>
          </div>
          <div className="animate-slide-in-right">
            <div className="card-ui glassmorphism-light p-8 mb-8">
              <h3 className="text-2xl font-bold mb-6 title-main-display brand-primary-text">{t('contactPointsTitle')}</h3>
              <div className="space-y-5">
                {CONTACT_POINTS_DATA.map(point => (
                  <div key={point.titleKey} className="flex items-start">
                    <div className={`${point.iconBgGradient} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mr-4 ${point.iconShadow}`}>
                      <i className={`${point.iconClass} text-white text-lg`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-brand-text-primary">{t(point.titleKey)}</h4>
                      {point.isEmail ? (
                        <a href={point.link} className="text-brand-text-secondary/80 text-sm hover:text-brand-primary transition">{t(point.descKey)}</a>
                      ) : (
                        <p className="text-brand-text-secondary/80 text-sm">{t(point.descKey)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-ui glassmorphism-light p-8">
              <h4 className="font-bold mb-4 text-brand-secondary-text font-display text-xl">{t('contactFollowUs')}</h4>
              <div className="flex space-x-4">
                {SOCIAL_LINKS_DATA.map(social => (
                  <a key={social.label} href={social.href} aria-label={social.label} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center social-icon-circle transform hover:scale-110 transition-all">
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
}
