import { useWriteContract, useWaitForTransactionReceipt, useBalance, useReadContract } from 'wagmi';
import { Address } from 'viem';
import { GoalzABI, IERC20ABI } from '../abis';
import { CONTRACTS } from '../config';
import {
  CreateGoalParams,
  DepositParams,
  WithdrawParams,
  AutomationParams,
} from '../types';


// Hook for creating goals
export function useCreateGoal() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const createGoal = (params: CreateGoalParams) => {
    writeContract({
      address: CONTRACTS.GOALZ,
      abi: GoalzABI,
      functionName: 'setGoal',
      args: [
        params.name, // what
        params.description || '', // why  
        params.targetAmount,
        params.deadline, // targetDate
        params.token, // depositToken
      ],
    });
  };

  return {
    createGoal,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  };
}

// Hook for depositing to goals
export function useDepositToGoal() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const depositToGoal = (params: DepositParams) => {
    writeContract({
      address: CONTRACTS.GOALZ,
      abi: GoalzABI,
      functionName: 'deposit',
      args: [params.goalId, params.amount],
    });
  };

  return {
    depositToGoal,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  };
}

// Hook for withdrawing from goals
export function useWithdrawFromGoal() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const withdrawFromGoal = (params: WithdrawParams) => {
    writeContract({
      address: CONTRACTS.GOALZ,
      abi: GoalzABI,
      functionName: 'withdraw',
      args: [params.goalId],
    });
  };

  return {
    withdrawFromGoal,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  };
}

// Hook for deleting goals
export function useDeleteGoal() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const deleteGoal = (goalId: bigint) => {
    writeContract({
      address: CONTRACTS.GOALZ,
      abi: GoalzABI,
      functionName: 'deleteGoal',
      args: [goalId],
    });
  };

  return {
    deleteGoal,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  };
}

// Hook for token approval
export function useTokenApproval() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const approveToken = (tokenAddress: Address, amount: bigint) => {
    writeContract({
      address: tokenAddress,
      abi: IERC20ABI,
      functionName: 'approve',
      args: [CONTRACTS.GOALZ, amount],
    });
  };

  return {
    approveToken,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  };
}

// Hook for creating automation tasks
export function useCreateAutomation() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const createAutomation = (params: AutomationParams) => {
    writeContract({
      address: CONTRACTS.GOALZ,
      abi: GoalzABI,
      functionName: 'automateDeposit',
      args: [params.goalId, params.amount, params.interval],
    });
  };

  return {
    createAutomation,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  };
}

// Hook for canceling automated deposits
export function useCancelAutomation() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const cancelAutomation = (goalId: bigint) => {
    writeContract({
      address: CONTRACTS.GOALZ,
      abi: GoalzABI,
      functionName: 'cancelAutomatedDeposit',
      args: [goalId],
    });
  };

  return {
    cancelAutomation,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  };
}

// Hook for getting token balance
export function useTokenBalance(tokenAddress: Address, userAddress?: Address) {
  return useBalance({
    address: userAddress,
    token: tokenAddress,
  });
}

// Hook for getting token allowance
export function useTokenAllowance(tokenAddress: Address, owner?: Address, spender?: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: IERC20ABI,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!(owner && spender),
    },
  });
}

