
import type {
  LanguageData,
  PresaleData,
  NavLinkItem,
  VisionCardData,
  EcosystemCardData,
  MembershipTierData,
  TokenDistributionItem,
  RoadmapItemData,
  AmbassadorTierData,
  ContactPoint,
  SocialLink,
  FooterSection,
  PresaleBlockchain,
  BlockchainNetwork,
  CrowdfundingFeatureData,
  CrowdfundingProjectData,
} from '../types';

import { PresaleBlockchain as PresaleBlockchainEnum } from '../types';

// ---------------------------------------------------------------------------
// 1. Token Price
// ---------------------------------------------------------------------------
export const TOKEN_PRICE = 0.20;

// ---------------------------------------------------------------------------
// 2. Presale Data
// ---------------------------------------------------------------------------
// Fixed presale start date — change this once to set the 120-day window
const PRESALE_START = new Date('2026-02-08T00:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

export const PRESALE_DATA: PresaleData = {
  targetUSD: 80000000,
  raisedUSD: 36000000,
  totalPresaleTokens: 400000000,
  endDate: new Date(PRESALE_START.getTime() + 120 * DAY_MS),
  bonusTiers: [
    {
      start: PRESALE_START,
      end: new Date(PRESALE_START.getTime() + 40 * DAY_MS),
      rate: 0.15,
      nameKey: 'presaleBonusPhase1Name',
      infoKey: 'presaleBonusPhase1Info',
    },
    {
      start: new Date(PRESALE_START.getTime() + 40 * DAY_MS + 1),
      end: new Date(PRESALE_START.getTime() + 80 * DAY_MS),
      rate: 0.10,
      nameKey: 'presaleBonusPhase2Name',
      infoKey: 'presaleBonusPhase2Info',
    },
    {
      start: new Date(PRESALE_START.getTime() + 80 * DAY_MS + 1),
      end: new Date(PRESALE_START.getTime() + 120 * DAY_MS),
      rate: 0.05,
      nameKey: 'presaleBonusPhase3Name',
      infoKey: 'presaleBonusPhase3Info',
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Blockchain Networks
// ---------------------------------------------------------------------------
export const BLOCKCHAIN_NETWORKS: BlockchainNetwork[] = [
  {
    id: PresaleBlockchainEnum.BSC,
    nameKey: 'blockchainBSC',
    iconClass: 'fab fa-hive',
    nativeCoin: 'BNB',
    logoUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.png?v=032',
  },
];

// ---------------------------------------------------------------------------
// 4. Navigation Links
// ---------------------------------------------------------------------------
export const NAV_LINKS: NavLinkItem[] = [
  { href: '#vision', key: 'navVision' },
  { href: '#ecosystem', key: 'navEcosystem' },
  { href: '#crowdfunding', key: 'navCrowdfunding' },
  { href: '#presale', key: 'navPresale', isActive: true },
  { href: '#contact', key: 'navContact' },
];

// ---------------------------------------------------------------------------
// 5. Languages
// ---------------------------------------------------------------------------
export const LANGUAGES = [
  { code: 'es', name: 'Espanol' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Francais' },
  { code: 'hi', name: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  { code: 'ar', name: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
  { code: 'ru', name: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  { code: 'zh', name: '\u7b80\u4f53\u4e2d\u6587' },
];

// ---------------------------------------------------------------------------
// 6. Vision Cards Data
// ---------------------------------------------------------------------------
export const VISION_CARDS_DATA: VisionCardData[] = [
  {
    iconClass: 'fas fa-seedling',
    gradientClass: 'vision-icon-bg',
    titleKey: 'visionCard1Title',
    descKey: 'visionCard1Desc',
    shadowClass: '',
  },
  {
    iconClass: 'fas fa-brain',
    gradientClass: 'vision-icon-bg',
    titleKey: 'visionCard2Title',
    descKey: 'visionCard2Desc',
    shadowClass: '',
  },
  {
    iconClass: 'fas fa-users',
    gradientClass: 'vision-icon-bg',
    titleKey: 'visionCard3Title',
    descKey: 'visionCard3Desc',
    shadowClass: '',
  },
];

// ---------------------------------------------------------------------------
// 7. Ecosystem Cards Data (UPDATED)
// ---------------------------------------------------------------------------
export const ECOSYSTEM_CARDS_DATA: EcosystemCardData[] = [
  {
    iconClass: 'fas fa-tractor',
    colorClass: 'eco-icon-color',
    titleKey: 'ecoCard1Title',
    descKey: 'ecoCard1Desc',
    aiButtonKey: 'btnExplainAI',
  },
  {
    iconClass: 'fas fa-microchip',
    colorClass: 'eco-icon-color',
    titleKey: 'ecoCard2Title',
    descKey: 'ecoCard2Desc',
    aiButtonKey: 'btnExplainAI',
  },
  {
    iconClass: 'fas fa-solar-panel',
    colorClass: 'eco-icon-color',
    titleKey: 'ecoCard3Title',
    descKey: 'ecoCard3Desc',
    aiButtonKey: 'btnExplainAI',
  },
  {
    iconClass: 'fas fa-briefcase',
    colorClass: 'eco-icon-color',
    titleKey: 'ecoCard4Title',
    descKey: 'ecoCard4Desc',
    aiButtonKey: 'btnExplainAI',
  },
  {
    iconClass: 'fas fa-wallet',
    colorClass: 'eco-icon-color',
    titleKey: 'ecoCard5Title',
    descKey: 'ecoCard5Desc',
    aiButtonKey: 'btnExplainAI',
  },
  {
    iconClass: 'fas fa-comment-dots',
    colorClass: 'eco-icon-color',
    titleKey: 'ecoCard6Title',
    descKey: 'ecoCard6Desc',
    aiButtonKey: 'btnExplainAI',
  },
];

// ---------------------------------------------------------------------------
// 8. Crowdfunding Features Data
// ---------------------------------------------------------------------------
export const CROWDFUNDING_FEATURES_DATA: CrowdfundingFeatureData[] = [
  {
    iconClass: 'fas fa-chart-pie',
    titleKey: 'crowdfundingFeature1Title',
    descKey: 'crowdfundingFeature1Desc',
    colorClass: 'eco-icon-color',
    bgColorClass: 'feature-icon-bg',
  },
  {
    iconClass: 'fas fa-coins',
    titleKey: 'crowdfundingFeature2Title',
    descKey: 'crowdfundingFeature2Desc',
    colorClass: 'eco-icon-color',
    bgColorClass: 'feature-icon-bg',
  },
  {
    iconClass: 'fas fa-users-cog',
    titleKey: 'crowdfundingFeature3Title',
    descKey: 'crowdfundingFeature3Desc',
    colorClass: 'eco-icon-color',
    bgColorClass: 'feature-icon-bg',
  },
  {
    iconClass: 'fas fa-shield-alt',
    titleKey: 'crowdfundingFeature4Title',
    descKey: 'crowdfundingFeature4Desc',
    colorClass: 'eco-icon-color',
    bgColorClass: 'feature-icon-bg',
  },
  {
    iconClass: 'fas fa-hand-holding-seedling',
    titleKey: 'crowdfundingFeature5Title',
    descKey: 'crowdfundingFeature5Desc',
    colorClass: 'eco-icon-color',
    bgColorClass: 'feature-icon-bg',
  },
];

// ---------------------------------------------------------------------------
// 9. Crowdfunding Projects Data (NEW projects)
// ---------------------------------------------------------------------------
export const CROWDFUNDING_PROJECTS_DATA: CrowdfundingProjectData[] = [
  {
    id: 'agroverde01',
    imagePlaceholder: '600x400/0D1117/10B981?text=AgroVerde+Farm+I',
    nameKey: 'crowdfundingProjectAgroVerdeName',
    assetTypeKey: 'crowdfundingAssetTypeAgriculture',
    fundingGoalDRC: 4000000,
    fundingGoalUSD: 800000,
    currentFundingDRC: 1500000,
    minInvestmentDRC: 250,
    estimatedROIKey: 'crowdfundingROIAgriculture',
    statusKey: 'crowdfundingProjectStatusOpen',
    statusColorClass: 'bg-green-500',
  },
  {
    id: 'solaris03',
    imagePlaceholder: '600x400/0D1117/7DF9FF?text=Ancestro+Solar+Mining',
    nameKey: 'crowdfundingProjectSolarisIIIName',
    assetTypeKey: 'crowdfundingAssetTypeSolarMining',
    fundingGoalDRC: 7500000,
    fundingGoalUSD: 1500000,
    currentFundingDRC: 3000000,
    minInvestmentDRC: 500,
    estimatedROIKey: 'crowdfundingROISolar',
    statusKey: 'crowdfundingProjectStatusOpen',
    statusColorClass: 'bg-green-500',
  },
  {
    id: 'empleo01',
    imagePlaceholder: '600x400/0D1117/FBBF24?text=EmpleoDigital+Platform',
    nameKey: 'crowdfundingProjectEmpleoDigitalName',
    assetTypeKey: 'crowdfundingAssetTypeEmployment',
    fundingGoalDRC: 2500000,
    fundingGoalUSD: 500000,
    currentFundingDRC: 2500000,
    minInvestmentDRC: 100,
    estimatedROIKey: 'crowdfundingROIEmployment',
    statusKey: 'crowdfundingProjectStatusFunded',
    statusColorClass: 'bg-brand-primary',
  },
];

// ---------------------------------------------------------------------------
// 10. Membership Tiers Data
// ---------------------------------------------------------------------------
export const MEMBERSHIP_TIERS_DATA: MembershipTierData[] = [
  {
    nameKey: 'memberTier1Name',
    descKey: 'memberTier1Desc',
    price: '$1,000',
    priceSuffixKey: 'memberTierPriceSuffix',
    features: [
      { key: 'memberTier1Feat1', iconClass: 'fas fa-check-circle membership-feat-icon' },
      { key: 'memberTier1Feat2', iconClass: 'fas fa-check-circle membership-feat-icon' },
      { key: 'memberTier1Feat3', iconClass: 'fas fa-check-circle membership-feat-icon' },
      { key: 'memberTier1Feat4', iconClass: 'fas fa-check-circle membership-feat-icon' },
    ],
    buttonKey: 'btnJoinCore',
    buttonClass:
      'w-full btn-secondary py-2.5',
    gradientClass: 'membership-tier-base',
    textColorClass: 'text-brand-text-primary',
  },
  {
    nameKey: 'memberTier2Name',
    descKey: 'memberTier2Desc',
    price: '$5,000',
    priceSuffixKey: 'memberTierPriceSuffix',
    features: [
      { key: 'memberTier2Feat1', iconClass: 'fas fa-star membership-feat-icon' },
      { key: 'memberTier2Feat2', iconClass: 'fas fa-star membership-feat-icon' },
      { key: 'memberTier2Feat3', iconClass: 'fas fa-star membership-feat-icon' },
      { key: 'memberTier2Feat4', iconClass: 'fas fa-star membership-feat-icon' },
      { key: 'memberTier2Feat5', iconClass: 'fas fa-star membership-feat-icon' },
      { key: 'memberTier2Feat6', iconClass: 'fas fa-star membership-feat-icon' },
    ],
    buttonKey: 'btnJoinQuantum',
    buttonClass: 'w-full btn-primary py-2.5',
    isPopular: true,
    popularTagKey: 'tagPopular',
    gradientClass: 'membership-tier-popular',
    textColorClass: 'text-white',
    borderColorClass: 'border-brand-primary',
    shadowClass: '',
  },
  {
    nameKey: 'memberTier3Name',
    descKey: 'memberTier3Desc',
    price: '$25,000',
    priceSuffixKey: 'memberTierPriceSuffix',
    features: [
      { key: 'memberTier3Feat1', iconClass: 'fas fa-atom membership-feat-icon' },
      { key: 'memberTier3Feat2', iconClass: 'fas fa-atom membership-feat-icon' },
      { key: 'memberTier3Feat3', iconClass: 'fas fa-atom membership-feat-icon' },
      { key: 'memberTier3Feat4', iconClass: 'fas fa-atom membership-feat-icon' },
      { key: 'memberTier3Feat5', iconClass: 'fas fa-atom membership-feat-icon' },
      { key: 'memberTier3Feat6', iconClass: 'fas fa-atom membership-feat-icon' },
      { key: 'memberTier3Feat7', iconClass: 'fas fa-atom membership-feat-icon' },
    ],
    buttonKey: 'btnJoinPhoton',
    buttonClass:
      'w-full btn-secondary py-2.5',
    gradientClass: 'membership-tier-premium',
    textColorClass: 'text-white',
  },
];

// ---------------------------------------------------------------------------
// 11. Token Distribution Data
// ---------------------------------------------------------------------------
export const TOKEN_DISTRIBUTION_DATA: TokenDistributionItem[] = [
  { percentage: 20, colorClass: 'bg-brand-primary', nameKey: 'distPresale', descKey: 'distPresaleDesc' },
  { percentage: 30, colorClass: 'bg-brand-primary/60', nameKey: 'distLiquidity', descKey: 'distLiquidityDesc' },
  { percentage: 15, colorClass: 'bg-brand-primary/40', nameKey: 'distStaking', descKey: 'distStakingDesc' },
  { percentage: 35, colorClass: 'bg-brand-primary/80', nameKey: 'distEcosystem', descKey: 'distEcosystemDesc' },
];

// ---------------------------------------------------------------------------
// 12. Roadmap Data
// ---------------------------------------------------------------------------
export const ROADMAP_DATA: RoadmapItemData[] = [
  {
    iconClass: 'fas fa-rocket',
    titleKey: 'roadmapPhase1Title',
    listKey: 'roadmapPhase1List',
    itemIconBgClass: 'roadmap-icon-bg',
    itemIconShadowClass: '',
    itemTitleColorClass: 'roadmap-phase-title',
  },
  {
    iconClass: 'fas fa-cogs',
    titleKey: 'roadmapPhase2Title',
    listKey: 'roadmapPhase2List',
    itemIconBgClass: 'roadmap-icon-bg',
    itemIconShadowClass: '',
    itemTitleColorClass: 'roadmap-phase-title',
  },
  {
    iconClass: 'fas fa-globe-americas',
    titleKey: 'roadmapPhase3Title',
    listKey: 'roadmapPhase3List',
    itemIconBgClass: 'roadmap-icon-bg',
    itemIconShadowClass: '',
    itemTitleColorClass: 'roadmap-phase-title',
  },
  {
    iconClass: 'fas fa-infinity',
    titleKey: 'roadmapPhase4Title',
    listKey: 'roadmapPhase4List',
    itemIconBgClass: 'roadmap-icon-bg',
    itemIconShadowClass: '',
    itemTitleColorClass: 'roadmap-phase-title',
  },
];

// ---------------------------------------------------------------------------
// 13. Ambassadors Data
// ---------------------------------------------------------------------------
export const AMBASSADORS_DATA: AmbassadorTierData[] = [
  {
    iconClass: 'fas fa-satellite-dish',
    iconBgGradientClass: 'ambassador-icon-bg',
    iconShadowClass: '',
    titleKey: 'ambassador1Title',
    descKey: 'ambassador1Desc',
    rewardsTitleKey: 'ambassadorEarnings',
    rewardsDescKey: 'ambassador1Earnings',
    buttonKey: 'btnLearnMore',
    buttonClass:
      'w-full btn-secondary py-2.5 text-sm',
  },
  {
    iconClass: 'fas fa-network-wired',
    iconBgGradientClass: 'ambassador-icon-bg-elite',
    iconShadowClass: '',
    titleKey: 'ambassador2Title',
    descKey: 'ambassador2Desc',
    rewardsTitleKey: 'ambassadorEarnings',
    rewardsDescKey: 'ambassador2Earnings',
    buttonKey: 'btnApplyNow',
    buttonClass: 'w-full btn-primary py-2.5 text-sm',
    isElite: true,
    eliteTagKey: 'tagElite',
    eliteBgClass: 'bg-brand-primary',
  },
  {
    iconClass: 'fas fa-chalkboard-teacher',
    iconBgGradientClass: 'ambassador-icon-bg',
    iconShadowClass: '',
    titleKey: 'ambassador3Title',
    descKey: 'ambassador3Desc',
    rewardsTitleKey: 'ambassadorEarnings',
    rewardsDescKey: 'ambassador3Earnings',
    buttonKey: 'btnLearnMore',
    buttonClass:
      'w-full btn-secondary py-2.5 text-sm',
  },
];

// ---------------------------------------------------------------------------
// 14. Contact Points Data
// ---------------------------------------------------------------------------
export const CONTACT_POINTS_DATA: ContactPoint[] = [
  {
    iconClass: 'fas fa-map-marker-alt',
    iconBgGradient: 'contact-icon-bg',
    iconShadow: '',
    titleKey: 'contactHQ',
    descKey: 'contactHQLocations',
  },
  {
    iconClass: 'fas fa-envelope',
    iconBgGradient: 'contact-icon-bg',
    iconShadow: '',
    titleKey: 'contactEmailDirect',
    descKey: 'contactEmailValue',
    link: 'mailto:info@dracma.org',
    isEmail: true,
  },
  {
    iconClass: 'fas fa-headset',
    iconBgGradient: 'contact-icon-bg',
    iconShadow: '',
    titleKey: 'contactSupport',
    descKey: 'contactSupportDesc',
  },
];

// ---------------------------------------------------------------------------
// 15. Social Links Data
// ---------------------------------------------------------------------------
export const SOCIAL_LINKS_DATA: SocialLink[] = [
  { label: 'Twitter', iconClass: 'fab fa-twitter', href: 'https://x.com/dracma_community', hoverColorClass: 'hover:text-brand-primary' },
  { label: 'Telegram', iconClass: 'fab fa-telegram', href: 'https://t.me/dracma_updates', hoverColorClass: 'hover:text-brand-primary' },
  { label: 'Discord', iconClass: 'fab fa-discord', href: '#', hoverColorClass: 'hover:text-brand-primary' },
  { label: 'Medium', iconClass: 'fab fa-medium', href: '#', hoverColorClass: 'hover:text-brand-primary' },
  { label: 'LinkedIn', iconClass: 'fab fa-linkedin-in', href: '#', hoverColorClass: 'hover:text-brand-primary' },
];

// ---------------------------------------------------------------------------
// 16. Footer Sections Data
// ---------------------------------------------------------------------------
export const FOOTER_SECTIONS_DATA: FooterSection[] = [
  {
    titleKey: 'footerNav',
    titleColorClass: 'footer-heading',
    links: [
      { key: 'navVision', href: '#vision' },
      { key: 'navEcosystem', href: '#ecosystem' },
      { key: 'navCrowdfunding', href: '#crowdfunding' },
      { key: 'navPresale', href: '#presale' },
    ],
  },
  {
    titleKey: 'footerResources',
    titleColorClass: 'footer-heading',
    links: [
      { key: 'footerWhitepaper', href: '#whitepaper', isWhitepaperModalTrigger: true },
      { key: 'footerAudits', href: '#' },
      { key: 'footerBlog', href: '#' },
      { key: 'faq', href: '#' },
    ],
  },
  {
    titleKey: 'footerLegal',
    titleColorClass: 'footer-heading',
    links: [
      { key: 'footerTerms', href: '#' },
      { key: 'footerPrivacy', href: '#' },
      { key: 'footerCookies', href: '#' },
      { key: 'footerRisk', href: '#' },
    ],
  },
];

// ---------------------------------------------------------------------------
// 17. Footer Social Links
// ---------------------------------------------------------------------------
export const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  { label: 'Twitter', iconClass: 'fab fa-twitter fa-lg', href: 'https://x.com/dracma_community', hoverColorClass: 'hover:text-brand-primary' },
  { label: 'Telegram', iconClass: 'fab fa-telegram fa-lg', href: 'https://t.me/dracma_updates', hoverColorClass: 'hover:text-brand-primary' },
  { label: 'Discord', iconClass: 'fab fa-discord fa-lg', href: '#', hoverColorClass: 'hover:text-brand-primary' },
  { label: 'Medium', iconClass: 'fab fa-medium fa-lg', href: '#', hoverColorClass: 'hover:text-brand-primary' },
  { label: 'Github', iconClass: 'fab fa-github fa-lg', href: '#', hoverColorClass: 'hover:text-brand-primary' },
];

// ---------------------------------------------------------------------------
// 18. Contact Form Subjects
// ---------------------------------------------------------------------------
export const CONTACT_FORM_SUBJECTS = [
  { key: 'subjectInvestment', value: 'investment' },
  { key: 'subjectPartnership', value: 'partnership' },
  { key: 'subjectPress', value: 'press' },
  { key: 'subjectOther', value: 'other' },
];
