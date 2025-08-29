import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

interface PaymentStatusRequest {
  transaction_code: string;
  currency?: string;
}

interface PaymentStatusResponse {
  code: number;
  message: string;
  data: {
    id: number;
    transaction_code: string;
    status: string;
    amount: string;
    amount_in_usd: string;
    type: string;
    shortcode: string;
    account_number: string | null;
    public_name: string;
    receipt_number: string;
    category: string;
    chain: string;
    asset: string;
    transaction_hash: string;
    message: string;
    currency_code: string;
    is_released: boolean;
    created_at: string;
  };
  generated_at: string;
  receipt_id: string;
}

async function fetchPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
  const response = await fetch('/api/pretium/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch payment status');
  }
  
  return result;
}

export function usePaymentStatus() {
  return useMutation({
    mutationFn: fetchPaymentStatus,
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch payment status';
      toast.error(errorMessage);
    },
  });
}

export function usePaymentStatusWithPolling(transactionCode: string | null, currency?: string) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);
  const maxAttempts = 20; // Maximum 20 attempts (10 minutes at 30s intervals)
  const pollInterval = 30000; // 30 seconds

  const query = useQuery({
    queryKey: ['paymentStatus', transactionCode, currency],
    queryFn: () => fetchPaymentStatus({ 
      transaction_code: transactionCode!, 
      currency 
    }),
    enabled: !!transactionCode,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!transactionCode || !query.data) return;

    const status = query.data.data.status;
    
    // If status is still pending and we haven't exceeded max attempts, continue polling
    if (status === 'PENDING' && attemptsRef.current < maxAttempts) {
      intervalRef.current = setTimeout(() => {
        attemptsRef.current += 1;
        console.log(`Polling attempt ${attemptsRef.current} for transaction ${transactionCode}`);
        query.refetch();
      }, pollInterval);
    } else if (status !== 'PENDING') {
      // Payment completed or failed, stop polling
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      attemptsRef.current = 0;
    } else if (attemptsRef.current >= maxAttempts) {
      // Max attempts reached
      console.warn(`Max polling attempts reached for transaction ${transactionCode}`);
      toast.error('Payment status check timed out. Please try again later.');
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [query.data, transactionCode, query.refetch]);

  // Reset attempts when transaction code changes
  useEffect(() => {
    attemptsRef.current = 0;
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, [transactionCode]);

  return query;
}
