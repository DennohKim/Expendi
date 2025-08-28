import { useState, useEffect, useCallback } from 'react';
import { checkUserHasWallet } from '@/lib/contracts/factory';
import { useWalletAddress } from './useWalletAddress';
import { useBudgetWalletStore } from '@/store/budgetWalletStore';

export function useHasBudgetWallet() {
  const { walletAddress, isConnected, isReady } = useWalletAddress();
  const [hasBudgetWallet, setHasBudgetWallet] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { getWalletStatus, setWalletStatus, isStatusExpired } = useBudgetWalletStore();

  const checkWallet = useCallback(async (forceRefresh = false) => {
    if (!isConnected || !walletAddress) {
      setHasBudgetWallet(null);
      setIsLoading(false);
      return;
    }

    // Check cache first unless force refresh is requested
    if (!forceRefresh && !isStatusExpired(walletAddress)) {
      const cachedStatus = getWalletStatus(walletAddress);
      if (cachedStatus !== null) {
        console.log('📦 Using cached wallet status:', { walletAddress, cachedStatus });
        setHasBudgetWallet(cachedStatus);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Always check on Base mainnet
      console.log('🔍 Checking wallet for address:', walletAddress);
      const hasWallet = await checkUserHasWallet(walletAddress);
      
      // Update both local state and cache
      setHasBudgetWallet(hasWallet);
      setWalletStatus(walletAddress, hasWallet);
      
      console.log('✅ Wallet check result (cached):', { 
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
  }, [isConnected, walletAddress, getWalletStatus, setWalletStatus, isStatusExpired]);

  // Manual refresh function (forces a fresh check)
  const refreshWalletCheck = useCallback(async () => {
    await checkWallet(true);
  }, [checkWallet]);

  // Initial cache check when wallet address is available
  useEffect(() => {
    if (isConnected && walletAddress && isReady) {
      // Try to get from cache first
      const cachedStatus = getWalletStatus(walletAddress);
      if (cachedStatus !== null && !isStatusExpired(walletAddress)) {
        console.log('📦 Initial cached wallet status:', { walletAddress, cachedStatus });
        setHasBudgetWallet(cachedStatus);
      } else {
        // If no cache or expired, check wallet
        checkWallet();
      }
    }
  }, [isConnected, walletAddress, isReady, getWalletStatus, isStatusExpired, checkWallet]);

  return {
    hasBudgetWallet,
    isLoading,
    error,
    queryAddress: walletAddress,
    refreshWalletCheck
  };
}