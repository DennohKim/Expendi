import { useQuery } from '@tanstack/react-query';

interface BucketUsageStats {
  bucketId: string;
  bucketName: string;
  transactionCount: number;
  totalSpent: string; // USDC amount with 6 decimal places
  monthlyLimit: string; // USDC amount with 6 decimal places
  monthlySpent: string; // USDC amount with 6 decimal places
  balance: string; // USDC amount with 6 decimal places
  lastActivity: string;
  isOverBudget: boolean;
  utilizationRate: number;
}

interface BucketUsageResponse {
  buckets: BucketUsageStats[];
  summary: {
    totalBuckets: number;
    activeBuckets: number;
    overBudgetBuckets: number;
    totalTransactions: number;
  };
}

const fetchBucketUsage = async (userAddress: string): Promise<BucketUsageResponse | null> => {
  const baseUrl = "https://expendi-production-ab42.up.railway.app";
  // const baseUrl = "http://localhost:3001";
  const response = await fetch(`${baseUrl}/api/V2/analytics/chains/base/users/${userAddress}/bucket-usage`);
  
  const data = await response.json();
  
  if (!response.ok) {
    // Check if this is a "User not found" error for new users
    if (data.error && data.error.includes('not found')) {
      return null; // Return null for new users instead of throwing an error
    }
    throw new Error(`Failed to fetch bucket usage: ${response.statusText}`);
  }
  
  if (!data.success) {
    // Check if this is a "User not found" error for new users
    if (data.error && data.error.includes('not found')) {
      return null; // Return null for new users instead of throwing an error
    }
    throw new Error(data.error || 'Failed to fetch bucket usage');
  }
  
  return data.data;
};

export function useBucketUsage(userAddress: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'bucket-usage', userAddress],
    queryFn: () => fetchBucketUsage(userAddress!),
    enabled: !!userAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry for "User not found" errors (new users)
      if (error.message && error.message.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}