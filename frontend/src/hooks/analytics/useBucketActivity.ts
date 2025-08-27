import { useQuery } from '@tanstack/react-query';

interface BucketActivity {
  bucketId: string;
  bucketName: string;
  transactionCount: number;
  lastActivity: string;
  firstActivity: string;
}

interface BucketActivityResponse {
  bucketActivity: BucketActivity[];
  period: string;
  summary: {
    totalTransactions: number;
    activeBuckets: number;
    mostActiveCount: number;
  };
}

const fetchBucketActivity = async (userAddress: string, month?: string): Promise<BucketActivityResponse> => {
  const baseUrl = "https://expendi-production-ab42.up.railway.app";
  // const baseUrl = "http://localhost:3001";
  const url = new URL(`${baseUrl}/api/V2/analytics/chains/base/users/${userAddress}/bucket-activity`);
  
  if (month) {
    url.searchParams.append('month', month);
  }
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`Failed to fetch bucket activity: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch bucket activity');
  }
  
  return data.data;
};

export function useBucketActivity(userAddress: string | undefined, month?: string) {
  return useQuery({
    queryKey: ['analytics', 'bucket-activity', userAddress, month],
    queryFn: () => fetchBucketActivity(userAddress!, month),
    enabled: !!userAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}