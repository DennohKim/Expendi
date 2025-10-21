import { useAccount } from 'wagmi';
import { useSmartAccount } from '@/context/SmartAccountContext';

// Simplified hook that returns the smart account address directly
// since we no longer need budget wallet logic
export function useUserBudgetWallet(address?: string | null) {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  
  // Use smart account address if available, otherwise use EOA address
  const userAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : (address || eoaAddress);
  
  return {
    data: userAddress ? { user: { walletsCreated: [{ budgetWallet: { address: userAddress } }] } } : null,
    loading: false,
    error: null,
    refetch: async () => ({ 
      data: userAddress ? { user: { walletsCreated: [{ budgetWallet: { address: userAddress } }] } } : null 
    })
  };
}