// Budget Wallet contract interaction utilities
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import BudgetWalletABI from './SimpleBudgetWallet.json';
import type { Abi } from 'viem';
import type { SmartAccountClient } from 'permissionless';

// Budget Wallet ABI
export const BUDGET_WALLET_ABI = BudgetWalletABI.abi as Abi;

// ETH address constant (used in the contract)
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// MockUSDC token address
export const MOCK_USDC_ADDRESS = '0x5c6df8de742863d997083097e02a789f6b84bF38' as const;

// Create clients for Base Sepolia
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

// Budget Wallet utility functions
export const createBucket = (walletAddress: `0x${string}`) => async (
  writeContractAsync: (args: any) => Promise<`0x${string}`>,
  bucketName: string,
  monthlyLimit: bigint,
  smartAccountClient?: SmartAccountClient
) => {
  // Use smart account client for gas sponsorship if available
  if (smartAccountClient?.account) {
    return await smartAccountClient.writeContract({
      address: walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'createBucket',
      args: [bucketName, monthlyLimit],
      account: smartAccountClient.account,
      chain: smartAccountClient.chain
    });
  }
  
  // Fallback to regular wagmi call
  return await writeContractAsync({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'createBucket',
    args: [bucketName, monthlyLimit]
  });
};

export const depositETH = (walletAddress: `0x${string}`) => async (
  writeContractAsync: (args: any) => Promise<`0x${string}`>,
  amount: bigint
) => {
  return await writeContractAsync({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'depositETH',
    value: amount
  });
};

export const fundBucket = (walletAddress: `0x${string}`) => async (
  writeContractAsync: (args: any) => Promise<`0x${string}`>,
  bucketName: string,
  amount: bigint,
  token: `0x${string}` = ETH_ADDRESS
) => {
  return await writeContractAsync({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'fundBucket',
    args: [bucketName, amount, token]
  });
};

export const getUserBuckets = (walletAddress: `0x${string}`) => async (
  userAddress: `0x${string}`
): Promise<string[]> => {
  return await publicClient.readContract({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'getUserBuckets',
    args: [userAddress]
  }) as string[];
};

export const getBucket = (walletAddress: `0x${string}`) => async (
  userAddress: `0x${string}`,
  bucketName: string
) => {
  return await publicClient.readContract({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'getBucket',
    args: [userAddress, bucketName]
  });
};

export const getBucketBalance = (walletAddress: `0x${string}`) => async (
  userAddress: `0x${string}`,
  token: `0x${string}`,
  bucketName: string
): Promise<bigint> => {
  return await publicClient.readContract({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'getBucketBalance',
    args: [userAddress, token, bucketName]
  }) as bigint;
};

export const getUnallocatedBalance = (walletAddress: `0x${string}`) => async (
  userAddress: `0x${string}`,
  token: `0x${string}` = ETH_ADDRESS
): Promise<bigint> => {
  return await publicClient.readContract({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'getUnallocatedBalance',
    args: [userAddress, token]
  }) as bigint;
};

export const getTotalBalance = (walletAddress: `0x${string}`) => async (
  userAddress: `0x${string}`,
  token: `0x${string}` = ETH_ADDRESS
): Promise<bigint> => {
  return await publicClient.readContract({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'getTotalBalance',
    args: [userAddress, token]
  }) as bigint;
};

export const spendFromBucket = (walletAddress: `0x${string}`) => async (
  writeContractAsync: (args: any) => Promise<`0x${string}`>,
  user: `0x${string}`,
  bucketName: string,
  amount: bigint,
  recipient: `0x${string}`,
  token: `0x${string}` = ETH_ADDRESS,
  data: `0x${string}` = '0x'
) => {
  return await writeContractAsync({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'spendFromBucket',
    args: [user, bucketName, amount, recipient, token, data]
  });
};

export const updateBucket = (walletAddress: `0x${string}`) => async (
  writeContractAsync: (args: any) => Promise<`0x${string}`>,
  bucketName: string,
  newMonthlyLimit: bigint,
  active: boolean
) => {
  return await writeContractAsync({
    address: walletAddress,
    abi: BUDGET_WALLET_ABI,
    functionName: 'updateBucket',
    args: [bucketName, newMonthlyLimit, active]
  });
};

// Helper function to create budget wallet utilities
export function createBudgetWalletUtils(walletAddress: `0x${string}`) {
  return {
    createBucket: createBucket(walletAddress),
    depositETH: depositETH(walletAddress),
    fundBucket: fundBucket(walletAddress),
    getUserBuckets: getUserBuckets(walletAddress),
    getBucket: getBucket(walletAddress),
    getBucketBalance: getBucketBalance(walletAddress),
    getUnallocatedBalance: getUnallocatedBalance(walletAddress),
    getTotalBalance: getTotalBalance(walletAddress),
    spendFromBucket: spendFromBucket(walletAddress),
    updateBucket: updateBucket(walletAddress)
  };
}