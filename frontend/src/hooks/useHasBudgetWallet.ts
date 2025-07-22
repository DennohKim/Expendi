import { useState, useEffect, useCallback } from 'react';
import { checkUserHasWallet } from '@/lib/contracts/factory';
import { useWalletAddress } from './useWalletAddress';

export function useHasBudgetWallet() {
  const { walletAddress, isConnected, isReady } = useWalletAddress();
  const [hasBudgetWallet, setHasBudgetWallet] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkWallet = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      setHasBudgetWallet(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Always check on Base mainnet
      console.log('🔍 Checking wallet for address:', walletAddress);
      const hasWallet = await checkUserHasWallet(walletAddress);
      setHasBudgetWallet(hasWallet);
      console.log('✅ Wallet check result:', { 
        walletAddress, 
        hasWallet
      });
    } catch (err) {
      console.error('Error checking budget wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to check wallet');
      setHasBudgetWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, walletAddress]);

  // Manual refresh function
  const refreshWalletCheck = useCallback(async () => {
    await checkWallet();
  }, [checkWallet]);

  useEffect(() => {
    checkWallet();
  }, [checkWallet, isReady]);

  return {
    hasBudgetWallet,
    isLoading,
    error,
    queryAddress: walletAddress,
    refreshWalletCheck
  };
}