
export interface Translations {
  [key: string]: string | undefined;
}

export interface LanguageData {
  [langCode: string]: Translations;
}

export interface BonusTier {
  start: Date;
  end: Date;
  rate: number;
  nameKey: string;
  infoKey: string;
}

export interface PresaleData {
  targetUSD: number;
  raisedUSD: number;
  totalPresaleTokens: number;
  endDate: Date;
  bonusTiers: BonusTier[];
}

export enum PresaleCurrency {
  ETH = 'ETH',
  USDC = 'USDC',
  USDT = 'USDT',
  // Potentially add more or filter based on blockchain
}

export enum PresaleBlockchain {
  ETH = 'Ethereum',
  BSC = 'BSC', // Binance Smart Chain
  POLYGON = 'Polygon',
  // Add more blockchains as needed
}

export interface BlockchainNetwork {
  id: PresaleBlockchain;
  nameKey: string; // Translation key for the name
  iconClass: string; // e.g., 'fab fa-ethereum'
  nativeCoin?: string; // e.g., 'ETH'
  logoUrl?: string; // Optional direct URL for logo if not using FontAwesome
}


export interface NavLinkItem {
  href: string;
  key: string;
  isActive?: boolean; // For presale link
}

export interface VisionCardData {
  iconClass: string;
  gradientClass: string;
  titleKey: string;
  descKey: string;
  shadowClass: string;
}

export interface EcosystemCardData {
  iconClass: string;
  colorClass: string;
  titleKey: string;
  descKey: string;
  aiButtonKey: string;
}

export interface MembershipTierFeature {
  key: string;
  iconClass: string; // e.g. 'fas fa-check-circle text-brand-secondary'
}
export interface MembershipTierData {
  nameKey: string;
  descKey: string;
  price: string;
  priceSuffixKey: string;
  features: MembershipTierFeature[];
  buttonKey: string;
  buttonClass: string;
  isPopular?: boolean;
  popularTagKey?: string;
  gradientClass: string; // For header
  textColorClass: string; // For header text
  borderColorClass?: string; // For popular tier
  shadowClass?: string; // For popular tier
}

export interface CountdownDigits {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface TokenDistributionItem {
  percentage: number;
  colorClass: string; // e.g. 'var(--brand-accent-gold)'
  nameKey: string;
  descKey: string;
}

export interface RoadmapItemData {
    iconClass: string;
    titleKey: string;
    listKey: string; // This will be a pipe-separated string in translations
    itemIconBgClass: string; // e.g. 'bg-brand-accent-gold'
    itemIconShadowClass: string; // e.g. 'shadow-gold-glow'
    itemTitleColorClass: string; // e.g. 'brand-accent-gold-text'
}

export interface AmbassadorTierData {
  iconClass: string;
  iconBgGradientClass: string;
  iconShadowClass: string;
  titleKey: string;
  descKey: string;
  rewardsTitleKey: string;
  rewardsDescKey: string;
  buttonKey: string;
  buttonClass: string;
  isElite?: boolean;
  eliteTagKey?: string;
  eliteBgClass?: string; // for elite tag
}

export interface ContactPoint {
  iconClass: string;
  iconBgGradient: string;
  iconShadow: string;
  titleKey: string;
  descKey: string;
  link?: string;
  isEmail?: boolean;
}

export interface SocialLink {
  label: string;
  iconClass: string;
  href: string;
  hoverColorClass: string;
}

export interface FooterLink {
  key: string;
  href: string;
  isWhitepaperModalTrigger?: boolean;
}

export interface FooterSection {
  titleKey: string;
  links: FooterLink[];
  titleColorClass: string;
}

export interface AiModalInfo {
  isOpen: boolean;
  titleKey: string;
  content: string; // Can be HTML
  isLoading: boolean;
  showCopyButton: boolean;
}

export interface WhitepaperModalInfo {
  isOpen: boolean;
}

export interface CrowdfundingFeatureData {
  iconClass: string;
  titleKey: string;
  descKey: string;
  colorClass: string; // e.g., 'brand-primary-text'
  bgColorClass: string; // e.g., 'brand-primary-bg-light'
}

export interface CrowdfundingProjectData {
  id: string;
  imagePlaceholder: string; // e.g., '600x400/0D1117/7DF9FF?text=Solaris+Park'
  nameKey: string;
  assetTypeKey: string;
  fundingGoalDRC: number;
  fundingGoalUSD: number; // For display
  currentFundingDRC: number;
  minInvestmentDRC: number;
  estimatedROIKey?: string; // Optional, key for "e.g., 8-12% APR"
  statusKey: string; // e.g. 'crowdfundingStatusOpen', 'crowdfundingStatusFunded'
  statusColorClass: string; // e.g. 'bg-green-500', 'bg-yellow-500'
}
