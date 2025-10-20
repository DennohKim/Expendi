import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import SubscriptionAPI, { 
  CreateSubscriptionRequest, 
  SubscriptionResponse,
  QueueStatusResponse 
} from '@/lib/api/subscription-api';

// Query Keys
export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
  list: (userAddress: string) => [...subscriptionKeys.lists(), userAddress] as const,
  details: () => [...subscriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
  queue: () => ['queue'] as const,
  queueStatus: () => [...subscriptionKeys.queue(), 'status'] as const,
  transactions: (id: string) => [...subscriptionKeys.detail(id), 'transactions'] as const,
};

// Hook for queue status with auto-refresh
export function useQueueStatus(refetchInterval = 30000) {
  return useQuery({
    queryKey: subscriptionKeys.queueStatus(),
    queryFn: SubscriptionAPI.getQueueStatus,
    refetchInterval,
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10 seconds
  });
}

// Hook for user subscriptions
export function useUserSubscriptions(userAddress?: string) {
  return useQuery({
    queryKey: subscriptionKeys.list(userAddress || ''),
    queryFn: () => SubscriptionAPI.getUserSubscriptions(userAddress!),
    enabled: !!userAddress,
    refetchOnWindowFocus: true,
    staleTime: 60000, // 1 minute
  });
}

// Hook for single subscription
export function useSubscription(subscriptionId?: string) {
  return useQuery({
    queryKey: subscriptionKeys.detail(subscriptionId || ''),
    queryFn: () => SubscriptionAPI.getSubscription(subscriptionId!),
    enabled: !!subscriptionId,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });
}

// Hook for subscription transactions
export function useSubscriptionTransactions(subscriptionId?: string) {
  return useQuery({
    queryKey: subscriptionKeys.transactions(subscriptionId || ''),
    queryFn: () => SubscriptionAPI.getSubscriptionTransactions(subscriptionId!),
    enabled: !!subscriptionId,
    refetchOnWindowFocus: true,
    staleTime: 60000, // 1 minute
  });
}

// Mutation hooks with optimistic updates
export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: SubscriptionAPI.createSubscription,
    onSuccess: (data, variables) => {
      // Invalidate and refetch user subscriptions
      queryClient.invalidateQueries({ 
        queryKey: subscriptionKeys.list(variables.payerAddress) 
      });
      
      // Add the new subscription to the cache
      queryClient.setQueryData(
        subscriptionKeys.detail(data.id),
        data
      );

      toast({
        title: "Success",
        description: "Subscription created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
    },
  });
}

export function usePauseSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: SubscriptionAPI.pauseSubscription,
    onMutate: async (subscriptionId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: subscriptionKeys.detail(subscriptionId) 
      });

      // Snapshot the previous value
      const previousSubscription = queryClient.getQueryData(
        subscriptionKeys.detail(subscriptionId)
      );

      // Optimistically update to paused status
      queryClient.setQueryData(
        subscriptionKeys.detail(subscriptionId),
        (old: SubscriptionResponse | undefined) => 
          old ? { ...old, status: 'paused' as const } : old
      );

      return { previousSubscription };
    },
    onError: (err, subscriptionId, context) => {
      // Rollback on error
      queryClient.setQueryData(
        subscriptionKeys.detail(subscriptionId),
        context?.previousSubscription
      );
      
      toast({
        title: "Error",
        description: "Failed to pause subscription",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription paused successfully!",
      });
    },
    onSettled: (data, error, subscriptionId) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: subscriptionKeys.detail(subscriptionId) 
      });
    },
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: SubscriptionAPI.resumeSubscription,
    onMutate: async (subscriptionId) => {
      await queryClient.cancelQueries({ 
        queryKey: subscriptionKeys.detail(subscriptionId) 
      });

      const previousSubscription = queryClient.getQueryData(
        subscriptionKeys.detail(subscriptionId)
      );

      queryClient.setQueryData(
        subscriptionKeys.detail(subscriptionId),
        (old: SubscriptionResponse | undefined) => 
          old ? { ...old, status: 'active' as const } : old
      );

      return { previousSubscription };
    },
    onError: (err, subscriptionId, context) => {
      queryClient.setQueryData(
        subscriptionKeys.detail(subscriptionId),
        context?.previousSubscription
      );
      
      toast({
        title: "Error",
        description: "Failed to resume subscription",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription resumed successfully!",
      });
    },
    onSettled: (data, error, subscriptionId) => {
      queryClient.invalidateQueries({ 
        queryKey: subscriptionKeys.detail(subscriptionId) 
      });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: SubscriptionAPI.cancelSubscription,
    onMutate: async (subscriptionId) => {
      await queryClient.cancelQueries({ 
        queryKey: subscriptionKeys.detail(subscriptionId) 
      });

      const previousSubscription = queryClient.getQueryData(
        subscriptionKeys.detail(subscriptionId)
      );

      queryClient.setQueryData(
        subscriptionKeys.detail(subscriptionId),
        (old: SubscriptionResponse | undefined) => 
          old ? { ...old, status: 'cancelled' as const } : old
      );

      return { previousSubscription };
    },
    onError: (err, subscriptionId, context) => {
      queryClient.setQueryData(
        subscriptionKeys.detail(subscriptionId),
        context?.previousSubscription
      );
      
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription cancelled successfully!",
      });
    },
    onSettled: (data, error, subscriptionId) => {
      queryClient.invalidateQueries({ 
        queryKey: subscriptionKeys.detail(subscriptionId) 
      });
      // Also invalidate the user's subscription list
      queryClient.invalidateQueries({ 
        queryKey: subscriptionKeys.lists() 
      });
    },
  });
}

// Combined hook for all subscription operations
export function useSubscriptionOperations() {
  const createMutation = useCreateSubscription();
  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();
  const cancelMutation = useCancelSubscription();

  return {
    create: {
      mutate: createMutation.mutate,
      mutateAsync: createMutation.mutateAsync,
      isLoading: createMutation.isPending,
      error: createMutation.error,
    },
    pause: {
      mutate: pauseMutation.mutate,
      mutateAsync: pauseMutation.mutateAsync,
      isLoading: pauseMutation.isPending,
      error: pauseMutation.error,
    },
    resume: {
      mutate: resumeMutation.mutate,
      mutateAsync: resumeMutation.mutateAsync,
      isLoading: resumeMutation.isPending,
      error: resumeMutation.error,
    },
    cancel: {
      mutate: cancelMutation.mutate,
      mutateAsync: cancelMutation.mutateAsync,
      isLoading: cancelMutation.isPending,
      error: cancelMutation.error,
    },
    isLoading: createMutation.isPending || pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending,
  };
}