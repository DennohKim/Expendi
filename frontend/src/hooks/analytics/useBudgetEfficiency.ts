import { useQuery } from '@tanstack/react-query';

interface BucketEfficiency {
  bucketId: string;
  bucketName: string;
  monthlyLimit: string; // USDC amount with 6 decimal places
  monthlySpent: string; // USDC amount with 6 decimal places
  currentBalance: string; // USDC amount with 6 decimal places
  utilizationRate: number;
  efficiency: number;
  isOverBudget: boolean;
  remainingBudget: string; // USDC amount with 6 decimal places
  status: 'healthy' | 'warning' | 'over_budget';
}

interface BudgetEfficiencyResponse {
  bucketEfficiency: BucketEfficiency[];
  overallEfficiency: number;
  summary: {
    totalBuckets: number;
    healthyBuckets: number;
    warningBuckets: number;
    overBudgetBuckets: number;
  };
}

const fetchBudgetEfficiency = async (userAddress: string): Promise<BudgetEfficiencyResponse> => {
  const baseUrl = "https://expendi-production-ab42.up.railway.app";
  // const baseUrl = "http://localhost:3001";
  const response = await fetch(`${baseUrl}/api/analytics/users/${userAddress}/budget-efficiency`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch budget efficiency: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch budget efficiency');
  }
  
  return data.data;
};

export function useBudgetEfficiency(userAddress: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'budget-efficiency', userAddress],
    queryFn: () => fetchBudgetEfficiency(userAddress!),
    enabled: !!userAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}