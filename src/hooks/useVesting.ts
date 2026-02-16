import { useState, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import {
  VESTING_VAULT_ADDRESS,
  VESTING_ABI,
} from '../config/contracts';

export type ClaimStep = 'idle' | 'claiming' | 'confirming' | 'success' | 'error';

interface VestingData {
  total: bigint;
  vested: bigint;
  claimed: bigint;
  claimable: bigint;
  remaining: bigint;
}

interface UseVestingReturn {
  vestingData: VestingData | null;
  vestingStart: bigint | undefined;
  vestingDuration: bigint | undefined;
  claimStep: ClaimStep;
  claimTxHash: string | null;
  claimError: string | null;
  claimTokens: () => Promise<void>;
  resetClaim: () => void;
}

export function useVesting(): UseVestingReturn {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [claimStep, setClaimStep] = useState<ClaimStep>('idle');
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Read user vesting info
  const { data: userVestingRaw } = useReadContract({
    address: VESTING_VAULT_ADDRESS,
    abi: VESTING_ABI,
    functionName: 'getUserVesting',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 15_000,
    },
  });

  const { data: vestingStart } = useReadContract({
    address: VESTING_VAULT_ADDRESS,
    abi: VESTING_ABI,
    functionName: 'vestingStart',
    query: { refetchInterval: 60_000 },
  });

  const { data: vestingDuration } = useReadContract({
    address: VESTING_VAULT_ADDRESS,
    abi: VESTING_ABI,
    functionName: 'vestingDuration',
    query: { refetchInterval: 60_000 },
  });

  const vestingData: VestingData | null = userVestingRaw
    ? {
        total: userVestingRaw[0],
        vested: userVestingRaw[1],
        claimed: userVestingRaw[2],
        claimable: userVestingRaw[3],
        remaining: userVestingRaw[4],
      }
    : null;

  const resetClaim = useCallback(() => {
    setClaimStep('idle');
    setClaimTxHash(null);
    setClaimError(null);
  }, []);

  const claimTokens = useCallback(async () => {
    if (!address) {
      setClaimError('Wallet no conectada');
      setClaimStep('error');
      return;
    }

    setClaimError(null);
    setClaimTxHash(null);

    try {
      setClaimStep('claiming');

      const txHash = await writeContractAsync({
        address: VESTING_VAULT_ADDRESS,
        abi: VESTING_ABI,
        functionName: 'claim',
      });

      setClaimTxHash(txHash);
      setClaimStep('confirming');

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          confirmations: 1,
        });

        if (receipt.status === 'reverted') {
          throw new Error('La transacción fue revertida por la blockchain');
        }
      }

      setClaimStep('success');
    } catch (err: any) {
      console.error('Vesting claim error:', err);

      let message = 'Error al reclamar tokens';

      if (err?.shortMessage) {
        message = err.shortMessage;
      } else if (err?.message) {
        if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
          message = 'Transacción rechazada por el usuario';
        } else if (err.message.includes('VestingNotStarted')) {
          message = 'El vesting aún no ha comenzado';
        } else if (err.message.includes('NothingToClaim')) {
          message = 'No tienes tokens disponibles para reclamar';
        } else {
          message = err.message.slice(0, 120);
        }
      }

      setClaimError(message);
      setClaimStep('error');
    }
  }, [address, writeContractAsync, publicClient]);

  return {
    vestingData,
    vestingStart,
    vestingDuration,
    claimStep,
    claimTxHash,
    claimError,
    claimTokens,
    resetClaim,
  };
}
