import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OnrampRequest {
  shortcode: string;
  amount: number;
  fee?: number;
  mobile_network: string;
  callback_url?: string;
  chain: string;
  asset: string;
  address: string;
  currency_code: string;
}

interface OnrampResponse {
  [key: string]: unknown;
  success?: boolean;
  message?: string;
  transaction_code?: string;
  transaction_id?: string;
}

async function sendOnrampRequest(request: OnrampRequest): Promise<OnrampResponse> {
  const response = await fetch('/api/pretium/onramp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Onramp failed');
  }
  
  return result;
}

export function useOnramp() {
  return useMutation({
    mutationFn: sendOnrampRequest,
    onSuccess: () => {
      toast.success('Onramp transaction initiated successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process onramp';
      toast.error(errorMessage);
    },
  });
}