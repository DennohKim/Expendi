import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

export interface BucketListItem {
  name: string;
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
  spentPercentage: number;
  remainingBudget: string;
}

// Common bucket names that users might create
const COMMON_BUCKET_NAMES = [
  'Weekly Lab Contribution',
  'Monthly Rent', 
  'Food Expenses',
  'Transportation',
  'Entertainment',
  'Healthcare',
  'Utilities',
  'Shopping',
  'Education',
  'Emergency Fund'
];

export function useBucketsList() {
  const { eoa } = useSmartAccount();

  return useQuery({
    queryKey: ['buckets-list', eoa?.address],
    queryFn: async (): Promise<BucketListItem[]> => {
      if (!eoa) {
        throw new Error('EOA wallet not available');
      }

      const networkConfig = getNetworkConfig(CHAIN_IDS.BASE_SEPOLIA);
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      
      if (!bucketManagerAddress) {
        throw new Error('ExpendiBucketManager not available on this network');
      }

      // Create public client for reading contract data
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      const buckets: BucketListItem[] = [];

      // Check common bucket names and any custom ones the user might have
      for (const bucketName of COMMON_BUCKET_NAMES) {
        try {
          const result = await publicClient.readContract({
            address: bucketManagerAddress,
            abi: EXPENDI_BUCKET_MANAGER_ABI,
            functionName: 'getBucketInfo',
            args: [eoa.address, bucketName]
          });

          // Result is a tuple: [balance, monthlySpent, monthlyLimit, lastResetTimestamp, active, subscriptionCount]
          const [balance, monthlySpent, monthlyLimit, lastResetTimestamp, active, subscriptionCount] = result;

          // Only include buckets that have been created (active = true or have been used)
          if (active || balance > 0n || monthlySpent > 0n) {
            const balanceFormatted = (Number(balance) / 1e6).toFixed(2);
            const monthlySpentFormatted = (Number(monthlySpent) / 1e6).toFixed(2);
            const monthlyLimitFormatted = (Number(monthlyLimit) / 1e6).toFixed(2);
            
            const spentPercentage = Number(monthlyLimit) > 0 
              ? (Number(monthlySpent) / Number(monthlyLimit)) * 100 
              : 0;
            
            const remainingBudget = Number(monthlyLimit) > 0
              ? ((Number(monthlyLimit) - Number(monthlySpent)) / 1e6).toFixed(2)
              : '0.00';

            buckets.push({
              name: bucketName,
              balance: balanceFormatted,
              monthlySpent: monthlySpentFormatted,
              monthlyLimit: monthlyLimitFormatted,
              lastResetTimestamp: Number(lastResetTimestamp),
              active,
              subscriptionCount: Number(subscriptionCount),
              rawBalance: balance,
              rawMonthlySpent: monthlySpent,
              rawMonthlyLimit: monthlyLimit,
              spentPercentage,
              remainingBudget
            });
          }
        } catch (error) {
          // Bucket doesn't exist or error reading - skip it
          console.debug(`Bucket "${bucketName}" not found or error reading:`, error);
        }
      }

      // Sort buckets by balance (highest first), then by active status
      return buckets.sort((a, b) => {
        if (a.active !== b.active) {
          return a.active ? -1 : 1; // Active buckets first
        }
        return parseFloat(b.balance) - parseFloat(a.balance); // Higher balance first
      });
    },
    enabled: !!eoa,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });
}