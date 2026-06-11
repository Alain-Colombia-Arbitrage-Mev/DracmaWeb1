
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

// === Web3 / Wallet Types ===

export enum TransactionStatus {
  IDLE = 'idle',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVAL_PENDING = 'approval_pending',
  AWAITING_PURCHASE = 'awaiting_purchase',
  PURCHASE_PENDING = 'purchase_pending',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum PresalePaymentCurrency {
  USDT = 'USDT',
  USDC = 'USDC',
  BNB = 'BNB',
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  balanceBNB: string | null;
  balanceUSDT: string | null;
  balanceUSDC: string | null;
}

export interface PresaleContractData {
  tokenPrice: bigint | null;
  tokenPriceFormatted: number;
  totalTokensSold: bigint | null;
  tokensAvailable: bigint | null;
  presaleEnded: boolean;
  paused: boolean;
  minPurchaseStable: bigint | null;
  maxPurchase: bigint | null;
  usdtIndex: number;
  usdcIndex: number;
}

export interface TransactionState {
  status: TransactionStatus;
  txHash: string | null;
  errorMessage: string | null;
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
