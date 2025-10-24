import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';
import { GoalzABI } from '../abis';
import { CONTRACTS } from '../config';
import { AutomatedDepositData } from '../types';

/**
 * Hook to read automated deposit data for a specific goal
 */
export function useAutomatedDeposit(goalId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.GOALZ,
    abi: GoalzABI,
    functionName: 'automatedDeposits',
    args: [goalId],
    query: {
      enabled: goalId !== undefined,
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  });

  const automationData: AutomatedDepositData | null = useMemo(() => {
    if (!data) return null;

    const [amount, frequency, lastDeposit, gelatoTaskId] = data;
    
    // Check if automation is active (has an amount set)
    const isActive = amount > BigInt(0);
    
    if (!isActive) return null;

    // Calculate next deposit date
    const nextDepositTimestamp = Number(lastDeposit) + Number(frequency);
    const nextDepositDate = new Date(nextDepositTimestamp * 1000);

    return {
      amount,
      frequency,
      lastDeposit,
      gelatoTaskId: gelatoTaskId as string,
      isActive,
      nextDepositDate,
    };
  }, [data]);

  return {
    data: automationData,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to calculate automation metrics for a goal
 */
export function useAutomationMetrics(
  goalId: bigint,
  targetAmount: bigint,
  currentAmount: bigint,
  automationData: AutomatedDepositData | null
) {
  return useMemo(() => {
    if (!automationData) {
      return {
        depositsRemaining: 0,
        estimatedCompletion: null,
        approvalNeeded: BigInt(0),
        daysToCompletion: 0,
      };
    }

    const remainingAmount = targetAmount - currentAmount;
    const depositsRemaining = Math.ceil(
      Number(remainingAmount) / Number(automationData.amount)
    );

    // Calculate estimated completion date
    const frequencyInMs = Number(automationData.frequency) * 1000;
    const lastDepositMs = Number(automationData.lastDeposit) * 1000;
    const estimatedCompletionMs = lastDepositMs + (depositsRemaining * frequencyInMs);
    const estimatedCompletion = new Date(estimatedCompletionMs);

    // Calculate days to completion
    const now = Date.now();
    const daysToCompletion = Math.ceil((estimatedCompletionMs - now) / (1000 * 60 * 60 * 24));

    // Calculate approval needed (amount × deposits remaining)
    const approvalNeeded = automationData.amount * BigInt(depositsRemaining);

    return {
      depositsRemaining: Math.max(0, depositsRemaining),
      estimatedCompletion,
      approvalNeeded,
      daysToCompletion: Math.max(0, daysToCompletion),
    };
  }, [targetAmount, currentAmount, automationData]);
}

/**
 * Hook to check if user has sufficient allowance for automated deposits
 */
export function useAutomationAllowanceCheck(
  tokenAddress: Address,
  userAddress?: Address,
  requiredAllowance?: bigint
) {
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: [
      {
        type: 'function',
        name: 'allowance',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      },
    ] as const,
    functionName: 'allowance',
    args: userAddress ? [userAddress, CONTRACTS.GOALZ] : undefined,
    query: {
      enabled: !!(userAddress && requiredAllowance),
    },
  });

  return useMemo(() => {
    if (!allowance || !requiredAllowance) {
      return {
        hasEnoughAllowance: false,
        currentAllowance: BigInt(0),
        shortfall: requiredAllowance || BigInt(0),
      };
    }

    const hasEnoughAllowance = allowance >= requiredAllowance;
    const shortfall = hasEnoughAllowance ? BigInt(0) : requiredAllowance - allowance;

    return {
      hasEnoughAllowance,
      currentAllowance: allowance,
      shortfall,
    };
  }, [allowance, requiredAllowance]);
}

/**
 * Format frequency in seconds to human readable string
 */
export function formatFrequency(frequencyInSeconds: bigint): string {
  const seconds = Number(frequencyInSeconds);
  
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks`;
  
  return `${Math.floor(seconds / 2592000)} months`;
}

/**
 * Format next deposit time
 */
export function formatNextDeposit(nextDepositDate: Date): string {
  const now = new Date();
  const diffMs = nextDepositDate.getTime() - now.getTime();
  
  if (diffMs < 0) return 'Due now';
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  
  if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
}

