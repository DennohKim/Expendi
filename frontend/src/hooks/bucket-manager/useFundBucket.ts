import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface FundBucketRequest {
  bucketName: string;
  amount: string; // in USDC
}

export function useFundBucket() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bucketName, amount }: FundBucketRequest) => {
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
        functionName: 'fundBucket',
        args: [bucketName, parsedAmount, usdcAddress],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { txHash, bucketName, amount };
    },
    onSuccess: (data) => {
      toast.success(`Funded "${data.bucketName}" with ${data.amount} USDC`);
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['bucket-balance'] });
      queryClient.invalidateQueries({ queryKey: ['bucket-info'] });
    },
    onError: (error) => {
      console.error('Error funding bucket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fund bucket';
      toast.error(errorMessage);
    }
  });
}