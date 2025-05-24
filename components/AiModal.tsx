
import React, { useContext } from 'react';
import { LanguageContext, AiModalContext } from '../App';

export const AiModal: React.FC = () => {
  const { getTranslation } = useContext(LanguageContext);
  const { aiModalInfo, closeAiModal, setAiModalInfo } = useContext(AiModalContext);

  if (!aiModalInfo.isOpen) return null;

  const handleCopyToClipboard = () => {
    const textToCopy = aiModalInfo.content.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ''); // Strip HTML for copy
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Visual feedback for copy
        const copyButton = document.getElementById('copy-ai-response-btn');
        if (copyButton) {
            const originalText = copyButton.innerHTML;
            copyButton.innerHTML = `<i class="fas fa-check mr-1.5"></i> ${getTranslation('btnCopied')}`;
            setTimeout(() => {
                copyButton.innerHTML = originalText;
                 // Ensure inner span also updates
                const span = copyButton.querySelector('span');
                if (span) span.textContent = getTranslation('btnCopyText');
            }, 1500);
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="ai-modal" onClick={closeAiModal}>
      <div className="ai-modal-content !bg-surface-light !border-brand-primary/50" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 id="ai-modal-title" className="text-xl font-bold font-display brand-primary-text">
            {getTranslation(aiModalInfo.titleKey)}
          </h3>
          <button id="close-ai-modal-btn" onClick={closeAiModal} className="text-brand-text-secondary hover:text-brand-primary text-2xl">&times;</button>
        </div>
        <div id="ai-modal-body" className="text-sm text-brand-text-secondary leading-relaxed min-h-[60px]">
          {aiModalInfo.isLoading ? (
            <>
              <div className="ai-modal-loader"></div>
              <p className="text-center text-sm">{getTranslation('aiModalLoading')}</p>
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
                <i className="fas fa-copy mr-1.5"></i> <span>{getTranslation('btnCopyText')}</span>
            </button>
        )}
      </div>
    </div>
  );
};