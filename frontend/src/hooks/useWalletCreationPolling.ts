import { useState, useCallback } from 'react';
import { useUserBudgetWallet } from './subgraph-queries/useUserBudgetWallet';

interface WalletCreated {
  id: string;
  wallet: string;
  salt: string;
  timestamp: string;
  blockNumber: string;
  transactionHash?: string;
}

interface WalletCreationPollingResult {
  pollForWallet: (txHash: string) => Promise<string | null>;
  isPolling: boolean;
  error: string | null;
  currentAttempt: number;
  maxAttempts: number;
  currentTxHash: string | null;
}

export function useWalletCreationPolling(userAddress: string | undefined): WalletCreationPollingResult {
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);
  const { refetch } = useUserBudgetWallet(userAddress);
  
  const maxAttempts = 10;

  const pollForWallet = useCallback(async (txHash: string): Promise<string | null> => {
    if (!userAddress) {
      setError('No user address provided');
      return null;
    }

    setIsPolling(true);
    setError(null);
    setCurrentTxHash(txHash);
    setCurrentAttempt(0);

    const interval = 3000; // 3 seconds

    console.log(`Starting wallet polling for tx: ${txHash}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setCurrentAttempt(attempt);
      try {
        console.log(`Polling attempt ${attempt}/${maxAttempts}`);
        
        const result = await refetch();
        
        if (result.data?.user?.walletsCreated?.length > 0) {
          // Find the wallet created by this transaction or get the most recent
          const wallets = result.data.user.walletsCreated;
          
          // Try to find wallet with matching transaction hash
          let targetWallet = wallets.find((wallet: WalletCreated) => 
            wallet.transactionHash?.toLowerCase() === txHash.toLowerCase()
          );
          
          // Fallback to most recent wallet if tx hash doesn't match
          if (!targetWallet) {
            targetWallet = wallets.sort((a: WalletCreated, b: WalletCreated) => 
              parseInt(b.timestamp) - parseInt(a.timestamp)
            )[0];
          }
          
          if (targetWallet) {
            console.log(`Wallet found after ${attempt} attempts:`, targetWallet.wallet);
            setIsPolling(false);
            setCurrentAttempt(0);
            setCurrentTxHash(null);
            return targetWallet.wallet;
          }
        }
        
        if (attempt < maxAttempts) {
          console.log(`Wallet not found, waiting ${interval/1000}s before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (err) {
        console.error(`Error during polling attempt ${attempt}:`, err);
        if (attempt === maxAttempts) {
          setError(err instanceof Error ? err.message : 'Failed to poll for wallet');
        }
      }
    }

    console.log(`Polling completed after ${maxAttempts} attempts. Wallet not found in subgraph.`);
    setIsPolling(false);
    setCurrentAttempt(0);
    setCurrentTxHash(null);
    setError('Wallet creation successful but not yet indexed. Please refresh the page in a few moments.');
    
    return null;
  }, [userAddress, refetch, maxAttempts]);

  return {
    pollForWallet,
    isPolling,
    error,
    currentAttempt,
    maxAttempts,
    currentTxHash
  };
}