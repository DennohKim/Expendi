import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits, encodeFunctionData } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useSmartAccount } from '@/context/SmartAccountContext';

interface CreateBucketRequest {
  bucketName: string;
  monthlyLimit: string;
}

interface MutationResult {
  txHash: string;
  bucketName: string;
  monthlyLimit: string;
}

/**
 * Alternative hook to create a bucket using Pimlico paymaster
 * This uses the existing SmartAccountContext with Pimlico for gas sponsorship
 * 
 * Use this if Privy's gas sponsorship is not configured/available
 * Requires NEXT_PUBLIC_PIMLICO_API_KEY environment variable
 */
export function useCreateBucketPimlico() {
  const { smartAccountClient, smartAccountReady } = useSmartAccount();
  const queryClient = useQueryClient();

  // Local state to hold the submitted tx hash
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  // Use Wagmi to wait for the transaction receipt once txHash is set
  const { 
    data: receipt, 
    isLoading: waiting, 
    isSuccess: confirmed, 
    isError: receiptError, 
    error: receiptErr 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Mutation for sending the transaction
  const mutation = useMutation<MutationResult, unknown, CreateBucketRequest>({
    mutationFn: async ({ bucketName, monthlyLimit }) => {
      if (!smartAccountReady || !smartAccountClient) {
        throw new Error('Smart account not ready. Please wait a moment.');
      }

      const networkConfig = getNetworkConfig(CHAIN_IDS.BASE_SEPOLIA);
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      
      if (
        !bucketManagerAddress ||
        bucketManagerAddress === '0x0000000000000000000000000000000000000000'
      ) {
        throw new Error('BucketManager contract not available on this network');
      }

      const parsedLimit = parseUnits(monthlyLimit, 6);

      // Send via smart account client with Pimlico paymaster - gas is automatically sponsored
      const data = encodeFunctionData({
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'createBucket',
        args: [bucketName, parsedLimit],
      });

      const hash = await smartAccountClient.sendTransaction({
        to: bucketManagerAddress,
        data,
        value: BigInt(0),
      } as any) as `0x${string}`;

      if (!hash) {
        throw new Error('No transaction hash returned');
      }

      // Save it for Wagmi to track
      setTxHash(hash);

      return {
        txHash: hash,
        bucketName,
        monthlyLimit,
      };
    },

    onSuccess: (data) => {
      toast.success(`Transaction submitted: ${data.txHash}`, { duration: 10000 });
    },

    onError: (err) => {
      console.error('Error submitting transaction:', err);
      const errorMessage = (err as { shortMessage?: string; message?: string }).shortMessage ||
        (err as { message?: string }).message ||
        'Failed to submit transaction';
      toast.error(errorMessage);
    },
  });

  // Effect: when receipt is confirmed, trigger post-transaction logic
  useEffect(() => {
    if (confirmed && receipt) {
      // Transaction confirmed; do post-confirmation tasks
      toast.success(`Transaction confirmed in block ${receipt.blockNumber}`);
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['bucket-info'] });
      queryClient.invalidateQueries({ queryKey: ['buckets-list'] });
      // Reset txHash after confirmation
      setTxHash(undefined);
    }
    if (receiptError) {
      console.error('Transaction failed or error waiting for receipt:', receiptErr);
      toast.error('Transaction failed to confirm');
      // Reset txHash on error
      setTxHash(undefined);
    }
  }, [confirmed, receipt, receiptError, receiptErr, queryClient]);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    status: mutation.status,
    error: mutation.error,

    // Additional states from Wagmi
    txHash,
    receipt,
    waiting,   // true while waiting for confirmation
    confirmed, // true if confirmed
    receiptError,
    
    // Smart account readiness
    isReady: smartAccountReady,
  };
}
