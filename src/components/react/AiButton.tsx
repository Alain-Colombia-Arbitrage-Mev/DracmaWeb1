import { useStore } from '@nanostores/react';
import { $translations, showAiModal, $currentLang } from '../../stores/appStore';

interface AiButtonProps {
  titleKey: string;
  promptTemplate: string;
  buttonTextKey: string;
  iconClass?: string;
  className?: string;
}

export default function AiButton({ titleKey, promptTemplate, buttonTextKey, iconClass = 'fas fa-robot', className = 'btn-ai-feature-small' }: AiButtonProps) {
  const translations = useStore($translations);
  const currentLang = useStore($currentLang);

  const handleClick = () => {
    const prompt = promptTemplate.replace('{lang}', currentLang);
    showAiModal(titleKey, prompt);
  };

  return (
    <button onClick={handleClick} className={className}>
      <i className={`${iconClass} mr-1.5`}></i>
      <span>{translations[buttonTextKey] || buttonTextKey}</span>
    </button>
  );
}
