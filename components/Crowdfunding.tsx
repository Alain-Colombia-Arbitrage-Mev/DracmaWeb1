
import React, { useContext } from 'react';
import { LanguageContext, AiModalContext } from '../App';
import { CROWDFUNDING_FEATURES_DATA, CROWDFUNDING_PROJECTS_DATA } from '../constants';
import { CrowdfundingProjectData, CrowdfundingFeatureData } from '../types'; 

interface ProjectCardProps {
  project: CrowdfundingProjectData;
  getTranslation: (key: string, fallback?: string) => string;
  currentLang: string;
  showAiModal: (titleKey: string, prompt?: string, specificContent?: string) => Promise<void>;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, getTranslation, currentLang, showAiModal }) => {
  const progress = (project.currentFundingDRC / project.fundingGoalDRC) * 100;

  const handleViewProject = () => {
    // The title key for the modal will be the project name itself.
    const modalTitle = getTranslation(project.nameKey); 
    // The prompt will be specific to the project.
    const prompt = `Explícame más sobre el proyecto de crowdfunding "${getTranslation(project.nameKey)}" en DRACMA. Es un proyecto de ${getTranslation(project.assetTypeKey)} con un objetivo de ${project.fundingGoalDRC.toLocaleString()} $DRC y una inversión mínima de ${project.minInvestmentDRC.toLocaleString()} $DRC. Actualmente ha recaudado ${project.currentFundingDRC.toLocaleString()} $DRC. ¿Cuáles son sus principales atractivos, el ROI estimado (${getTranslation(project.estimatedROIKey || 'N/A')}) y los riesgos potenciales? Simula una respuesta como si fueras un asesor experto de DRACMA. Idioma de la respuesta: ${currentLang}.`;
    
    // Pass the specific project name as the titleKey for the modal
    showAiModal(modalTitle, prompt);
  };


  return (
    <div className="card-ui glassmorphism-light overflow-hidden flex flex-col h-full transform transition-all duration-300 hover:!scale-103 hover:!shadow-xl hover:border-brand-secondary">
      <img src={`https://placehold.co/${project.imagePlaceholder}`} alt={getTranslation(project.nameKey)} className="w-full h-48 object-cover"/>
      <div className="p-5 flex flex-col flex-grow">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white mb-2.5 self-start shadow-sm ${project.statusColorClass}`}>{getTranslation(project.statusKey)}</span>
        <h4 className="text-xl font-bold font-display brand-accent-gold-text mb-1.5">{getTranslation(project.nameKey)}</h4>
        <p className="text-sm text-brand-text-secondary/80 mb-3.5 font-mono">{getTranslation(project.assetTypeKey)}</p>

        <div className="text-xs text-brand-text-secondary/70 font-mono mb-1">
          {getTranslation('crowdfundingFundingProgressLabel')} <span className="font-semibold brand-primary-text">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-surface-medium rounded-full h-2.5 mb-4 overflow-hidden border border-gray-300/70 shadow-inner">
          <div className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full rounded-full animate-token-progress-anim" style={{ '--progress-width': `${Math.min(progress,100)}%` } as React.CSSProperties}></div>
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 text-xs font-mono mb-3.5">
            <div>
                <p className="text-brand-text-secondary/70">{getTranslation('crowdfundingMinInvestmentLabel')}</p>
                <p className="font-semibold text-brand-text-primary text-sm">{project.minInvestmentDRC.toLocaleString()} <span className="text-brand-accent-gold-text">$DRC</span></p>
            </div>
            {project.estimatedROIKey && (
                 <div>
                    <p className="text-brand-text-secondary/70">{getTranslation('crowdfundingEstROILabel')}</p>
                    <p className="font-semibold text-brand-secondary-text text-sm">{getTranslation(project.estimatedROIKey)}</p>
                </div>
            )}
        </div>
        <p className="text-xs text-brand-text-secondary/70 font-mono mb-5">
            {getTranslation('presaleGoalLabel')} {project.fundingGoalDRC.toLocaleString()} $DRC <span className="text-brand-text-secondary/50">(~${project.fundingGoalUSD.toLocaleString()} USD)</span>
        </p>

        <button 
          onClick={handleViewProject} 
          className="mt-auto btn-secondary !border-brand-accent-coral !text-brand-accent-coral hover:!bg-brand-accent-coral hover:!text-white hover:!shadow-coral-glow py-2.5 text-sm w-full"
          aria-label={`${getTranslation('crowdfundingBtnViewProject')} ${getTranslation(project.nameKey)}`}
        >
          <i className="fas fa-search-dollar mr-2"></i> {getTranslation('crowdfundingBtnViewProject')}
        </button>
      </div>
    </div>
  );
};


export const Crowdfunding: React.FC = () => {
  const { getTranslation, currentLang } = useContext(LanguageContext);
  const { showAiModal } = useContext(AiModalContext);

  const handleExplainCrowdfunding = () => {
    const prompt = `Explica el concepto de Crowdfunding P2P de DRACMA, que permite invertir fraccionadamente en activos reales usando tokens $DRC. Destaca la democratización del acceso a inversiones (oro, bienes raíces, energía, agricultura sostenible), la transparencia blockchain, el rol de la comunidad, y cómo los inversores pueden obtener beneficios. Hazlo simple, atractivo y conciso para un nuevo usuario (3-4 frases). Idioma de la respuesta: ${currentLang}.`;
    showAiModal('aiModalTitleCrowdfunding', prompt);
  };

  return (
    <section id="crowdfunding" className="py-20 bg-brand-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in-zoom">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 title-section-display brand-secondary-text relative pb-3 title-underline-animated animate-on-visible" style={{ '--brand-accent-gold': 'var(--tw-color-brand-secondary)', '--brand-primary': 'var(--tw-color-brand-accent-gold)' } as React.CSSProperties}>
            {getTranslation('crowdfundingTitle')}
          </h2>
          <div className="w-28 h-1.5 bg-gradient-to-r from-brand-secondary to-brand-accent-gold mx-auto mb-8 rounded-full shadow-secondary-glow"></div>
          <p className="text-lg md:text-xl text-brand-text-secondary max-w-4xl mx-auto leading-relaxed">
            {getTranslation('crowdfundingSubtitle')}
          </p>
           <div className="mt-10">
            <button onClick={handleExplainCrowdfunding} className="btn-ai-feature text-base">
              <i className="fas fa-chalkboard-teacher mr-2"></i> <span>{getTranslation('btnExplainCrowdfundingAI')}</span>
            </button>
          </div>
        </div>

        <div className="mb-20">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 title-section-display brand-primary-text relative pb-3 title-underline-animated animate-on-visible" style={{ '--brand-accent-gold': 'var(--tw-color-brand-primary)', '--brand-primary': 'var(--tw-color-brand-accent-coral)' } as React.CSSProperties}>
              {getTranslation('crowdfundingKeyFeaturesTitle')}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {CROWDFUNDING_FEATURES_DATA.map((feature: CrowdfundingFeatureData, index: number) => (
              <div key={feature.titleKey} className={`flex items-start animate-fade-in-zoom`} style={{animationDelay: `${0.1 * (index + 1)}s`}}>
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center mr-5 shadow-md ${feature.bgColorClass} transition-all duration-300 group hover:scale-105`}>
                   <i className={`${feature.iconClass} ${feature.colorClass} text-2xl transition-transform duration-300 group-hover:rotate-[-5deg]`}></i>
                </div>
                <div>
                  <h4 className={`text-lg font-semibold mb-1.5 font-display ${feature.colorClass}`}>{getTranslation(feature.titleKey)}</h4>
                  <p className="text-brand-text-secondary/90 text-sm leading-relaxed">{getTranslation(feature.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
           <h3 className="text-2xl md:text-3xl font-bold text-center mb-12 title-section-display brand-accent-gold-text relative pb-3 title-underline-animated animate-on-visible">
              {getTranslation('crowdfundingActiveProjectsTitle')}
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {CROWDFUNDING_PROJECTS_DATA.map((project, index) => (
              <div key={project.id} className={`animate-fade-in-zoom`} style={{animationDelay: `${0.15 * (index + 1)}s`}}>
                <ProjectCard
                  project={project}
                  getTranslation={getTranslation}
                  currentLang={currentLang}
                  showAiModal={showAiModal}
                />
              </div>
            ))}
          </div>
           <p className="text-center mt-12 text-sm text-brand-text-secondary/70 font-mono animate-fade-in-zoom" style={{animationDelay: '0.6s'}}>
            {getTranslation('crowdfundingDisclaimer')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Crowdfunding;
