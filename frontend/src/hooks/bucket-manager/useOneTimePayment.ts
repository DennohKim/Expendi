import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface OneTimePaymentRequest {
  bucketName: string;
  amount: string; // in USDC
  recipient: string; // recipient address
  description: string; // payment description
}

export function useOneTimePayment() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      bucketName,
      amount,
      recipient,
      description
    }: OneTimePaymentRequest) => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig(CHAIN_IDS.BASE_SEPOLIA);
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;
      
      if (!bucketManagerAddress) {
        throw new Error('ExpendiBucketManager not available on this network');
      }
      
      const parsedAmount = parseUnits(amount, 6);

      const txHash = await smartAccountClient.writeContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'makeOneTimePayment',
        args: [
          bucketName,
          parsedAmount,
          usdcAddress,
          recipient as `0x${string}`,
          description
        ],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { txHash, bucketName, amount, recipient, description };
    },
    onSuccess: (data) => {
      toast.success(`Payment sent: ${data.amount} USDC to ${data.recipient.slice(0, 6)}...${data.recipient.slice(-4)}`);
      queryClient.invalidateQueries({ queryKey: ['bucket-balance'] });
      queryClient.invalidateQueries({ queryKey: ['bucket-info'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
    onError: (error) => {
      console.error('Error making payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to make payment';
      toast.error(errorMessage);
    }
  });
}