import { useSmartAccount } from '@/context/SmartAccountContext';
import { useWalletAddress } from '@/hooks/useWalletAddress';
import { useMobileTransactions, UseMobileTransactionsParams } from './useMobileTransactions';

interface UseUserMobileTransactionsParams extends Omit<UseMobileTransactionsParams, 'userAddress'> {
  // All other params except userAddress which we'll provide automatically
}

/**
 * Hook that automatically filters mobile transactions by the current user's smart account address
 */
export function useUserMobileTransactions(params: UseUserMobileTransactionsParams = {}) {
  const { smartAccountAddress } = useSmartAccount();
  const { walletAddress } = useWalletAddress();
  
  // Use smart account address if available, otherwise fall back to wallet address
  const userAddress = smartAccountAddress || walletAddress;
  
  return useMobileTransactions({
    ...params,
    userAddress: userAddress?.toLowerCase(), // Ensure consistent lowercase format
  });
}

export type { UseUserMobileTransactionsParams };