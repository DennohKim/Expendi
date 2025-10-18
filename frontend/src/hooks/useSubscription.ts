import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  Subscription,
  SubscriptionListResponse,
  CreateSubscriptionData,
  UpdateSubscriptionData,
  SubscriptionFilters,
  SubscriptionStatusResponse,
  SubscriptionTransaction,
} from '@/types/subscription';

export const useSubscription = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeRequest = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const url = `/api/subscriptions${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': address, // Use wallet address as user ID
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }, [address]);

  const createSubscription = useCallback(async (data: CreateSubscriptionData): Promise<Subscription> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeRequest('', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return response.data.subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const getSubscriptions = useCallback(async (filters: SubscriptionFilters = {}): Promise<SubscriptionListResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const endpoint = queryString ? `?${queryString}` : '';

      const response = await makeRequest(endpoint);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscriptions';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const getSubscription = useCallback(async (id: string): Promise<Subscription> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeRequest(`/${id}`);
      return response.data.subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const updateSubscription = useCallback(async (
    id: string,
    data: UpdateSubscriptionData
  ): Promise<Subscription> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeRequest(`/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      return response.data.subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const pauseSubscription = useCallback(async (id: string): Promise<Subscription> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeRequest(`/${id}/pause`, {
        method: 'POST',
      });

      return response.data.subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const resumeSubscription = useCallback(async (id: string): Promise<Subscription> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeRequest(`/${id}/resume`, {
        method: 'POST',
      });

      return response.data.subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const cancelSubscription = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await makeRequest(`/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const getSubscriptionStatus = useCallback(async (id: string): Promise<SubscriptionStatusResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeRequest(`/${id}/status`);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get subscription status';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const getTransactionHistory = useCallback(async (id: string): Promise<SubscriptionTransaction[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeRequest(`/${id}/transactions`);
      return response.data.transactions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get transaction history';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  return {
    createSubscription,
    getSubscriptions,
    getSubscription,
    updateSubscription,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    getSubscriptionStatus,
    getTransactionHistory,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};