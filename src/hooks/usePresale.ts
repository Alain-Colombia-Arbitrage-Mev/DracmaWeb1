import { useState, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useSwitchChain,
  useChainId,
  usePublicClient,
} from 'wagmi';
import { parseUnits, type Address } from 'viem';
import { bsc } from 'wagmi/chains';
import {
  PRESALE_CONTRACT_ADDRESS,
  PRESALE_ABI,
  ERC20_ABI,
  getTokenAddress,
  getTokenIndex,
  TOKEN_DECIMALS,
} from '../config/contracts';
import type { PresaleCurrency } from '../types';

export type TxStep = 'idle' | 'switching-chain' | 'approving' | 'waiting-approval' | 'buying' | 'confirming' | 'success' | 'error';

// Minimum purchase: 1 token (1e18 in wei for 18-decimal tokens)
const MIN_PURCHASE_AMOUNT = 1;

interface UsePresaleReturn {
  // On-chain data
  presaleStatus: {
    tokensSold: bigint;
    tokensAvailable: bigint;
    timeRemaining: bigint;
    isEnded: boolean;
  } | null;
  tokenPrice: bigint | undefined;
  totalTokensSold: bigint | undefined;
  isPaused: boolean;
  userBalance: bigint | undefined;
  userAllowance: bigint | undefined;
  // Transaction state
  txStep: TxStep;
  txHash: string | null;
  errorMessage: string | null;
  // Actions
  buyTokens: (currency: PresaleCurrency, amount: string) => Promise<void>;
  reset: () => void;
}

export function usePresale(): UsePresaleReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<PresaleCurrency | null>(null);

  // Read presale status from contract
  const { data: presaleStatusRaw } = useReadContract({
    address: PRESALE_CONTRACT_ADDRESS,
    abi: PRESALE_ABI,
    functionName: 'getPresaleStatus',
    query: { refetchInterval: 30_000 },
  });

  const { data: tokenPrice } = useReadContract({
    address: PRESALE_CONTRACT_ADDRESS,
    abi: PRESALE_ABI,
    functionName: 'tokenPrice',
    query: { refetchInterval: 60_000 },
  });

  const { data: totalTokensSold } = useReadContract({
    address: PRESALE_CONTRACT_ADDRESS,
    abi: PRESALE_ABI,
    functionName: 'totalTokensSold',
    query: { refetchInterval: 30_000 },
  });

  const { data: isPausedRaw } = useReadContract({
    address: PRESALE_CONTRACT_ADDRESS,
    abi: PRESALE_ABI,
    functionName: 'paused',
  });

  // Read user's token balance for the selected currency
  const tokenAddr = selectedCurrency ? getTokenAddress(selectedCurrency as 'USDT' | 'USDC' | 'WBNB') : undefined;

  const { data: userBalance } = useReadContract({
    address: tokenAddr as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!tokenAddr,
      refetchInterval: 15_000,
    },
  });

  // Read user's allowance for the presale contract
  const { data: userAllowance } = useReadContract({
    address: tokenAddr as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, PRESALE_CONTRACT_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!tokenAddr,
      refetchInterval: 10_000,
    },
  });

  const presaleStatus = presaleStatusRaw
    ? {
        tokensSold: presaleStatusRaw[0],
        tokensAvailable: presaleStatusRaw[1],
        timeRemaining: presaleStatusRaw[2],
        isEnded: presaleStatusRaw[3],
      }
    : null;

  const reset = useCallback(() => {
    setTxStep('idle');
    setTxHash(null);
    setErrorMessage(null);
  }, []);

  const buyTokens = useCallback(
    async (currency: PresaleCurrency, amount: string) => {
      if (!isConnected || !address) {
        setErrorMessage('Wallet no conectada');
        setTxStep('error');
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (!parsedAmount || parsedAmount <= 0) {
        setErrorMessage('Ingresa una cantidad válida');
        setTxStep('error');
        return;
      }

      if (parsedAmount < MIN_PURCHASE_AMOUNT) {
        setErrorMessage(`Compra mínima: ${MIN_PURCHASE_AMOUNT} ${currency}`);
        setTxStep('error');
        return;
      }

      setSelectedCurrency(currency);
      setErrorMessage(null);
      setTxHash(null);

      try {
        // Step 1: Ensure correct chain (BSC)
        if (chainId !== bsc.id) {
          setTxStep('switching-chain');
          await switchChainAsync({ chainId: bsc.id });
        }

        const currencyKey = currency as 'USDT' | 'USDC' | 'WBNB';
        const tokenAddress = getTokenAddress(currencyKey);
        const tokenIndex = getTokenIndex(currencyKey);
        const decimals = TOKEN_DECIMALS[currencyKey];
        const amountInWei = parseUnits(amount, decimals);

        // Step 2: Read fresh allowance from chain and approve if needed
        let currentAllowance = BigInt(0);

        if (publicClient && address) {
          currentAllowance = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, PRESALE_CONTRACT_ADDRESS],
          }) as bigint;
        }

        const needsApproval = currentAllowance < amountInWei;

        if (needsApproval) {
          setTxStep('approving');

          const approveTxHash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [PRESALE_CONTRACT_ADDRESS, amountInWei],
          });

          // Wait for approval to be confirmed on-chain
          setTxStep('waiting-approval');

          if (publicClient) {
            await publicClient.waitForTransactionReceipt({
              hash: approveTxHash as `0x${string}`,
              confirmations: 1,
            });
          } else {
            await new Promise((resolve) => setTimeout(resolve, 8000));
          }
        }

        // Step 3: Call buyTokens on presale contract (auto-proceeds after approval)
        setTxStep('buying');

        const buyTxHash = await writeContractAsync({
          address: PRESALE_CONTRACT_ADDRESS,
          abi: PRESALE_ABI,
          functionName: 'buyTokens',
          args: [BigInt(tokenIndex), amountInWei],
        });

        setTxHash(buyTxHash);
        setTxStep('confirming');

        // Wait for the buy transaction to be confirmed on-chain
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: buyTxHash as `0x${string}`,
            confirmations: 1,
          });

          if (receipt.status === 'reverted') {
            throw new Error('La transacción fue revertida por la blockchain');
          }
        }

        setTxStep('success');
      } catch (err: any) {
        console.error('Presale purchase error:', err);

        let message = 'La transacción falló';

        if (err?.shortMessage) {
          message = err.shortMessage;
        } else if (err?.message) {
          if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
            message = 'Transacción rechazada por el usuario';
          } else if (err.message.includes('insufficient funds') || err.message.includes('InsufficientAllowance')) {
            message = 'Balance o aprobación insuficiente';
          } else if (err.message.includes('BelowMinimumPurchase')) {
            message = `Compra mínima: ${MIN_PURCHASE_AMOUNT} ${selectedCurrency || currency}`;
          } else if (err.message.includes('ExceedsMaximumPurchase')) {
            message = 'Cantidad excede el máximo de compra';
          } else if (err.message.includes('PresaleEndedError') || err.message.includes('PresaleTimeExpired')) {
            message = 'La preventa ha terminado';
          } else if (err.message.includes('EnforcedPause')) {
            message = 'La preventa está pausada';
          } else if (err.message.includes('InsufficientSaleTokens')) {
            message = 'No hay suficientes tokens disponibles';
          } else {
            message = err.message.slice(0, 120);
          }
        }

        setErrorMessage(message);
        setTxStep('error');
      }
    },
    [isConnected, address, chainId, switchChainAsync, writeContractAsync, publicClient, selectedCurrency],
  );

  return {
    presaleStatus,
    tokenPrice,
    totalTokensSold,
    isPaused: !!isPausedRaw,
    userBalance,
    userAllowance,
    txStep,
    txHash,
    errorMessage,
    buyTokens,
    reset,
  };
}
