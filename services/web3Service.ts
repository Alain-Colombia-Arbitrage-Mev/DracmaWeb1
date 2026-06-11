import { BrowserProvider, Contract, parseUnits, formatUnits, formatEther } from 'ethers';
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

export function getBrowserProvider(): BrowserProvider | null {
  if (!hasWalletProvider()) return null;
  return new BrowserProvider(window.ethereum!);
}

export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  if (!hasWalletProvider()) {
    throw new Error('WALLET_NOT_INSTALLED');
  }
  const provider = new BrowserProvider(window.ethereum!);
  const accounts = await provider.send('eth_requestAccounts', []) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error('NO_ACCOUNTS');
  }
  const network = await provider.getNetwork();
  return {
    address: accounts[0],
    chainId: Number(network.chainId),
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
  const balance = await provider.getBalance(address);
  return formatEther(balance);
}

export async function getERC20Balance(tokenAddress: string, userAddress: string): Promise<string> {
  const provider = getBrowserProvider();
  if (!provider) return '0';
  const contract = new Contract(tokenAddress, IERC20ABI, provider);
  const balance: bigint = await contract.balanceOf(userAddress);
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
  const contract = new Contract(PRESALE_CONTRACT_ADDRESS, PresaleABI, provider);
  const result = await contract.getPresaleStatus();
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
  const contract = new Contract(PRESALE_CONTRACT_ADDRESS, PresaleABI, provider);
  return await contract.tokenPrice();
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
  const contract = new Contract(PRESALE_CONTRACT_ADDRESS, PresaleABI, provider);
  const [usdtIndex, usdcIndex, minPurchase, maxPurchase, paused, presaleEnded] = await Promise.all([
    contract.USDT_INDEX(),
    contract.USDC_INDEX(),
    contract.MIN_PURCHASE_STABLE(),
    contract.MAX_PURCHASE(),
    contract.paused(),
    contract.presaleEnded(),
  ]);
  return {
    usdtIndex: Number(usdtIndex),
    usdcIndex: Number(usdcIndex),
    minPurchase,
    maxPurchase,
    paused,
    presaleEnded,
  };
}

// --- ERC20 Approve ---

export async function checkAllowance(tokenAddress: string, ownerAddress: string): Promise<bigint> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error('NO_PROVIDER');
  const contract = new Contract(tokenAddress, IERC20ABI, provider);
  return await contract.allowance(ownerAddress, PRESALE_CONTRACT_ADDRESS);
}

export async function approveToken(tokenAddress: string, amount: bigint): Promise<string> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error('NO_PROVIDER');
  const signer = await provider.getSigner();
  const contract = new Contract(tokenAddress, IERC20ABI, signer);
  const tx = await contract.approve(PRESALE_CONTRACT_ADDRESS, amount);
  const receipt = await tx.wait();
  return receipt.hash;
}

// --- Purchase Functions ---

export async function buyWithERC20(tokenIndex: number, amount: bigint): Promise<string> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error('NO_PROVIDER');
  const signer = await provider.getSigner();
  const contract = new Contract(PRESALE_CONTRACT_ADDRESS, PresaleABI, signer);
  const tx = await contract.buyTokens(tokenIndex, amount);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function buyWithBNB(bnbAmountWei: bigint): Promise<string> {
  const provider = getBrowserProvider();
  if (!provider) throw new Error('NO_PROVIDER');
  const signer = await provider.getSigner();
  const tx = await signer.sendTransaction({
    to: PRESALE_CONTRACT_ADDRESS,
    value: bnbAmountWei,
  });
  const receipt = await tx.wait();
  return receipt!.hash;
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
