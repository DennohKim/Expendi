import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, Address, erc20Abi } from 'viem';
import { 
  subscribe, 
  getSubscriptionStatus as getBaseSubscriptionStatus,
  prepareCharge as basePrepareCharge,
  type SubscriptionOptions
} from '@base-org/account';
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
  // Using Base mainnet only
  const isTestnet = false;

  // Base Account SDK doesn't need initialization - functions are used directly

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

      // Use Base Account SDK to create subscription with spend permissions (mainnet only)
      const subscriptionOptions: SubscriptionOptions = {
        recurringCharge: params.amount,
        subscriptionOwner: params.recipient,
        periodInDays: params.periodInDays,
        walletUrl: process.env.NEXT_PUBLIC_WALLET_URL,
        telemetry: true
      };

      const subscriptionResult = await subscribe(subscriptionOptions);

      console.log('Base subscription created successfully:', subscriptionResult);

      return {
        subscriptionId: subscriptionResult.id, // The subscription ID is in 'id' field
        transactionHash: subscriptionResult.id, // Use ID as transaction reference
      };
    } catch (err) {
      console.error('Failed to create Base subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady, networkConfig]);

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
      console.log('Cancelling Base subscription:', subscriptionId);

      // Note: The current Base Account SDK doesn't seem to have a cancel function
      // You may need to implement this through direct contract interaction
      // or wait for the SDK to add this functionality
      throw new Error('Cancel subscription functionality not yet implemented in Base Account SDK');
    } catch (err) {
      console.error('Failed to cancel Base subscription:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, smartAccountClient, smartAccountReady]);

  const getSubscriptionStatus = useCallback(async (subscriptionId: string) => {
    try {
      console.log('Getting Base subscription status:', subscriptionId);

      // Use Base Account SDK to get subscription status (mainnet)
      const status = await getBaseSubscriptionStatus({ 
        id: subscriptionId
        // testnet defaults to false for mainnet
      });

      console.log('Base subscription status:', status);
      return status;
    } catch (err) {
      console.error('Failed to get Base subscription status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get subscription status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

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
      if (!smartAccountClient.account) {
        throw new Error('Smart account not available');
      }

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
      console.log('Preparing charge for subscription:', subscriptionId);

      // Use Base Account SDK to prepare charge (for backend processing, mainnet)
      const chargeData = await basePrepareCharge({ 
        id: subscriptionId,
        amount: 'max-remaining-charge' // Charge the maximum remaining amount
        // testnet defaults to false for mainnet
      });

      console.log('Charge prepared successfully:', chargeData);
      return chargeData;
    } catch (err) {
      console.error('Failed to prepare charge:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare charge';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

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
  };
};