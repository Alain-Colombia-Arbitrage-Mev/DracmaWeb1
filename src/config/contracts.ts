import { type Address } from 'viem';

// BSC Mainnet contract addresses
export const PRESALE_CONTRACT_ADDRESS: Address = '0x13fE106497Ddc966caF6E788833c5F872BF95549';
export const VESTING_VAULT_ADDRESS: Address = '0x9F984B6f8E414765263Ac4b64C4E7c876900785A';

// DRACMA token contract address (BSC)
export const DRACMA_TOKEN_ADDRESS: Address = '0x8A9f07fdBc75144C9207373597136c6E280A872D';

// BSC Mainnet token addresses
export const USDT_ADDRESS: Address = '0x55d398326f99059fF775485246999027B3197955';
export const USDC_ADDRESS: Address = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
export const WBNB_ADDRESS: Address = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

// Token indices in the presale contract (must match preventa.sol)
export const TOKEN_INDEX = {
  USDT: 0,
  USDC: 1,
  WBNB: 2,
} as const;

// Token decimals
export const TOKEN_DECIMALS = {
  USDT: 18, // BSC USDT is 18 decimals
  USDC: 18, // BSC USDC is 18 decimals
  WBNB: 18,
} as const;

// Minimal ERC20 ABI for approve + allowance + balanceOf
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Presale contract ABI (must match preventa.sol)
export const PRESALE_ABI = [
  {
    inputs: [
      { name: 'tokenIndex', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'buyTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPresaleStatus',
    outputs: [
      { name: 'tokensSold', type: 'uint256' },
      { name: 'tokensAvailable', type: 'uint256' },
      { name: 'timeRemaining', type: 'uint256' },
      { name: 'isEnded', type: 'bool' },
      { name: 'currentTime', type: 'uint256' },
      { name: 'currentPrice', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'calculateTokenAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalTokensSold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'presaleEnded',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'currentTokenPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'secondPhasePrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'presaleEndTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'priceChangeTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_PURCHASE',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_PURCHASE',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'validatePurchaseAmount',
    outputs: [
      { name: 'isValid', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'acceptedTokens',
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'decimals', type: 'uint8' },
      { name: 'isEnabled', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'USDT_INDEX',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'USDC_INDEX',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'WBNB_INDEX',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: true, name: 'tokenIndex', type: 'uint256' },
      { indexed: false, name: 'paymentAmount', type: 'uint256' },
      { indexed: false, name: 'tokenAmount', type: 'uint256' },
    ],
    name: 'TokensPurchased',
    type: 'event',
  },
] as const;

// VestingVault ABI (must match VestingVault.sol)
export const VESTING_ABI = [
  {
    inputs: [],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserVesting',
    outputs: [
      { name: 'total', type: 'uint256' },
      { name: 'vested', type: 'uint256' },
      { name: 'claimed', type: 'uint256' },
      { name: 'claimable', type: 'uint256' },
      { name: 'remaining', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getClaimable',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vestingStart',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vestingDuration',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalDeposited',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalClaimed',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'beneficiary', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'Claimed',
    type: 'event',
  },
] as const;

// Map currency to token address
export function getTokenAddress(currency: 'USDT' | 'USDC' | 'WBNB'): Address {
  switch (currency) {
    case 'USDT': return USDT_ADDRESS;
    case 'USDC': return USDC_ADDRESS;
    case 'WBNB': return WBNB_ADDRESS;
  }
}

// Map currency to token index in presale contract
export function getTokenIndex(currency: 'USDT' | 'USDC' | 'WBNB'): number {
  switch (currency) {
    case 'USDT': return TOKEN_INDEX.USDT;
    case 'USDC': return TOKEN_INDEX.USDC;
    case 'WBNB': return TOKEN_INDEX.WBNB;
  }
}
