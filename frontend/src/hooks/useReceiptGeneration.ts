import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface GenerateReceiptRequest {
  transaction_code: string;
  currency?: string;
}

interface Receipt {
  status: string;
  transaction_code: string;
  amount?: string;
  currency?: string;
  timestamp?: string;
  reference?: string;
  generated_at: string;
  receipt_id: string;
  [key: string]: unknown;
}

async function generateReceipt(data: GenerateReceiptRequest): Promise<Receipt> {
  const response = await fetch('/api/pretium/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate receipt');
  }

  return response.json();
}

export function useReceiptGeneration() {
  return useMutation({
    mutationFn: generateReceipt,
    onSuccess: (receipt) => {
      toast.success(`Receipt generated: ${receipt.receipt_id}`);
    },
    onError: (error) => {
      console.error('Receipt generation failed:', error);
      toast.error('Failed to generate receipt');
    },
  });
}