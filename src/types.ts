
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
  USDC = 'USDC',
  USDT = 'USDT',
}

export enum PresaleBlockchain {
  ETH = 'Ethereum',
  BSC = 'BSC',
  POLYGON = 'Polygon',
}

export interface BlockchainNetwork {
  id: PresaleBlockchain;
  nameKey: string;
  iconClass: string;
  nativeCoin?: string;
  logoUrl?: string;
}

export interface NavLinkItem {
  href: string;
  key: string;
  isActive?: boolean;
}

export interface EcosystemCardData {
  iconClass: string;
  colorClass: string;
  titleKey: string;
  descKey: string;
  aiButtonKey: string;
}

export interface CountdownDigits {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface TokenDistributionItem {
  percentage: number;
  colorClass: string;
  nameKey: string;
  descKey: string;
}

export interface RoadmapItemData {
  iconClass: string;
  titleKey: string;
  listKey: string;
  itemIconBgClass: string;
  itemIconShadowClass: string;
  itemTitleColorClass: string;
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
  content: string;
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
  colorClass: string;
  bgColorClass: string;
}

export interface CrowdfundingProjectData {
  id: string;
  imagePlaceholder: string;
  nameKey: string;
  assetTypeKey: string;
  fundingGoalDRC: number;
  fundingGoalUSD: number;
  currentFundingDRC: number;
  minInvestmentDRC: number;
  estimatedROIKey?: string;
  statusKey: string;
  statusColorClass: string;
}
