import { useState, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseUnits, Address, erc20Abi, encodeFunctionData, keccak256, toBytes } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig } from '@/lib/contracts/config';

export interface CreateCustomSubscriptionParams {
  name: string;
  description?: string;
  category: string;
  amount: string;
  periodInDays: number;
  recipient: Address;
  customBillingDate?: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  transactionHash: string;
}

export interface PermissionParams {
  allowedAmount: string;
  periodInSeconds: number;
  expiryTimestamp: number;
}

// Custom subscription contract ABI (key functions only)
const EXPENDI_SUBSCRIPTIONS_ABI = [
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "token", "type": "address"},
      {"name": "allowedAmount", "type": "uint256"},
      {"name": "periodInSeconds", "type": "uint256"},
      {"name": "expiryTimestamp", "type": "uint256"}
    ],
    "name": "grantPermission",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "payer", "type": "address"},
      {"name": "recipient", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "periodInDays", "type": "uint256"},
      {"name": "nextChargeTimestamp", "type": "uint256"},
      {"name": "metadata", "type": "string"}
    ],
    "name": "createSubscription",
    "outputs": [{"name": "subscriptionId", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "subscriptionId", "type": "bytes32"}],
    "name": "chargeSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "subscriptionId", "type": "bytes32"}],
    "name": "pauseSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "subscriptionId", "type": "bytes32"}],
    "name": "resumeSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "subscriptionId", "type": "bytes32"}],
    "name": "cancelSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "subscriptionId", "type": "bytes32"}],
    "name": "getSubscription",
    "outputs": [{
      "components": [
        {"name": "payer", "type": "address"},
        {"name": "recipient", "type": "address"},
        {"name": "token", "type": "address"},
        {"name": "amount", "type": "uint256"},
        {"name": "periodInDays", "type": "uint256"},
        {"name": "lastChargeTimestamp", "type": "uint256"},
        {"name": "nextChargeTimestamp", "type": "uint256"},
        {"name": "maxAllowedAmount", "type": "uint256"},
        {"name": "isActive", "type": "bool"},
        {"name": "isPaused", "type": "bool"},
        {"name": "totalCharged", "type": "uint256"},
        {"name": "chargeCount", "type": "uint256"},
        {"name": "metadata", "type": "string"}
      ],
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "getPermission",
    "outputs": [{
      "components": [
        {"name": "token", "type": "address"},
        {"name": "allowedAmount", "type": "uint256"},
        {"name": "usedAmount", "type": "uint256"},
        {"name": "periodInSeconds", "type": "uint256"},
        {"name": "lastResetTimestamp", "type": "uint256"},
        {"name": "expiryTimestamp", "type": "uint256"},
        {"name": "isActive", "type": "bool"}
      ],
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "subscriptionId", "type": "bytes32"}],
    "name": "isSubscriptionDue",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "spender", "type": "address"}],
    "name": "revokePermission",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const useCustomSubscription = () => {
  const { address, isConnected } = useAccount();
  const { smartAccountClient, smartAccountReady } = useSmartAccount();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const networkConfig = getNetworkConfig();
  
  // Contract addresses - these should be set after deployment
  const SUBSCRIPTION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_EXPENDI_SUBSCRIPTION_CONTRACT_ADDRESS as Address || '0x';
  const BACKEND_SPENDER_ADDRESS = process.env.NEXT_PUBLIC_BACKEND_SPENDER_ADDRESS as Address || '0x';

  /**
   * Grant permission to backend for subscription management
   */
  const grantSubscriptionPermission = useCallback(async (
    params: PermissionParams
  ): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!smartAccountClient || !smartAccountReady) {
      throw new Error('Smart account not ready');
    }

    if (!SUBSCRIPTION_CONTRACT_ADDRESS || !BACKEND_SPENDER_ADDRESS) {
      throw new Error('Contract addresses not configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const parsedAmount = parseUnits(params.allowedAmount, 6);

      console.log('Granting subscription permission:', {
        spender: BACKEND_SPENDER_ADDRESS,
        token: networkConfig.USDC_ADDRESS,
        allowedAmount: parsedAmount.toString(),
        periodInSeconds: params.periodInSeconds,
        expiryTimestamp: params.expiryTimestamp
      });

      if (!smartAccountClient.account) {
        throw new Error('Smart account not available');
      }

      const txHash = await smartAccountClient.writeContract({
        address: SUBSCRIPTION_CONTRACT_ADDRESS,
        abi: EXPENDI_SUBSCRIPTIONS_ABI,
        functionName: 'grantPermission',
        args: [
          BACKEND_SPENDER_ADDRESS,
          networkConfig.USDC_ADDRESS as Address,
          parsedAmount,
          BigInt(params.periodInSeconds),
          BigInt(params.expiryTimestamp)
        ],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      console.log('Permission granted successfully:', txHash);
      return txHash;
    } catch (err) {
      console.error('Failed to grant permission:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to grant permission';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, networkConfig, SUBSCRIPTION_CONTRACT_ADDRESS, BACKEND_SPENDER_ADDRESS]);

  /**
   * Create a subscription via backend API (after permissions are granted)
   */
  const createSubscription = useCallback(async (
    params: CreateCustomSubscriptionParams
  ): Promise<SubscriptionResult> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Creating custom subscription via backend:', params);

      // Calculate next charge timestamp
      let nextChargeTimestamp: number;
      if (params.customBillingDate) {
        nextChargeTimestamp = Math.floor(new Date(params.customBillingDate).getTime() / 1000);
      } else {
        nextChargeTimestamp = Math.floor(Date.now() / 1000) + (params.periodInDays * 24 * 60 * 60);
      }

      // Call backend API to create subscription
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payerAddress: address,
          recipientAddress: params.recipient,
          amount: params.amount,
          periodInDays: params.periodInDays,
          nextChargeTimestamp,
          metadata: {
            name: params.name,
            description: params.description,
            category: params.category,
            customBillingDate: params.customBillingDate
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const result = await response.json();
      console.log('Custom subscription created successfully:', result);

      return {
        subscriptionId: result.subscriptionId,
        transactionHash: result.transactionHash
      };
    } catch (err) {
      console.error('Failed to create custom subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address]);

  /**
   * Cancel a subscription
   */
  const cancelSubscription = useCallback(async (subscriptionId: string): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!smartAccountClient || !smartAccountReady) {
      throw new Error('Smart account not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Cancelling subscription:', subscriptionId);

      if (!smartAccountClient.account) {
        throw new Error('Smart account not available');
      }

      // Convert string ID to bytes32
      const subscriptionIdBytes32 = keccak256(toBytes(subscriptionId));

      const txHash = await smartAccountClient.writeContract({
        address: SUBSCRIPTION_CONTRACT_ADDRESS,
        abi: EXPENDI_SUBSCRIPTIONS_ABI,
        functionName: 'cancelSubscription',
        args: [subscriptionIdBytes32],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      console.log('Subscription cancelled successfully:', txHash);
      return txHash;
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, SUBSCRIPTION_CONTRACT_ADDRESS]);

  /**
   * Pause a subscription
   */
  const pauseSubscription = useCallback(async (subscriptionId: string): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!smartAccountClient || !smartAccountReady) {
      throw new Error('Smart account not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Pausing subscription:', subscriptionId);

      if (!smartAccountClient.account) {
        throw new Error('Smart account not available');
      }

      const subscriptionIdBytes32 = keccak256(toBytes(subscriptionId));

      const txHash = await smartAccountClient.writeContract({
        address: SUBSCRIPTION_CONTRACT_ADDRESS,
        abi: EXPENDI_SUBSCRIPTIONS_ABI,
        functionName: 'pauseSubscription',
        args: [subscriptionIdBytes32],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      console.log('Subscription paused successfully:', txHash);
      return txHash;
    } catch (err) {
      console.error('Failed to pause subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, SUBSCRIPTION_CONTRACT_ADDRESS]);

  /**
   * Resume a subscription
   */
  const resumeSubscription = useCallback(async (subscriptionId: string): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!smartAccountClient || !smartAccountReady) {
      throw new Error('Smart account not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Resuming subscription:', subscriptionId);

      if (!smartAccountClient.account) {
        throw new Error('Smart account not available');
      }

      const subscriptionIdBytes32 = keccak256(toBytes(subscriptionId));

      const txHash = await smartAccountClient.writeContract({
        address: SUBSCRIPTION_CONTRACT_ADDRESS,
        abi: EXPENDI_SUBSCRIPTIONS_ABI,
        functionName: 'resumeSubscription',
        args: [subscriptionIdBytes32],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      console.log('Subscription resumed successfully:', txHash);
      return txHash;
    } catch (err) {
      console.error('Failed to resume subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, SUBSCRIPTION_CONTRACT_ADDRESS]);

  /**
   * Get subscription status from contract
   */
  const getSubscriptionStatus = useCallback(async (subscriptionId: string) => {
    try {
      console.log('Getting subscription status:', subscriptionId);

      if (!smartAccountClient) {
        throw new Error('Smart account not available');
      }

      const subscriptionIdBytes32 = keccak256(toBytes(subscriptionId));

      if (!publicClient) {
        throw new Error('Public client not available');
      }

      const subscription = await publicClient.readContract({
        address: SUBSCRIPTION_CONTRACT_ADDRESS,
        abi: EXPENDI_SUBSCRIPTIONS_ABI,
        functionName: 'getSubscription',
        args: [subscriptionIdBytes32]
      });

      console.log('Subscription status:', subscription);
      return subscription;
    } catch (err) {
      console.error('Failed to get subscription status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get subscription status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [publicClient, SUBSCRIPTION_CONTRACT_ADDRESS]);

  /**
   * Get current permission status
   */
  const getPermissionStatus = useCallback(async () => {
    try {
      if (!address || !smartAccountClient) {
        return null;
      }

      console.log('Getting permission status for:', address);

      if (!publicClient) {
        throw new Error('Public client not available');
      }

      const permission = await publicClient.readContract({
        address: SUBSCRIPTION_CONTRACT_ADDRESS,
        abi: EXPENDI_SUBSCRIPTIONS_ABI,
        functionName: 'getPermission',
        args: [address, BACKEND_SPENDER_ADDRESS]
      });

      console.log('Permission status:', permission);
      return permission;
    } catch (err) {
      console.error('Failed to get permission status:', err);
      return null;
    }
  }, [address, publicClient, SUBSCRIPTION_CONTRACT_ADDRESS, BACKEND_SPENDER_ADDRESS]);

  /**
   * Approve USDC for the subscription contract
   */
  const approveUSDC = useCallback(async (amount: string): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!smartAccountClient || !smartAccountReady) {
      throw new Error('Smart account not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      const parsedAmount = parseUnits(amount, 6);
      
      console.log('Approving USDC for subscription contract:', {
        token: networkConfig.USDC_ADDRESS,
        spender: SUBSCRIPTION_CONTRACT_ADDRESS,
        amount: parsedAmount.toString()
      });

      if (!smartAccountClient.account) {
        throw new Error('Smart account not available');
      }

      const txHash = await smartAccountClient.writeContract({
        address: networkConfig.USDC_ADDRESS as Address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [SUBSCRIPTION_CONTRACT_ADDRESS, parsedAmount],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      console.log('USDC approval successful:', txHash);
      return txHash;
    } catch (err) {
      console.error('Failed to approve USDC:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve USDC';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, networkConfig, SUBSCRIPTION_CONTRACT_ADDRESS]);

  /**
   * Revoke permission from backend
   */
  const revokePermission = useCallback(async (): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!smartAccountClient || !smartAccountReady) {
      throw new Error('Smart account not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Revoking permission from backend');

      if (!smartAccountClient.account) {
        throw new Error('Smart account not available');
      }

      const txHash = await smartAccountClient.writeContract({
        address: SUBSCRIPTION_CONTRACT_ADDRESS,
        abi: EXPENDI_SUBSCRIPTIONS_ABI,
        functionName: 'revokePermission',
        args: [BACKEND_SPENDER_ADDRESS],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      console.log('Permission revoked successfully:', txHash);
      return txHash;
    } catch (err) {
      console.error('Failed to revoke permission:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke permission';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, SUBSCRIPTION_CONTRACT_ADDRESS, BACKEND_SPENDER_ADDRESS]);

  return {
    // Core subscription functions
    createSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    getSubscriptionStatus,

    // Permission management
    grantSubscriptionPermission,
    getPermissionStatus,
    revokePermission,

    // USDC utilities
    approveUSDC,

    // State
    isLoading,
    error,
    clearError: () => setError(null),
    isConnected,
    address,
    smartAccountAddress: smartAccountClient?.account?.address,
    smartAccountReady,
    networkConfig,

    // Contract addresses for debugging
    contractAddresses: {
      subscription: SUBSCRIPTION_CONTRACT_ADDRESS,
      backendSpender: BACKEND_SPENDER_ADDRESS,
      usdc: networkConfig.USDC_ADDRESS
    }
  };
};