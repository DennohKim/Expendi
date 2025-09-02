import { useQuery } from '@tanstack/react-query';

interface PretiumTransaction {
  id: string;
  pretiumId: number;
  transactionCode: string;
  userAddress: string;
  status: 'COMPLETE' | 'PENDING' | 'FAILED';
  amount: string;
  amountInUsd: string;
  type: 'MOBILE' | 'BANK';
  shortcode: string | null;
  accountNumber: string | null;
  publicName: string;
  receiptNumber: string;
  category: 'DISBURSEMENT' | 'COLLECTION';
  chain: string;
  asset: string;
  transactionHash: string | null;
  message: string;
  currencyCode: string;
  isReleased: boolean;
  pretiumCreatedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface MobileTransactionsResponse {
  success: boolean;
  data: PretiumTransaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UseMobileTransactionsParams {
  userAddress?: string;
  status?: 'COMPLETE' | 'PENDING' | 'FAILED';
  category?: 'DISBURSEMENT' | 'COLLECTION';
  chain?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function fetchMobileTransactions(params: UseMobileTransactionsParams = {}): Promise<MobileTransactionsResponse> {
  // const backendUrl = 'http://localhost:3001';
  const backendUrl = 'https://expendi-production-ab42.up.railway.app';
  
  const searchParams = new URLSearchParams();
  
  if (params.userAddress) searchParams.append('userAddress', params.userAddress);
  if (params.status) searchParams.append('status', params.status);
  if (params.category) searchParams.append('category', params.category);
  if (params.chain) searchParams.append('chain', params.chain);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());
  if (params.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

  const url = `${backendUrl}/api/pretium/transactions?${searchParams.toString()}`;
  
  console.log('🔍 Fetching mobile transactions from:', url);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch mobile transactions: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch mobile transactions');
  }
  
  return result;
}

export function useMobileTransactions(params: UseMobileTransactionsParams = {}) {
  return useQuery({
    queryKey: ['mobileTransactions', params],
    queryFn: () => fetchMobileTransactions(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

export type { PretiumTransaction, MobileTransactionsResponse };