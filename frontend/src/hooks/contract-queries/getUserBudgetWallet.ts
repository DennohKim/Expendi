import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { FACTORY_CONTRACT_ADDRESS, FACTORY_ABI } from '@/lib/contracts/factory';
import { ETH_ADDRESS } from '@/lib/contracts/budget-wallet';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { formatEther } from 'viem';

interface BudgetWalletData {
  address: string | null;
  balance: string;
  hasWallet: boolean;
  totalBalance: bigint;
  unallocatedBalance: bigint;
  createdAt?: number;
  queryAddress?: string; // Add this for debugging
}

interface UseUserBudgetWalletReturn {
  data: BudgetWalletData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserBudgetWallet(): UseUserBudgetWalletReturn {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  const [data, setData] = useState<BudgetWalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which address to use: prefer smart account, fallback to EOA
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress;
  
  console.log('Query address selection:', {
    eoaAddress,
    smartAccountAddress,
    smartAccountReady,
    selectedAddress: queryAddress
  });

  console.log("queryAddress", queryAddress);

  // Check if user has a wallet using wagmi
  const { 
    data: hasWallet, 
    isLoading: hasWalletLoading,
    error: hasWalletError,
    refetch: refetchHasWallet
  } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'hasWallet',
    args: queryAddress ? [queryAddress] : undefined,
    query: {
      enabled: !!queryAddress,
    }
  });

  // Get wallet address using wagmi
  const { 
    data: walletAddress,
    isLoading: walletAddressLoading,
    error: walletAddressError,
    refetch: refetchWalletAddress
  } = useReadContract({
    address: FACTORY_CONTRACT_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'getUserWallet',
    args: queryAddress ? [queryAddress] : undefined,
    query: {
      enabled: !!queryAddress && !!hasWallet,
    }
  });

  // Get total balance using budget wallet contract
  const { 
    data: totalBalance,
    isLoading: totalBalanceLoading,
    error: totalBalanceError,
    refetch: refetchTotalBalance
  } = useReadContract({
    address: walletAddress as `0x${string}`,
    abi: [
      {
        inputs: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'address', name: 'token', type: 'address' }
        ],
        name: 'getTotalBalance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'getTotalBalance',
    args: queryAddress && walletAddress ? [queryAddress, ETH_ADDRESS] : undefined,
    query: {
      enabled: !!walletAddress && !!queryAddress,
    }
  });

  // Get unallocated balance using budget wallet contract
  const { 
    data: unallocatedBalance,
    isLoading: unallocatedBalanceLoading,
    error: unallocatedBalanceError,
    refetch: refetchUnallocatedBalance
  } = useReadContract({
    address: walletAddress as `0x${string}`,
    abi: [
      {
        inputs: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'address', name: 'token', type: 'address' }
        ],
        name: 'getUnallocatedBalance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'getUnallocatedBalance',
    args: queryAddress && walletAddress ? [queryAddress, ETH_ADDRESS] : undefined,
    query: {
      enabled: !!walletAddress && !!queryAddress,
    }
  });

  // Process wagmi data into our data structure
  useEffect(() => {
    if (!queryAddress) {
      setData(null);
      setError(null);
      return;
    }

    // If we have all the data, construct the result
    if (hasWallet !== undefined && walletAddress && totalBalance !== undefined && unallocatedBalance !== undefined) {
      const balanceInEth = formatEther(totalBalance as bigint);
      
      setData({
        address: walletAddress as string,
        balance: balanceInEth,
        hasWallet: Boolean(hasWallet),
        totalBalance: totalBalance as bigint,
        unallocatedBalance: unallocatedBalance as bigint,
        queryAddress,
      });
      setError(null);
    } else if (hasWallet === false) {
      // User doesn't have a wallet
      setData({
        address: null,
        balance: '0',
        hasWallet: false,
        totalBalance: BigInt(0),
        unallocatedBalance: BigInt(0),
        queryAddress,
      });
      setError(null);
    }
  }, [queryAddress, hasWallet, walletAddress, totalBalance, unallocatedBalance]);

  // Refetch function that updates all wagmi data
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchHasWallet(),
      refetchWalletAddress(), 
      refetchTotalBalance(),
      refetchUnallocatedBalance()
    ]);
  }, [refetchHasWallet, refetchWalletAddress, refetchTotalBalance, refetchUnallocatedBalance]);

  // Debug errors
  useEffect(() => {
    if (hasWalletError) console.log('hasWalletError:', hasWalletError);
    if (walletAddressError) console.log('walletAddressError:', walletAddressError);
    if (totalBalanceError) console.log('totalBalanceError:', totalBalanceError);
    if (unallocatedBalanceError) console.log('unallocatedBalanceError:', unallocatedBalanceError);
  }, [hasWalletError, walletAddressError, totalBalanceError, unallocatedBalanceError]);

  // Combine loading states
  const isLoading = hasWalletLoading || walletAddressLoading || totalBalanceLoading || unallocatedBalanceLoading;

  // Helper function to safely extract error message
  const getErrorMessage = (err: any, prefix: string) => {
    if (!err) return null;
    if (typeof err === 'string') return `${prefix}: ${err}`;
    if (err.message) return `${prefix}: ${err.message}`;
    if (err.shortMessage) return `${prefix}: ${err.shortMessage}`;
    if (err.details) return `${prefix}: ${err.details}`;
    return `${prefix}: Unknown error`;
  };

  // Only show errors if we don't have successful data
  const shouldShowError = !data || !data.hasWallet;
  
  // Combine errors with better handling
  const combinedError = shouldShowError ? (
    error || 
    getErrorMessage(hasWalletError, 'Wallet check error') ||
    getErrorMessage(walletAddressError, 'Wallet address error') ||
    getErrorMessage(totalBalanceError, 'Total balance error') ||
    getErrorMessage(unallocatedBalanceError, 'Unallocated balance error')
  ) : null;

  return {
    data,
    loading: isLoading,
    error: combinedError,
    refetch
  };
}