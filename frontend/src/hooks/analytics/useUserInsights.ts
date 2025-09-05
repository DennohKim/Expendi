import { useQuery } from '@tanstack/react-query';

interface UserInsights {
  userId: string;
  totalSpent: string; // USDC amount with 6 decimal places
  activeBuckets: number;
  mostUsedBucket: {
    bucketId: string;
    bucketName: string;
    transactionCount: number;
  } | null;
  highestSpendingBucket: {
    bucketId: string;
    bucketName: string;
    totalSpent: string; // USDC amount with 6 decimal places
  } | null;
  mostFundedBucket: {
    bucketId: string;
    bucketName: string;
    totalDeposited: string; // USDC amount with 6 decimal places
  } | null;
  budgetAdherenceRate: number;
  abandonedBuckets: Array<{
    bucketId: string;
    bucketName: string;
    transactionCount: number;
    totalSpent: string;
    totalDeposited: string;
    lastActivity: string | null;
    budgetUtilization: number;
    isOverBudget: boolean;
  }>;
  chainName: string;
  walletAddress: string;
}

const fetchUserInsights = async (userAddress: string): Promise<UserInsights | null> => {
  const baseUrl = "https://expendi-production-ab42.up.railway.app";
  // const baseUrl = "http://localhost:3001";
  const response = await fetch(`${baseUrl}/api/V2/analytics/chains/base/users/${userAddress}/insights`);
  
  const data = await response.json();
  
  if (!response.ok) {
    // Check if this is a "User not found" error for new users
    if (data.error && data.error.includes('not found')) {
      return null; // Return null for new users instead of throwing an error
    }
    throw new Error(`Failed to fetch user insights: ${response.statusText}`);
  }
  
  if (!data.success) {
    // Check if this is a "User not found" error for new users
    if (data.error && data.error.includes('not found')) {
      return null; // Return null for new users instead of throwing an error
    }
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