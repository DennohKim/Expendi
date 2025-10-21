import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits, createPublicClient, createWalletClient, custom, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig, CHAIN_IDS } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface CreateBucketRequest {
  bucketName: string;
  monthlyLimit: string; // in USDC
}

export function useCreateBucket() {
  const { eoa } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bucketName, monthlyLimit }: CreateBucketRequest) => {
      if (!eoa) {
        throw new Error('EOA wallet not available');
      }

      const networkConfig = getNetworkConfig(CHAIN_IDS.BASE_SEPOLIA);
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      
      if (!bucketManagerAddress || bucketManagerAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('ExpendiBucketManager not available on this network');
      }
      
      const parsedLimit = parseUnits(monthlyLimit, 6); // USDC has 6 decimals

      // Create wallet client for the EOA
      const eip1193provider = await eoa.getEthereumProvider();
      const walletClient = createWalletClient({
        account: eoa.address as `0x${string}`,
        chain: baseSepolia,
        transport: custom(eip1193provider),
      });

      console.log('Creating bucket with params:', {
        bucketName,
        monthlyLimit,
        parsedLimit: parsedLimit.toString(),
        bucketManagerAddress,
        account: eoa.address
      });

      const txHash = await walletClient.writeContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'createBucket',
        args: [bucketName, parsedLimit],
      });

      console.log('Transaction submitted with hash:', txHash);
      console.log('EOA transaction details:', {
        account: eoa.address,
        chain: baseSepolia.id,
        chainName: baseSepolia.name
      });

      // EOA transactions should appear directly on-chain
      console.log('EOA transaction submitted successfully. Hash:', txHash);
      console.log('EOA transactions appear directly on Base Sepolia blockchain');
      
      return { 
        txHash, 
        bucketName, 
        monthlyLimit,
        message: 'EOA transaction submitted. Check Base Sepolia explorer for confirmation.' 
      };
    },
    onSuccess: (data) => {
      console.log('Bucket creation transaction submitted:', data);
      toast.success(
        `Bucket "${data.bucketName}" transaction submitted! Check transaction: ${data.txHash}`,
        { duration: 10000 }
      );
      
      // Invalidate queries after a delay to allow for transaction confirmation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['buckets'] });
        queryClient.invalidateQueries({ queryKey: ['bucket-info'] });
        queryClient.invalidateQueries({ queryKey: ['buckets-list'] });
      }, 5000);
    },
    onError: (error) => {
      console.error('Error creating bucket:', error);
      
      let errorMessage = 'Failed to create bucket';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('operation too frequent')) {
          errorMessage = 'Please wait 5 minutes between bucket operations';
        } else if (errorMsg.includes('bucket already exists')) {
          errorMessage = 'A bucket with this name already exists';
        } else if (errorMsg.includes('monthly limit too high')) {
          errorMessage = 'Monthly limit is too high (max 1M USDC)';
        } else if (errorMsg.includes('bucket name too long')) {
          errorMessage = 'Bucket name must be 50 characters or less';
        } else if (errorMsg.includes('bucket name cannot be empty')) {
          errorMessage = 'Bucket name cannot be empty';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    }
  });
}