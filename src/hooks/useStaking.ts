import { useState, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import { parseEther } from 'viem';
import {
  STAKING_ADDRESS,
  STAKING_ABI,
  DRACMA_TOKEN_ADDRESS,
  ERC20_ABI,
} from '../config/contracts';

export type StakeStep =
  | 'idle'
  | 'approving'
  | 'waiting-approval'
  | 'staking'
  | 'confirming'
  | 'success'
  | 'error';

export type UnstakeStep = 'idle' | 'unstaking' | 'confirming' | 'success' | 'error';
export type ClaimStep = 'idle' | 'claiming' | 'confirming' | 'success' | 'error';

interface StakingData {
  stakedAmount: bigint;
  pendingRewards: bigint;
  lastClaimTime: bigint;
}

interface UseStakingReturn {
  stakingData: StakingData | null;
  aprBasisPoints: bigint | undefined;
  totalStaked: bigint | undefined;
  rewardPoolBalance: bigint | undefined;
  dracmaBalance: bigint | undefined;
  stakeStep: StakeStep;
  unstakeStep: UnstakeStep;
  claimStep: ClaimStep;
  txHash: string | null;
  errorMessage: string | null;
  stakeTokens: (amount: string) => Promise<void>;
  unstakeTokens: (amount: string) => Promise<void>;
  claimRewards: () => Promise<void>;
  reset: () => void;
}

export function useStaking(): UseStakingReturn {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [stakeStep, setStakeStep] = useState<StakeStep>('idle');
  const [unstakeStep, setUnstakeStep] = useState<UnstakeStep>('idle');
  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Read user staking info
  const { data: userStakeRaw } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'getUserStake',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 15_000,
    },
  });

  // Read global staking data
  const { data: aprBasisPoints } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'aprBasisPoints',
    query: { refetchInterval: 60_000 },
  });

  const { data: totalStaked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'totalStaked',
    query: { refetchInterval: 60_000 },
  });

  const { data: rewardPoolBalance } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'rewardPoolBalance',
    query: { refetchInterval: 60_000 },
  });

  // Read user DRACMA balance
  const { data: dracmaBalance } = useReadContract({
    address: DRACMA_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 15_000,
    },
  });

  const stakingData: StakingData | null = userStakeRaw
    ? {
        stakedAmount: userStakeRaw[0],
        pendingRewards: userStakeRaw[1],
        lastClaimTime: userStakeRaw[2],
      }
    : null;

  const reset = useCallback(() => {
    setStakeStep('idle');
    setUnstakeStep('idle');
    setClaimStep('idle');
    setTxHash(null);
    setErrorMessage(null);
  }, []);

  const stakeTokens = useCallback(async (amount: string) => {
    if (!address) {
      setErrorMessage('Wallet no conectada');
      setStakeStep('error');
      return;
    }

    setErrorMessage(null);
    setTxHash(null);

    try {
      const amountWei = parseEther(amount);

      // Check allowance and approve if needed
      if (publicClient) {
        const currentAllowance = await publicClient.readContract({
          address: DRACMA_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, STAKING_ADDRESS],
        });

        if (currentAllowance < amountWei) {
          setStakeStep('approving');

          const approveTx = await writeContractAsync({
            address: DRACMA_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [STAKING_ADDRESS, amountWei],
          });

          setStakeStep('waiting-approval');

          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveTx as `0x${string}`,
            confirmations: 1,
          });

          if (approveReceipt.status === 'reverted') {
            throw new Error('La aprobación fue revertida');
          }
        }
      }

      // Stake
      setStakeStep('staking');

      const stakeTx = await writeContractAsync({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'stake',
        args: [amountWei],
      });

      setTxHash(stakeTx);
      setStakeStep('confirming');

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: stakeTx as `0x${string}`,
          confirmations: 1,
        });

        if (receipt.status === 'reverted') {
          throw new Error('La transacción fue revertida por la blockchain');
        }
      }

      setStakeStep('success');
    } catch (err: any) {
      console.error('Staking error:', err);
      setErrorMessage(_parseError(err));
      setStakeStep('error');
    }
  }, [address, writeContractAsync, publicClient]);

  const unstakeTokens = useCallback(async (amount: string) => {
    if (!address) {
      setErrorMessage('Wallet no conectada');
      setUnstakeStep('error');
      return;
    }

    setErrorMessage(null);
    setTxHash(null);

    try {
      const amountWei = parseEther(amount);

      setUnstakeStep('unstaking');

      const tx = await writeContractAsync({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'unstake',
        args: [amountWei],
      });

      setTxHash(tx);
      setUnstakeStep('confirming');

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx as `0x${string}`,
          confirmations: 1,
        });

        if (receipt.status === 'reverted') {
          throw new Error('La transacción fue revertida por la blockchain');
        }
      }

      setUnstakeStep('success');
    } catch (err: any) {
      console.error('Unstake error:', err);
      setErrorMessage(_parseError(err));
      setUnstakeStep('error');
    }
  }, [address, writeContractAsync, publicClient]);

  const claimRewards = useCallback(async () => {
    if (!address) {
      setErrorMessage('Wallet no conectada');
      setClaimStep('error');
      return;
    }

    setErrorMessage(null);
    setTxHash(null);

    try {
      setClaimStep('claiming');

      const tx = await writeContractAsync({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'claimRewards',
      });

      setTxHash(tx);
      setClaimStep('confirming');

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx as `0x${string}`,
          confirmations: 1,
        });

        if (receipt.status === 'reverted') {
          throw new Error('La transacción fue revertida por la blockchain');
        }
      }

      setClaimStep('success');
    } catch (err: any) {
      console.error('Claim rewards error:', err);
      setErrorMessage(_parseError(err));
      setClaimStep('error');
    }
  }, [address, writeContractAsync, publicClient]);

  return {
    stakingData,
    aprBasisPoints,
    totalStaked,
    rewardPoolBalance,
    dracmaBalance,
    stakeStep,
    unstakeStep,
    claimStep,
    txHash,
    errorMessage,
    stakeTokens,
    unstakeTokens,
    claimRewards,
    reset,
  };
}

function _parseError(err: any): string {
  if (err?.shortMessage) {
    return err.shortMessage;
  }

  if (err?.message) {
    if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
      return 'Transacción rechazada por el usuario';
    }
    if (err.message.includes('NothingStaked')) {
      return 'No tienes tokens en staking';
    }
    if (err.message.includes('NothingToClaim')) {
      return 'No tienes recompensas disponibles';
    }
    if (err.message.includes('InsufficientRewardPool')) {
      return 'Pool de recompensas insuficiente';
    }
    if (err.message.includes('InvalidAmount')) {
      return 'Monto inválido';
    }
    if (err.message.includes('EnforcedPause')) {
      return 'El staking está pausado temporalmente';
    }
    return err.message.slice(0, 120);
  }

  return 'Error al procesar la transacción';
}
