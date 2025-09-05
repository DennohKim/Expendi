import { useState, useEffect, useCallback, useRef } from 'react';
import { checkUserHasWallet } from '@/lib/contracts/factory';
import { useWalletAddress } from './useWalletAddress';
import { useBudgetWalletStore } from '@/store/budgetWalletStore';
import { useUserBudgetWallet } from './subgraph-queries/useUserBudgetWallet';

export function useHasBudgetWallet() {
  const { walletAddress, isConnected, isReady } = useWalletAddress();
  const [hasBudgetWallet, setHasBudgetWallet] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { getWalletStatus, setWalletStatus, isStatusExpired } = useBudgetWalletStore();
  const { refetch: refetchSubgraph } = useUserBudgetWallet(walletAddress);

  // Stop polling function
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
      console.log('🛑 Stopped subgraph polling');
    }
  }, []);

  // Start polling function
  const startSubgraphPolling = useCallback(() => {
    if (pollingIntervalRef.current || !walletAddress) return;

    console.log('🔄 Starting subgraph polling for wallet creation');
    setIsPolling(true);

    const pollInterval = 3000; // Poll every 3 seconds
    const maxAttempts = 20; // Stop after 1 minute (20 * 3 seconds)
    let attempts = 0;

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      console.log(`🔍 Subgraph polling attempt ${attempts}/${maxAttempts}`);

      try {
        const result = await refetchSubgraph();
        
        if (result.data?.user?.walletsCreated?.length > 0) {
          console.log('✅ Budget wallet found in subgraph!');
          setHasBudgetWallet(true);
          setWalletStatus(walletAddress, true);
          stopPolling();
          return;
        }

        if (attempts >= maxAttempts) {
          console.log('⏱️ Subgraph polling timeout reached');
          stopPolling();
        }
      } catch (err) {
        console.error('Error during subgraph polling:', err);
        if (attempts >= maxAttempts) {
          stopPolling();
        }
      }
    }, pollInterval);
  }, [walletAddress, refetchSubgraph, setWalletStatus, stopPolling]);

  const checkWallet = useCallback(async (forceRefresh = false) => {
    if (!isConnected || !walletAddress) {
      setHasBudgetWallet(null);
      setIsLoading(false);
      stopPolling();
      return;
    }

    // Check cache first unless force refresh is requested
    if (!forceRefresh && !isStatusExpired(walletAddress)) {
      const cachedStatus = getWalletStatus(walletAddress);
      if (cachedStatus !== null) {
        console.log('📦 Using cached wallet status:', { walletAddress, cachedStatus });
        setHasBudgetWallet(cachedStatus);
        setIsLoading(false);
        
        // If cache shows false (no wallet), start polling for subgraph updates
        if (!cachedStatus) {
          startSubgraphPolling();
        }
        
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

      // If no wallet found, start polling the subgraph
      if (!hasWallet) {
        startSubgraphPolling();
      }
    } catch (err) {
      console.error('Error checking budget wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to check wallet');
      setHasBudgetWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, walletAddress, getWalletStatus, setWalletStatus, isStatusExpired, stopPolling, startSubgraphPolling]);

  // Manual refresh function (forces a fresh check)
  const refreshWalletCheck = useCallback(async () => {
    stopPolling(); // Stop any existing polling before refresh
    await checkWallet(true);
  }, [checkWallet, stopPolling]);

  // Initial cache check when wallet address is available
  useEffect(() => {
    if (isConnected && walletAddress && isReady) {
      // Try to get from cache first
      const cachedStatus = getWalletStatus(walletAddress);
      if (cachedStatus !== null && !isStatusExpired(walletAddress)) {
        console.log('📦 Initial cached wallet status:', { walletAddress, cachedStatus });
        setHasBudgetWallet(cachedStatus);
        
        // If cache shows false (no wallet), start polling for subgraph updates
        if (!cachedStatus) {
          startSubgraphPolling();
        }
      } else {
        // If no cache or expired, check wallet
        checkWallet();
      }
    }
  }, [isConnected, walletAddress, isReady, getWalletStatus, isStatusExpired, checkWallet, startSubgraphPolling]);

  // Cleanup polling on unmount or wallet address change
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [walletAddress, stopPolling]);

  return {
    hasBudgetWallet,
    isLoading,
    isPolling,
    error,
    queryAddress: walletAddress,
    refreshWalletCheck,
    stopPolling
  };
}