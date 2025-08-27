import { useQuery } from '@tanstack/react-query';

export interface BucketTimeSeriesDataPoint {
  period: string;
  totalSpent: number;
  timestamp: Date;
}

export interface BucketTimeSeriesData {
  bucketId: string;
  bucketName: string;
  data: BucketTimeSeriesDataPoint[];
}

export interface BucketTimeSeriesResponse {
  period: 'daily' | 'monthly' | 'yearly';
  buckets: BucketTimeSeriesData[];
  totalPeriods: number;
  dateRange: {
    from: Date;
    to: Date;
  };
  summary: {
    totalSpentAcrossAllBuckets: number;
    averageSpentPerPeriod: number;
    activeBuckets: number;
    periodRange: string;
  };
}

// API response interfaces to match the actual response structure
interface ApiBucketTimeSeriesDataPoint {
  period: string;
  totalSpent: number;
  timestamp: string; // API returns ISO string
}

interface ApiBucketTimeSeriesData {
  bucketId: string;
  bucketName: string;
  data: ApiBucketTimeSeriesDataPoint[];
}

interface BucketTimeSeriesParams {
  period?: 'daily' | 'monthly' | 'yearly';
  from?: Date;
  to?: Date;
  bucketId?: string;
}

const fetchBucketTimeSeries = async (
  userAddress: string,
  params: BucketTimeSeriesParams = {}
): Promise<BucketTimeSeriesResponse> => {
  const baseUrl = "https://expendi-kn6h.onrender.com";
  // const baseUrl = "http://localhost:3001";
  
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.append('period', params.period);
  if (params.from) searchParams.append('from', params.from.toISOString());
  if (params.to) searchParams.append('to', params.to.toISOString());
  if (params.bucketId) searchParams.append('bucketId', params.bucketId);
  
  // Use the multi-chain API endpoint pattern
  const url = `${baseUrl}/api/v2/analytics/chains/base/users/${userAddress}/bucket-time-series${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch bucket time series: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch bucket time series');
  }
  
  // Transform the data to ensure dates are properly parsed
  const transformedData: BucketTimeSeriesResponse = {
    ...data.data,
    dateRange: {
      from: new Date(data.data.dateRange.from),
      to: new Date(data.data.dateRange.to)
    },
    buckets: data.data.buckets.map((bucket: ApiBucketTimeSeriesData) => ({
      ...bucket,
      data: bucket.data.map((dataPoint: ApiBucketTimeSeriesDataPoint) => ({
        ...dataPoint,
        timestamp: new Date(dataPoint.timestamp)
      }))
    }))
  };
  
  return transformedData;
};

export function useBucketTimeSeries(
  userAddress: string | undefined,
  params: BucketTimeSeriesParams = {}
) {
  return useQuery({
    queryKey: ['analytics', 'bucket-time-series', userAddress, params],
    queryFn: () => fetchBucketTimeSeries(userAddress!, params),
    enabled: !!userAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}