import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, Address, erc20Abi } from 'viem';
import { BaseAccount } from '@base-org/account';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig } from '@/lib/contracts/config';

export interface CreateSubscriptionParams {
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

export const useBaseAccount = () => {
  const { address, isConnected } = useAccount();
  const { smartAccountClient, smartAccountReady } = useSmartAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const networkConfig = getNetworkConfig();
  const isTestnet = process.env.NEXT_PUBLIC_RECURRING_PAYMENTS_TESTNET === 'true';

  // Initialize Base Account client
  const initializeBaseAccount = useCallback(() => {
    if (!smartAccountClient) {
      throw new Error('Smart account not ready');
    }

    const baseAccount = new BaseAccount({
      chain: smartAccountClient.chain,
      apiKey: process.env.NEXT_PUBLIC_BASE_API_KEY, // Add this to your env vars
    });

    return baseAccount;
  }, [smartAccountClient]);

  const createSubscription = useCallback(async (
    params: CreateSubscriptionParams
  ): Promise<SubscriptionResult> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!smartAccountClient || !smartAccountReady) {
      throw new Error('Smart account not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      const baseAccount = initializeBaseAccount();

      // Parse amount to proper units (USDC has 6 decimals)
      const parsedAmount = parseUnits(params.amount, 6);
      
      // Convert period from days to seconds for Base API
      const intervalInSeconds = params.periodInDays * 24 * 60 * 60;

      console.log('Creating Base subscription with params:', {
        payer: address,
        recipient: params.recipient,
        amount: parsedAmount.toString(),
        period: intervalInSeconds,
        token: networkConfig.USDC_ADDRESS,
        name: params.name,
        description: params.description,
        category: params.category
      });

      // Use Base Account SDK to create subscription with spend permissions
      const subscriptionResult = await baseAccount.subscription.subscribe({
        payer: address,
        recipient: params.recipient,
        amount: parsedAmount,
        period: intervalInSeconds, // Period in seconds
        token: networkConfig.USDC_ADDRESS as `0x${string}`,
        wallet: smartAccountClient, // Use smart account for sponsored transactions
        metadata: {
          name: params.name,
          description: params.description || '',
          category: params.category,
        }
      });

      console.log('Base subscription created successfully:', subscriptionResult);

      return {
        subscriptionId: subscriptionResult.subscriptionId,
        transactionHash: subscriptionResult.hash,
      };
    } catch (err) {
      console.error('Failed to create Base subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, networkConfig, initializeBaseAccount]);

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
      const baseAccount = initializeBaseAccount();

      console.log('Cancelling Base subscription:', subscriptionId);

      // Use Base Account SDK to cancel subscription
      const result = await baseAccount.subscription.cancel({
        subscriptionId,
        wallet: smartAccountClient, // Use smart account for sponsored transactions
      });

      console.log('Base subscription cancelled successfully:', result);
      return result.hash;
    } catch (err) {
      console.error('Failed to cancel Base subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, initializeBaseAccount]);

  const getSubscriptionStatus = useCallback(async (subscriptionId: string) => {
    try {
      const baseAccount = initializeBaseAccount();

      console.log('Getting Base subscription status:', subscriptionId);

      // Use Base Account SDK to get subscription status
      const status = await baseAccount.subscription.getStatus(subscriptionId);

      console.log('Base subscription status:', status);
      return status;
    } catch (err) {
      console.error('Failed to get Base subscription status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get subscription status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [initializeBaseAccount]);

  const approveUSDC = useCallback(async (amount: string, spender: Address): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!smartAccountClient || !smartAccountReady) {
      throw new Error('Smart account not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse amount to proper units (USDC has 6 decimals)
      const parsedAmount = parseUnits(amount, 6);
      
      console.log('Approving USDC spend:', {
        token: networkConfig.USDC_ADDRESS,
        spender,
        amount: parsedAmount.toString()
      });

      // Use sponsored transaction via smart account for USDC approval
      const txHash = await smartAccountClient.writeContract({
        address: networkConfig.USDC_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, parsedAmount],
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
  }, [isConnected, address, smartAccountClient, smartAccountReady, networkConfig]);

  const prepareCharge = useCallback(async (subscriptionId: string) => {
    try {
      const baseAccount = initializeBaseAccount();

      console.log('Preparing charge for subscription:', subscriptionId);

      // Use Base Account SDK to prepare charge (for backend processing)
      const chargeData = await baseAccount.subscription.prepareCharge(subscriptionId);

      console.log('Charge prepared successfully:', chargeData);
      return chargeData;
    } catch (err) {
      console.error('Failed to prepare charge:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare charge';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [initializeBaseAccount]);

  return {
    createSubscription,
    cancelSubscription,
    getSubscriptionStatus,
    approveUSDC,
    prepareCharge, // For backend charging
    isLoading,
    error,
    clearError: () => setError(null),
    isConnected,
    address,
    smartAccountAddress: smartAccountClient?.account?.address,
    smartAccountReady,
    networkConfig,
    isTestnet,
  };
};