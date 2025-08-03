import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MobilePaymentRequest {
  transaction_hash: string;
  amount: string;
  shortcode: string;
  type: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS';
  mobile_network: 'Safaricom' | 'Airtel';
  callback_url: string;
  chain: string;
}

interface MobilePaymentResponse {
  [key: string]: unknown;
  success?: boolean;
  message?: string;
  transaction_code?: string;
}

async function sendMobilePayment(request: MobilePaymentRequest): Promise<MobilePaymentResponse> {
  const response = await fetch('/api/pretium', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Payment failed');
  }
  
  return result;
}

export function useMobilePayment() {
  return useMutation({
    mutationFn: sendMobilePayment,
    onSuccess: () => {
      toast.success('Mobile payment initiated successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process mobile payment';
      toast.error(errorMessage);
    },
  });
}