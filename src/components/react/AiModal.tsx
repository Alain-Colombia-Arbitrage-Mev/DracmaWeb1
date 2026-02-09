import { useStore } from '@nanostores/react';
import { $aiModalInfo, $translations, closeAiModal } from '../../stores/appStore';

export default function AiModal() {
  const aiModalInfo = useStore($aiModalInfo);
  const translations = useStore($translations);

  if (!aiModalInfo.isOpen) return null;

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const handleCopyToClipboard = () => {
    const textToCopy = aiModalInfo.content.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, '');
    navigator.clipboard.writeText(textToCopy).then(() => {
      const copyButton = document.getElementById('copy-ai-response-btn');
      if (copyButton) {
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = `<i class="fas fa-check mr-1.5"></i> ${t('btnCopied')}`;
        setTimeout(() => {
          copyButton.innerHTML = originalText;
        }, 1500);
      }
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="ai-modal" onClick={closeAiModal}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold font-display brand-primary-text">
            {t(aiModalInfo.titleKey)}
          </h3>
          <button onClick={closeAiModal} className="text-brand-text-secondary hover:text-brand-primary text-2xl">&times;</button>
        </div>
        <div className="text-sm text-brand-text-secondary leading-relaxed min-h-[60px]">
          {aiModalInfo.isLoading ? (
            <>
              <div className="ai-modal-loader"></div>
              <p className="text-center text-sm">{t('aiModalLoading')}</p>
            </>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: aiModalInfo.content }} />
          )}
        </div>
        {aiModalInfo.showCopyButton && !aiModalInfo.isLoading && (
          <button
            id="copy-ai-response-btn"
            onClick={handleCopyToClipboard}
            className="btn-secondary !border-brand-primary !text-brand-primary hover:!bg-brand-primary hover:!text-white py-2 px-4 text-xs mt-4"
          >
            <i className="fas fa-copy mr-1.5"></i> <span>{t('btnCopyText')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
