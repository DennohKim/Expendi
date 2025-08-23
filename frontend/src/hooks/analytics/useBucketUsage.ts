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

const fetchBucketUsage = async (userAddress: string): Promise<BucketUsageResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:3001';
  const response = await fetch(`${baseUrl}/api/V2/analytics/chains/base/users/${userAddress}/bucket-usage`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch bucket usage: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
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
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}