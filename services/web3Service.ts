import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  formatUnits,
  parseUnits,
} from 'viem';
import type { Address, PublicClient, WalletClient } from 'viem';
import PresaleABI from '../contracts/Presale.json';
import IERC20ABI from '../contracts/IERC20.json';
import {
  BSC_CHAIN_ID,
  BSC_CHAIN_ID_HEX,
  BSC_NETWORK_CONFIG,
  PRESALE_CONTRACT_ADDRESS,
  STABLE_DECIMALS,
} from '../constants';

// Extend Window for wallet providers
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isTrust?: boolean;
      isCoinbaseWallet?: boolean;
      isBraveWallet?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

// --- Mobile / Provider Detection ---

export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function hasWalletProvider(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

export function isInWalletBrowser(): boolean {
  if (!hasWalletProvider()) return false;
  const eth = window.ethereum!;
  return !!(eth.isMetaMask || eth.isTrust || eth.isCoinbaseWallet || eth.isBraveWallet);
}

export function getDappUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : '';
}

export function getMetaMaskDeepLink(): string {
  const dappUrl = getDappUrl().replace(/^https?:\/\//, '');
  return `https://metamask.app.link/dapp/${dappUrl}`;
}

export function getTrustWalletDeepLink(): string {
  const dappUrl = getDappUrl();
  return `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(dappUrl)}`;
}

// --- Provider Management ---

export function isMetaMaskInstalled(): boolean {
  return hasWalletProvider();
}

export function getBrowserProvider(): PublicClient | null {
  if (!hasWalletProvider()) return null;
  return createPublicClient({
    transport: custom(window.ethereum!),
  });
}

function getWalletClient(): WalletClient | null {
  if (!hasWalletProvider()) return null;
  return createWalletClient({
    transport: custom(window.ethereum!),
  });
}

async function getConnectedAccount(): Promise<Address> {
  const walletClient = getWalletClient();
  if (!walletClient) throw new Error('NO_PROVIDER');

  const [account] = await walletClient.getAddresses();
  if (!account) throw new Error('NO_ACCOUNTS');
  return account;
}

export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  if (!hasWalletProvider()) {
    throw new Error('WALLET_NOT_INSTALLED');
  }
  const walletClient = getWalletClient();
  if (!walletClient) throw new Error('NO_PROVIDER');

  const accounts = await walletClient.requestAddresses();
  if (!accounts || accounts.length === 0) {
    throw new Error('NO_ACCOUNTS');
  }
  const chainId = await walletClient.getChainId();
  return {
    address: accounts[0],
    chainId,
  };
}

// --- Network Management ---

export async function switchToBSC(): Promise<void> {
  if (!window.ethereum) throw new Error('WALLET_NOT_INSTALLED');
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC_CHAIN_ID_HEX }],
    });
  } catch (switchError: unknown) {
    const err = switchError as { code?: number };
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [BSC_NETWORK_CONFIG],
      });
    } else {
      throw switchError;
    }
  }
}

export function isCorrectNetwork(chainId: number): boolean {
  return chainId === BSC_CHAIN_ID;
}

// --- Balance Reads ---

export async function getBNBBalance(address: string): Promise<string> {
  const provider = getBrowserProvider();
  if (!provider) return '0';
  const balance = await provider.getBalance({ address: address as Address });
  return formatEther(balance);
}

export async function getERC20Balance(tokenAddress: string, userAddress: string): Promise<string> {
  const provider = getBrowserProvider();
  if (!provider) return '0';
  const balance = await provider.readContract({
    address: tokenAddress as Address,
    abi: IERC20ABI,
    functionName: 'balanceOf',
    args: [userAddress as Address],
  }) as bigint;
  return formatUnits(balance, STABLE_DECIMALS);
}

// --- Presale Contract Reads ---

export async function readPresaleStatus(): Promise<{
  tokensSold: bigint;
  tokensAvailable: bigint;
  timeRemaining: bigint;
  isEnded: boolean;
  currentTime: bigint;
}> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error('NO_PROVIDER');
  const result = await provider.readContract({
    address: PRESALE_CONTRACT_ADDRESS as Address,
    abi: PresaleABI,
    functionName: 'getPresaleStatus',
  }) as readonly [bigint, bigint, bigint, boolean, bigint];
  return {
    tokensSold: result[0],
    tokensAvailable: result[1],
    timeRemaining: result[2],
    isEnded: result[3],
    currentTime: result[4],
  };
}

export async function readTokenPrice(): Promise<bigint> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error('NO_PROVIDER');
  return await provider.readContract({
    address: PRESALE_CONTRACT_ADDRESS as Address,
    abi: PresaleABI,
    functionName: 'tokenPrice',
  }) as bigint;
}

export async function readContractConstants(): Promise<{
  usdtIndex: number;
  usdcIndex: number;
  minPurchase: bigint;
  maxPurchase: bigint;
  paused: boolean;
  presaleEnded: boolean;
}> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error('NO_PROVIDER');
  const [usdtIndex, usdcIndex, minPurchase, maxPurchase, paused, presaleEnded] = await Promise.all([
    provider.readContract({
      address: PRESALE_CONTRACT_ADDRESS as Address,
      abi: PresaleABI,
      functionName: 'USDT_INDEX',
    }),
    provider.readContract({
      address: PRESALE_CONTRACT_ADDRESS as Address,
      abi: PresaleABI,
      functionName: 'USDC_INDEX',
    }),
    provider.readContract({
      address: PRESALE_CONTRACT_ADDRESS as Address,
      abi: PresaleABI,
      functionName: 'MIN_PURCHASE_STABLE',
    }),
    provider.readContract({
      address: PRESALE_CONTRACT_ADDRESS as Address,
      abi: PresaleABI,
      functionName: 'MAX_PURCHASE',
    }),
    provider.readContract({
      address: PRESALE_CONTRACT_ADDRESS as Address,
      abi: PresaleABI,
      functionName: 'paused',
    }),
    provider.readContract({
      address: PRESALE_CONTRACT_ADDRESS as Address,
      abi: PresaleABI,
      functionName: 'presaleEnded',
    }),
  ]);
  return {
    usdtIndex: Number(usdtIndex),
    usdcIndex: Number(usdcIndex),
    minPurchase: minPurchase as bigint,
    maxPurchase: maxPurchase as bigint,
    paused: paused as boolean,
    presaleEnded: presaleEnded as boolean,
  };
}

// --- ERC20 Approve ---

export async function checkAllowance(tokenAddress: string, ownerAddress: string): Promise<bigint> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error('NO_PROVIDER');
  return await provider.readContract({
    address: tokenAddress as Address,
    abi: IERC20ABI,
    functionName: 'allowance',
    args: [ownerAddress as Address, PRESALE_CONTRACT_ADDRESS as Address],
  }) as bigint;
}

export async function approveToken(tokenAddress: string, amount: bigint): Promise<string> {
  const provider = getBrowserProvider();
  const walletClient = getWalletClient();
  if (!provider || !walletClient) throw new Error('NO_PROVIDER');
  const account = await getConnectedAccount();
  const hash = await walletClient.writeContract({
    account,
    chain: null,
    address: tokenAddress as Address,
    abi: IERC20ABI,
    functionName: 'approve',
    args: [PRESALE_CONTRACT_ADDRESS as Address, amount],
  });
  await provider.waitForTransactionReceipt({ hash });
  return hash;
}

// --- Purchase Functions ---

export async function buyWithERC20(tokenIndex: number, amount: bigint): Promise<string> {
  const provider = getBrowserProvider();
  const walletClient = getWalletClient();
  if (!provider || !walletClient) throw new Error('NO_PROVIDER');
  const account = await getConnectedAccount();
  const hash = await walletClient.writeContract({
    account,
    chain: null,
    address: PRESALE_CONTRACT_ADDRESS as Address,
    abi: PresaleABI,
    functionName: 'buyTokens',
    args: [tokenIndex, amount],
  });
  await provider.waitForTransactionReceipt({ hash });
  return hash;
}

export async function buyWithBNB(bnbAmountWei: bigint): Promise<string> {
  const provider = getBrowserProvider();
  const walletClient = getWalletClient();
  if (!provider || !walletClient) throw new Error('NO_PROVIDER');
  const account = await getConnectedAccount();
  const hash = await walletClient.sendTransaction({
    account,
    chain: null,
    to: PRESALE_CONTRACT_ADDRESS as Address,
    value: bnbAmountWei,
  });
  await provider.waitForTransactionReceipt({ hash });
  return hash;
}

// --- Utility ---

export function parseStableAmount(amount: string): bigint {
  return parseUnits(amount, STABLE_DECIMALS);
}

export function parseBNBAmount(amount: string): bigint {
  return parseUnits(amount, 18);
}

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return formatUnits(amount, decimals);
}

// --- Event Listeners ---

export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
  if (!window.ethereum) return () => {};
  const handler = (accounts: unknown) => callback(accounts as string[]);
  window.ethereum.on('accountsChanged', handler);
  return () => window.ethereum?.removeListener('accountsChanged', handler);
}

export function onChainChanged(callback: (chainId: string) => void): () => void {
  if (!window.ethereum) return () => {};
  const handler = (chainId: unknown) => callback(chainId as string);
  window.ethereum.on('chainChanged', handler);
  return () => window.ethereum?.removeListener('chainChanged', handler);
}

// --- Error Parsing ---

export function parseWeb3Error(error: unknown): string {
  const err = error as { code?: string; reason?: string; revert?: { name?: string }; message?: string };

  if (err?.message === 'WALLET_NOT_INSTALLED') return 'walletNotInstalled';
  if (err?.code === 'ACTION_REJECTED') return 'txRejected';
  if (err?.code === 'INSUFFICIENT_FUNDS') return 'insufficientBalance';

  const errorName = err?.revert?.name || err?.reason;
  const errorMap: Record<string, string> = {
    'BelowMinimumPurchase': 'belowMinPurchase',
    'ExceedsMaximumPurchase': 'exceedsMaxPurchase',
    'PresaleEndedError': 'presaleEndedMsg',
    'EnforcedPause': 'presalePausedMsg',
    'InsufficientAllowance': 'insufficientBalance',
    'InsufficientSaleTokens': 'presaleEndedMsg',
    'InvalidAmount': 'belowMinPurchase',
    'TokenNotAccepted': 'txFailed',
    'TransferFailed': 'txFailed',
  };

  if (errorName && errorMap[errorName]) {
    return errorMap[errorName];
  }

  return 'txFailed';
}
