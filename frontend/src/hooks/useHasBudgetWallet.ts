import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { checkUserHasWallet } from '@/lib/contracts/factory';
import { useSmartAccount } from '@/context/SmartAccountContext';

export function useHasBudgetWallet() {
  const { address: eoaAddress, isConnected } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  const [hasBudgetWallet, setHasBudgetWallet] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use smart account address if available, fallback to EOA address
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress;

  useEffect(() => {
    const checkWallet = async () => {
      if (!isConnected || !queryAddress) {
        setHasBudgetWallet(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Always check on Base mainnet
        const hasWallet = await checkUserHasWallet(queryAddress);
        setHasBudgetWallet(hasWallet);
      } catch (err) {
        console.error('Error checking budget wallet:', err);
        setError(err instanceof Error ? err.message : 'Failed to check wallet');
        setHasBudgetWallet(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkWallet();
  }, [isConnected, queryAddress, smartAccountReady]);

  return {
    hasBudgetWallet,
    isLoading,
    error,
    queryAddress
  };
}