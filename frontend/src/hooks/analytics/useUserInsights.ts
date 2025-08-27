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

const fetchUserInsights = async (userAddress: string): Promise<UserInsights> => {
  const baseUrl = "https://expendi-kn6h.onrender.com";
  // const baseUrl = "http://localhost:3001";
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