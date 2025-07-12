// Budget Wallet contract interaction utilities
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import BudgetWalletABI from './SimpleBudgetWallet.json';
import type { Abi } from 'viem';

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
export class BudgetWalletUtils {
  constructor(private walletAddress: `0x${string}`) {}

  // Create a bucket
  async createBucket(
    writeContractAsync: (args: any) => Promise<`0x${string}`>,
    bucketName: string,
    monthlyLimit: bigint
  ) {
    return await writeContractAsync({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'createBucket',
      args: [bucketName, monthlyLimit]
    });
  }

  // Deposit ETH to the wallet
  async depositETH(
    writeContractAsync: (args: any) => Promise<`0x${string}`>,
    amount: bigint
  ) {
    return await writeContractAsync({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'depositETH',
      value: amount
    });
  }

  // Fund a bucket with ETH
  async fundBucket(
    writeContractAsync: (args: any) => Promise<`0x${string}`>,
    bucketName: string,
    amount: bigint,
    token: `0x${string}` = ETH_ADDRESS
  ) {
    return await writeContractAsync({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'fundBucket',
      args: [bucketName, amount, token]
    });
  }

  // Get user's buckets
  async getUserBuckets(userAddress: `0x${string}`): Promise<string[]> {
    return await publicClient.readContract({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'getUserBuckets',
      args: [userAddress]
    }) as string[];
  }

  // Get bucket details
  async getBucket(userAddress: `0x${string}`, bucketName: string) {
    return await publicClient.readContract({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'getBucket',
      args: [userAddress, bucketName]
    });
  }

  // Get bucket balance for a specific token
  async getBucketBalance(
    userAddress: `0x${string}`,
    token: `0x${string}`,
    bucketName: string
  ): Promise<bigint> {
    return await publicClient.readContract({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'getBucketBalance',
      args: [userAddress, token, bucketName]
    }) as bigint;
  }

  // Get unallocated balance
  async getUnallocatedBalance(
    userAddress: `0x${string}`,
    token: `0x${string}` = ETH_ADDRESS
  ): Promise<bigint> {
    return await publicClient.readContract({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'getUnallocatedBalance',
      args: [userAddress, token]
    }) as bigint;
  }

  // Get total balance
  async getTotalBalance(
    userAddress: `0x${string}`,
    token: `0x${string}` = ETH_ADDRESS
  ): Promise<bigint> {
    return await publicClient.readContract({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'getTotalBalance',
      args: [userAddress, token]
    }) as bigint;
  }

  // Spend from bucket
  async spendFromBucket(
    writeContractAsync: (args: any) => Promise<`0x${string}`>,
    user: `0x${string}`,
    bucketName: string,
    amount: bigint,
    recipient: `0x${string}`,
    token: `0x${string}` = ETH_ADDRESS,
    data: `0x${string}` = '0x'
  ) {
    return await writeContractAsync({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'spendFromBucket',
      args: [user, bucketName, amount, recipient, token, data]
    });
  }

  // Update bucket settings
  async updateBucket(
    writeContractAsync: (args: any) => Promise<`0x${string}`>,
    bucketName: string,
    newMonthlyLimit: bigint,
    active: boolean
  ) {
    return await writeContractAsync({
      address: this.walletAddress,
      abi: BUDGET_WALLET_ABI,
      functionName: 'updateBucket',
      args: [bucketName, newMonthlyLimit, active]
    });
  }
}

// Helper function to create a BudgetWalletUtils instance
export function createBudgetWalletUtils(walletAddress: `0x${string}`) {
  return new BudgetWalletUtils(walletAddress);
}