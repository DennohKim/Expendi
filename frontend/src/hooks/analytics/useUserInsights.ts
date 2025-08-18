import { useQuery } from '@tanstack/react-query';

interface UserInsights {
  totalSpending: string; // USDC amount with 6 decimal places
  averageTransactionAmount: string; // USDC amount with 6 decimal places
  mostUsedBucket: {
    bucketId: string;
    bucketName: string;
    transactionCount: number;
  };
  highestSpendingBucket: {
    bucketId: string;
    bucketName: string;
    totalSpent: string; // USDC amount with 6 decimal places
  };
  mostFundedBucket: {
    bucketId: string;
    bucketName: string;
    totalFunded: string; // USDC amount with 6 decimal places
  };
  abandonedBuckets: Array<{
    bucketId: string;
    bucketName: string;
    daysSinceLastActivity: number;
  }>;
}

const fetchUserInsights = async (userAddress: string): Promise<UserInsights> => {
  const baseUrl = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:3001';
  const response = await fetch(`${baseUrl}/api/V2/analytics/chains/base/users/${userAddress}/insights`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user insights: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch user insights');
  }
  
  return data.data;
};

export function useUserInsights(userAddress: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'user-insights', userAddress],
    queryFn: () => fetchUserInsights(userAddress!),
    enabled: !!userAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}