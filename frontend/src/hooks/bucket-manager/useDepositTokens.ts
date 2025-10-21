import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI, ERC20_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface DepositTokensRequest {
  amount: string; // in USDC
}

export function useDepositTokens() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ amount }: DepositTokensRequest) => {
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

      toast.info('Approving USDC spending...');
      
      // First approve USDC spending
      const approvalTxHash = await smartAccountClient.writeContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [bucketManagerAddress, parsedAmount],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      // Wait for approval confirmation
      await smartAccountClient.waitForTransactionReceipt({ hash: approvalTxHash });
      
      toast.info('Depositing tokens...');

      // Then deposit tokens
      const depositTxHash = await smartAccountClient.writeContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'depositTokens',
        args: [usdcAddress, parsedAmount],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { depositTxHash, approvalTxHash, amount };
    },
    onSuccess: (data) => {
      toast.success(`Deposited ${data.amount} USDC to contract`);
      queryClient.invalidateQueries({ queryKey: ['user-token-balance'] });
      queryClient.invalidateQueries({ queryKey: ['usdc-balance'] });
    },
    onError: (error) => {
      console.error('Error depositing tokens:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to deposit tokens';
      toast.error(errorMessage);
    }
  });
}