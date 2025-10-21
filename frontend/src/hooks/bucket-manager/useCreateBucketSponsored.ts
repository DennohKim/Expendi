import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits, encodeFunctionData } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useSmartWallet } from '@/hooks/useSmartWallet';

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
 * Hook to create a bucket using Privy's smart wallet with sponsored gas
 * This uses Privy's native smart wallet support with Biconomy paymaster
 */
export function useCreateBucketSponsored() {
  const { client, isReady } = useSmartWallet();
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
      if (!isReady || !client) {
        throw new Error('Smart wallet not ready. Please wait a moment.');
      }

      // Switch to the correct chain
      try {
        await client.switchChain({ id: baseSepolia.id });
      } catch (e) {
        console.warn('Chain switch failed or already on correct chain:', e);
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
      const data = encodeFunctionData({
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'createBucket',
        args: [bucketName, parsedLimit],
      });

      // Send via smart wallet client - gas is automatically sponsored via paymaster
      const hash = await client.sendTransaction({
        to: bucketManagerAddress,
        data: data as `0x${string}`,
        value: BigInt(0),
      }) as `0x${string}`;

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
    
    // Smart wallet readiness
    isReady,
  };
}
