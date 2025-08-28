import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

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
