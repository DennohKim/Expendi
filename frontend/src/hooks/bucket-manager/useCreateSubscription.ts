import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface CreateSubscriptionRequest {
  bucketName: string;
  amount: string; // in USDC
  periodInDays: number;
  recipient: string; // recipient address
  metadata: string; // description/metadata
  userConsent: boolean;
}

export function useCreateSubscription() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      bucketName,
      amount,
      periodInDays,
      recipient,
      metadata,
      userConsent
    }: CreateSubscriptionRequest) => {
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
        functionName: 'createBucketSubscription',
        args: [
          bucketName,
          parsedAmount,
          BigInt(periodInDays),
          usdcAddress,
          recipient as `0x${string}`,
          metadata,
          userConsent
        ],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { txHash, bucketName, amount, periodInDays, recipient, metadata };
    },
    onSuccess: (data) => {
      toast.success(`Subscription created for "${data.bucketName}" - ${data.amount} USDC every ${data.periodInDays} days`);
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['bucket-info'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
    onError: (error) => {
      console.error('Error creating subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription';
      toast.error(errorMessage);
    }
  });
}