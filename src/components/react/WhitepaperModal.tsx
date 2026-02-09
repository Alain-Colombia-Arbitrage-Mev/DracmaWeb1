import { useStore } from '@nanostores/react';
import { $whitepaperModalOpen, $translations, closeWhitepaperModal } from '../../stores/appStore';

export default function WhitepaperModal() {
  const isOpen = useStore($whitepaperModalOpen);
  const translations = useStore($translations);

  if (!isOpen) return null;

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  return (
    <div
      className="fixed inset-0 bg-base-dark/90 backdrop-blur-xl flex items-center justify-center p-4 z-[1000]"
      onClick={closeWhitepaperModal}
    >
      <div
        className="glassmorphism-deep p-6 md:p-8 rounded-2xl shadow-2xl max-h-[90vh] max-w-4xl w-full overflow-y-auto whitepaper-scroll border-2 border-aura-cyan/50 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeWhitepaperModal}
          className="absolute top-4 right-4 text-text-secondary hover:text-aura-cyan text-3xl font-bold transition-colors"
          aria-label="Close whitepaper"
        >
          &times;
        </button>
        <h2 className="text-3xl font-bold starlight-gold-text mb-6 text-center title-main-display">
          {t('whitepaperModalTitle')}
        </h2>
        <div className="text-text-secondary/90 space-y-4 prose prose-invert max-w-none prose-headings:text-aura-cyan prose-a:text-starlight-gold prose-strong:text-starlight-gold font-sans prose-sm">
          <p className="text-center font-semibold font-mono text-xs">{t('whitepaperAuthorship')}</p>
          <p className="text-center text-xs mb-6 font-mono">{t('whitepaperCopyrightText')}</p>

          <h3 className="text-xl aura-cyan-text font-semibold mt-4 font-display">{t('whitepaperDisclaimerTitle')}</h3>
          <p className="text-xs">{t('whitepaperDisclaimerText')}</p>

          <h3 className="text-xl aura-cyan-text font-semibold mt-4 font-display">{t('whitepaperIntroTitle')}</h3>
          <p>{t('whitepaperIntroText')}</p>

          <p className="text-center mt-8 text-lg starlight-gold-text font-mono">{t('whitepaperFullContentPlaceholder')}</p>
        </div>
      </div>
    </div>
  );
}
