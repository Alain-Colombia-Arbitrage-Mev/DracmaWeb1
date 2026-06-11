import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  WalletState,
  PresaleContractData,
  TransactionState,
  TransactionStatus,
  PresalePaymentCurrency,
} from '../types';
import {
  BSC_CHAIN_ID,
  USDT_BSC_ADDRESS,
  USDC_BSC_ADDRESS,
} from '../constants';
import * as web3 from '../services/web3Service';

// --- Context Type ---

interface WalletContextType {
  wallet: WalletState;
  presaleOnChain: PresaleContractData;
  txState: TransactionState;
  showWalletModal: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshPresaleData: () => Promise<void>;
  executePurchase: (currency: PresalePaymentCurrency, amount: string) => Promise<void>;
  resetTxState: () => void;
  closeWalletModal: () => void;
}

const defaultWallet: WalletState = {
  isConnected: false,
  address: null,
  chainId: null,
  isCorrectNetwork: false,
  balanceBNB: null,
  balanceUSDT: null,
  balanceUSDC: null,
};

const defaultPresaleData: PresaleContractData = {
  tokenPrice: null,
  tokenPriceFormatted: 0.10,
  totalTokensSold: null,
  tokensAvailable: null,
  presaleEnded: false,
  paused: false,
  minPurchaseStable: null,
  maxPurchase: null,
  usdtIndex: 0,
  usdcIndex: 1,
};

const defaultTxState: TransactionState = {
  status: TransactionStatus.IDLE,
  txHash: null,
  errorMessage: null,
};

export const WalletContext = createContext<WalletContextType>({
  wallet: defaultWallet,
  presaleOnChain: defaultPresaleData,
  txState: defaultTxState,
  showWalletModal: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchNetwork: async () => {},
  refreshBalances: async () => {},
  refreshPresaleData: async () => {},
  executePurchase: async () => {},
  resetTxState: () => {},
  closeWalletModal: () => {},
});

// --- Provider Component ---

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>(defaultWallet);
  const [presaleOnChain, setPresaleOnChain] = useState<PresaleContractData>(defaultPresaleData);
  const [txState, setTxState] = useState<TransactionState>(defaultTxState);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const closeWalletModal = useCallback(() => setShowWalletModal(false), []);

  // --- Refresh Balances ---

  const refreshBalances = useCallback(async () => {
    if (!wallet.address || !wallet.isCorrectNetwork) return;
    try {
      const [bnb, usdt, usdc] = await Promise.all([
        web3.getBNBBalance(wallet.address),
        web3.getERC20Balance(USDT_BSC_ADDRESS, wallet.address),
        web3.getERC20Balance(USDC_BSC_ADDRESS, wallet.address),
      ]);
      setWallet(prev => ({
        ...prev,
        balanceBNB: parseFloat(bnb).toFixed(4),
        balanceUSDT: parseFloat(usdt).toFixed(2),
        balanceUSDC: parseFloat(usdc).toFixed(2),
      }));
    } catch {
      // Silently fail balance reads
    }
  }, [wallet.address, wallet.isCorrectNetwork]);

  // --- Refresh Presale Data ---

  const refreshPresaleData = useCallback(async () => {
    if (!web3.hasWalletProvider()) return;
    try {
      const [status, constants, price] = await Promise.all([
        web3.readPresaleStatus(),
        web3.readContractConstants(),
        web3.readTokenPrice(),
      ]);
      setPresaleOnChain({
        tokenPrice: price,
        tokenPriceFormatted: parseFloat(web3.formatTokenAmount(price, 18)),
        totalTokensSold: status.tokensSold,
        tokensAvailable: status.tokensAvailable,
        presaleEnded: status.isEnded || constants.presaleEnded,
        paused: constants.paused,
        minPurchaseStable: constants.minPurchase,
        maxPurchase: constants.maxPurchase,
        usdtIndex: constants.usdtIndex,
        usdcIndex: constants.usdcIndex,
      });
    } catch {
      // Keep default data if read fails
    }
  }, []);

  // --- Connect Wallet ---

  const connectWallet = useCallback(async () => {
    // If no wallet provider available, show modal with deep links / install options
    if (!web3.hasWalletProvider()) {
      setShowWalletModal(true);
      return;
    }

    try {
      const { address, chainId } = await web3.connectWallet();
      const correct = web3.isCorrectNetwork(chainId);

      setWallet({
        isConnected: true,
        address,
        chainId,
        isCorrectNetwork: correct,
        balanceBNB: null,
        balanceUSDT: null,
        balanceUSDC: null,
      });

      if (!correct) {
        try {
          await web3.switchToBSC();
          setWallet(prev => ({ ...prev, chainId: BSC_CHAIN_ID, isCorrectNetwork: true }));
        } catch {
          // User rejected network switch, keep showing wrong network
        }
      }
    } catch (error) {
      const errKey = web3.parseWeb3Error(error);
      if (errKey === 'txRejected') return; // User just cancelled
      throw error;
    }
  }, []);

  // --- Disconnect ---

  const disconnectWallet = useCallback(() => {
    setWallet(defaultWallet);
    setTxState(defaultTxState);
  }, []);

  // --- Switch Network ---

  const switchNetwork = useCallback(async () => {
    try {
      await web3.switchToBSC();
      setWallet(prev => ({ ...prev, chainId: BSC_CHAIN_ID, isCorrectNetwork: true }));
    } catch {
      // User rejected
    }
  }, []);

  // --- Execute Purchase ---

  const executePurchase = useCallback(async (currency: PresalePaymentCurrency, amountStr: string) => {
    if (!wallet.address || !wallet.isCorrectNetwork) return;

    try {
      if (currency === PresalePaymentCurrency.BNB) {
        // BNB native purchase - send directly to contract
        setTxState({ status: TransactionStatus.AWAITING_PURCHASE, txHash: null, errorMessage: null });
        const bnbWei = web3.parseBNBAmount(amountStr);
        const txHash = await web3.buyWithBNB(bnbWei);
        setTxState({ status: TransactionStatus.SUCCESS, txHash, errorMessage: null });
      } else {
        // ERC20 purchase (USDT or USDC)
        const tokenAddress = currency === PresalePaymentCurrency.USDT ? USDT_BSC_ADDRESS : USDC_BSC_ADDRESS;
        const tokenIndex = currency === PresalePaymentCurrency.USDT ? presaleOnChain.usdtIndex : presaleOnChain.usdcIndex;
        const amount = web3.parseStableAmount(amountStr);

        // Step 1: Check allowance and approve if needed
        const currentAllowance = await web3.checkAllowance(tokenAddress, wallet.address);

        if (currentAllowance < amount) {
          setTxState({ status: TransactionStatus.AWAITING_APPROVAL, txHash: null, errorMessage: null });
          await web3.approveToken(tokenAddress, amount);
          setTxState(prev => ({ ...prev, status: TransactionStatus.APPROVAL_PENDING }));
        }

        // Step 2: Buy tokens
        setTxState(prev => ({ ...prev, status: TransactionStatus.AWAITING_PURCHASE }));
        const txHash = await web3.buyWithERC20(tokenIndex, amount);
        setTxState({ status: TransactionStatus.SUCCESS, txHash, errorMessage: null });
      }

      // Refresh after successful purchase
      await Promise.all([refreshBalances(), refreshPresaleData()]);
    } catch (error) {
      const errorKey = web3.parseWeb3Error(error);
      setTxState({ status: TransactionStatus.ERROR, txHash: null, errorMessage: errorKey });
    }
  }, [wallet.address, wallet.isCorrectNetwork, presaleOnChain.usdtIndex, presaleOnChain.usdcIndex, refreshBalances, refreshPresaleData]);

  // --- Reset Tx State ---

  const resetTxState = useCallback(() => {
    setTxState(defaultTxState);
  }, []);

  // --- Effects ---

  // Load balances when wallet connects to correct network
  useEffect(() => {
    if (wallet.isConnected && wallet.isCorrectNetwork) {
      refreshBalances();
      refreshPresaleData();
    }
  }, [wallet.isConnected, wallet.isCorrectNetwork, refreshBalances, refreshPresaleData]);

  // Poll presale data every 30s
  useEffect(() => {
    if (wallet.isConnected && wallet.isCorrectNetwork) {
      pollingRef.current = setInterval(refreshPresaleData, 30000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [wallet.isConnected, wallet.isCorrectNetwork, refreshPresaleData]);

  // Listen for MetaMask events
  useEffect(() => {
    const unsubAccounts = web3.onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWallet(prev => ({ ...prev, address: accounts[0] }));
      }
    });

    const unsubChain = web3.onChainChanged((chainIdHex) => {
      const newChainId = parseInt(chainIdHex, 16);
      setWallet(prev => ({
        ...prev,
        chainId: newChainId,
        isCorrectNetwork: web3.isCorrectNetwork(newChainId),
      }));
    });

    return () => {
      unsubAccounts();
      unsubChain();
    };
  }, [disconnectWallet]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        presaleOnChain,
        txState,
        showWalletModal,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        refreshBalances,
        refreshPresaleData,
        executePurchase,
        resetTxState,
        closeWalletModal,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
