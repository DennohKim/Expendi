import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { BUDGET_WALLET_ABI } from '@/lib/contracts/budget-wallet';
import { getNetworkConfig } from '@/lib/contracts/config';

interface SpendFromBucketRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smartAccountClient: any; // Smart account client from permissionless
  walletAddress: `0x${string}`;
  userAddress: `0x${string}`;
  bucketName: string;
  amount: string;
  recipient: `0x${string}`;
  tokenAddress?: `0x${string}`;
}

interface SpendFromBucketResponse {
  txHash: string;
}

async function spendFromBucket(request: SpendFromBucketRequest): Promise<SpendFromBucketResponse> {
  const {
    smartAccountClient,
    walletAddress,
    userAddress,
    bucketName,
    amount,
    recipient,
    tokenAddress
  } = request;

  if (!smartAccountClient?.account) {
    throw new Error('Smart account not available');
  }

  // Get network configuration for current chain
  const networkConfig = getNetworkConfig();
  const usdcAddress = tokenAddress || networkConfig.USDC_ADDRESS as `0x${string}`;
  
  const parsedAmount = parseUnits(amount, 6); // USDC has 6 decimals

  const txHash = await smartAccountClient.writeContract({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'spendFromBucket',
    args: [
      userAddress, // user
      bucketName, // bucketName
      parsedAmount, // amount
      recipient, // recipient
      usdcAddress, // token (USDC)
      '0x' as `0x${string}` // data (empty)
    ],
    account: smartAccountClient.account,
    chain: smartAccountClient.chain
  });

  return { txHash };
}

export function useSpendFromBucket() {
  return useMutation({
    mutationFn: spendFromBucket,
    onError: (error) => {
      console.error('Error spending from bucket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to spend from bucket';
      toast.error(errorMessage);
    },
  });
}