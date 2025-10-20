// Mock implementation for when TanStack Query is not installed
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useQueueStatus(refetchInterval?: number) {
  console.warn('TanStack Query is not installed. Install it with: npm install @tanstack/react-query');
  
  return {
    data: null,
    isLoading: false,
    error: null,
    refetch: () => console.log('Mock refetch'),
  };
}

export function useUserSubscriptions(userAddress?: string) {
  console.warn('TanStack Query is not installed. Install it with: npm install @tanstack/react-query');
  
  return {
    data: [],
    isLoading: false,
    error: null,
    refetch: () => console.log('Mock refetch'),
  };
}

export function useSubscription(subscriptionId?: string) {
  console.warn('TanStack Query is not installed. Install it with: npm install @tanstack/react-query');
  
  return {
    data: null,
    isLoading: false,
    error: null,
    refetch: () => console.log('Mock refetch'),
  };
}

export function useSubscriptionTransactions(subscriptionId?: string) {
  console.warn('TanStack Query is not installed. Install it with: npm install @tanstack/react-query');
  
  return {
    data: [],
    isLoading: false,
    error: null,
    refetch: () => console.log('Mock refetch'),
  };
}

export function useCreateSubscription() {
  const { toast } = useToast();
  
  return {
    mutate: () => {
      toast({
        title: "Mock Mode",
        description: "Install TanStack Query to use real functionality",
        variant: "destructive",
      });
    },
    mutateAsync: async () => {
      throw new Error('TanStack Query not installed');
    },
    isPending: false,
    error: null,
  };
}

export function usePauseSubscription() {
  const { toast } = useToast();
  
  return {
    mutate: () => {
      toast({
        title: "Mock Mode",
        description: "Install TanStack Query to use real functionality",
        variant: "destructive",
      });
    },
    mutateAsync: async () => {
      throw new Error('TanStack Query not installed');
    },
    isPending: false,
    error: null,
  };
}

export function useResumeSubscription() {
  const { toast } = useToast();
  
  return {
    mutate: () => {
      toast({
        title: "Mock Mode",
        description: "Install TanStack Query to use real functionality",
        variant: "destructive",
      });
    },
    mutateAsync: async () => {
      throw new Error('TanStack Query not installed');
    },
    isPending: false,
    error: null,
  };
}

export function useCancelSubscription() {
  const { toast } = useToast();
  
  return {
    mutate: () => {
      toast({
        title: "Mock Mode",
        description: "Install TanStack Query to use real functionality",
        variant: "destructive",
      });
    },
    mutateAsync: async () => {
      throw new Error('TanStack Query not installed');
    },
    isPending: false,
    error: null,
  };
}

export function useSubscriptionOperations() {
  const create = useCreateSubscription();
  const pause = usePauseSubscription();
  const resume = useResumeSubscription();
  const cancel = useCancelSubscription();

  return {
    create: {
      mutate: create.mutate,
      mutateAsync: create.mutateAsync,
      isLoading: create.isPending,
      error: create.error,
    },
    pause: {
      mutate: pause.mutate,
      mutateAsync: pause.mutateAsync,
      isLoading: pause.isPending,
      error: pause.error,
    },
    resume: {
      mutate: resume.mutate,
      mutateAsync: resume.mutateAsync,
      isLoading: resume.isPending,
      error: resume.error,
    },
    cancel: {
      mutate: cancel.mutate,
      mutateAsync: cancel.mutateAsync,
      isLoading: cancel.isPending,
      error: cancel.error,
    },
    isLoading: false,
  };
}

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