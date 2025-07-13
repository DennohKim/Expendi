import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useUserBudgetWallet } from './getUserBudgetWallet';
import { createBudgetWalletUtils, ETH_ADDRESS, MOCK_USDC_ADDRESS } from '@/lib/contracts/budget-wallet';
import { useSmartAccount } from '@/context/SmartAccountContext';
// import { useSessionKeys } from '@/hooks/useSessionKeys';

interface BucketData {
  name: string;
  monthlyLimit: bigint;
  currentSpent: bigint;
  isActive: boolean;
  ethBalance: bigint;
  usdcBalance: bigint;
}

interface UseUserBucketsReturn {
  buckets: BucketData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserBuckets(): UseUserBucketsReturn {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  // const { sessionKey, loadSessionKey } = useSessionKeys();
  const { data: walletData } = useUserBudgetWallet();
  const [buckets, setBuckets] = useState<BucketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // // Load session key on mount
  // useEffect(() => {
  //   loadSessionKey();
  // }, [loadSessionKey]);

  // console.log("sessionKey", sessionKey);

  // Determine which address to use: smart account > EOA
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress;

  const fetchBuckets = async () => {
    if (!walletData?.address || !queryAddress) {
      console.log("Missing data:", { walletAddress: walletData?.address, queryAddress });
      setBuckets([]);
      return;
    }

    console.log("🔍 Fetching buckets with:", {
      walletContractAddress: walletData.address,
      queryUserAddress: queryAddress,
      eoaAddress,
      smartAccountAddress,
      smartAccountReady
    });

    setLoading(true);
    setError(null);

    try {
      const walletUtils = createBudgetWalletUtils(walletData.address as `0x${string}`);
      
      // Get bucket names using the actual user address (EOA or smart account)
      console.log("📞 Calling getUserBuckets with user address:", queryAddress);
      const bucketNames = await walletUtils.getUserBuckets(queryAddress as `0x${string}`);
      console.log("📦 Raw bucket names from contract:", bucketNames);
      
      // Fetch details for each bucket
      const bucketPromises = bucketNames.map(async (bucketName, index) => {
        try {
          console.log(`🔄 Processing bucket ${index + 1}/${bucketNames.length}: "${bucketName}"`);
          
          // Get bucket details using the actual user address
          const bucketDetails = await walletUtils.getBucket(queryAddress as `0x${string}`, bucketName);
          console.log(`📋 Bucket "${bucketName}" details:`, bucketDetails);
          
          // Get balances for ETH and USDC using the actual user address
          const [ethBalance, usdcBalance] = await Promise.all([
            walletUtils.getBucketBalance(queryAddress as `0x${string}`, ETH_ADDRESS, bucketName),
            walletUtils.getBucketBalance(queryAddress as `0x${string}`, MOCK_USDC_ADDRESS, bucketName)
          ]);
          
          console.log(`💰 Bucket "${bucketName}" balances:`, { ethBalance, usdcBalance });

          // Parse bucket details - contract returns [ethBalance, monthlySpent, monthlyLimit, timeUntilReset, active]
          const [contractEthBalance, currentSpent, monthlyLimit, timeUntilReset, isActive] = bucketDetails as [bigint, bigint, bigint, bigint, boolean];

          const bucketData = {
            name: bucketName,
            monthlyLimit,
            currentSpent,
            isActive,
            ethBalance: ethBalance, // Use balance from getBucketBalance call
            usdcBalance
          };
          
          console.log(`✅ Successfully processed bucket "${bucketName}":`, bucketData);
          return bucketData;
        } catch (bucketError) {
          console.error(`❌ Error fetching bucket ${bucketName}:`, bucketError);
          return null;
        }
      });

      const bucketResults = await Promise.all(bucketPromises);
      const validBuckets = bucketResults.filter((bucket): bucket is BucketData => bucket !== null);
      
      console.log("🏁 Final processed buckets:", validBuckets);
      setBuckets(validBuckets);
    } catch (err) {
      console.error('Error fetching buckets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch buckets');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (walletData?.hasWallet && queryAddress) {
      fetchBuckets();
    } else {
      setBuckets([]);
    }
  }, [walletData?.address, walletData?.hasWallet, queryAddress]);

  return {
    buckets,
    loading,
    error,
    refetch: fetchBuckets
  };
}