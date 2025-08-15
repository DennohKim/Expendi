import { useQuery } from '@tanstack/react-query';

interface AbandonedBucket {
  bucketId: string;
  bucketName: string;
  daysSinceLastActivity: number;
}

interface AbandonedBucketsResponse {
  abandonedBuckets: AbandonedBucket[];
  count: number;
  potentialSavings: string; // USDC amount with 6 decimal places
}

const fetchAbandonedBuckets = async (userAddress: string): Promise<AbandonedBucketsResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:3001';
  const response = await fetch(`${baseUrl}/api/analytics/users/${userAddress}/abandoned-buckets`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch abandoned buckets: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch abandoned buckets');
  }
  
  return data.data;
};

export function useAbandonedBuckets(userAddress: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'abandoned-buckets', userAddress],
    queryFn: () => fetchAbandonedBuckets(userAddress!),
    enabled: !!userAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}