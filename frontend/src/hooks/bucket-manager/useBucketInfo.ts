import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface BucketInfo {
  balance: string; // formatted USDC amount
  monthlySpent: string; // formatted USDC amount
  monthlyLimit: string; // formatted USDC amount
  lastResetTimestamp: number;
  active: boolean;
  subscriptionCount: number;
  // Raw values for calculations
  rawBalance: bigint;
  rawMonthlySpent: bigint;
  rawMonthlyLimit: bigint;
}

export function useBucketInfo(bucketName: string) {
  const { smartAccountClient } = useSmartAccount();

  return useQuery({
    queryKey: ['bucket-info', bucketName, smartAccountClient?.account?.address],
    queryFn: async (): Promise<BucketInfo> => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig(CHAIN_IDS.BASE_SEPOLIA);
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      
      if (!bucketManagerAddress) {
        throw new Error('ExpendiBucketManager not available on this network');
      }

      const result = await smartAccountClient.readContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'getBucketInfo',
        args: [smartAccountClient.account.address, bucketName]
      });

      // Result is a tuple: [balance, monthlySpent, monthlyLimit, lastResetTimestamp, active, subscriptionCount]
      const [balance, monthlySpent, monthlyLimit, lastResetTimestamp, active, subscriptionCount] = result;

      return {
        balance: formatUnits(balance, 6),
        monthlySpent: formatUnits(monthlySpent, 6),
        monthlyLimit: formatUnits(monthlyLimit, 6),
        lastResetTimestamp: Number(lastResetTimestamp),
        active,
        subscriptionCount: Number(subscriptionCount),
        rawBalance: balance,
        rawMonthlySpent: monthlySpent,
        rawMonthlyLimit: monthlyLimit
      };
    },
    enabled: !!smartAccountClient?.account && !!bucketName,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });
}