"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useHasBudgetWallet } from '@/hooks/useHasBudgetWallet';
import { useWalletCreationPolling } from '@/hooks/useWalletCreationPolling';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { Loader2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

interface OnboardingGatewayProps {
  children: React.ReactNode;
}

export function OnboardingGateway({ children }: OnboardingGatewayProps) {
  const { address: eoaAddress, isConnected } = useAccount();
  const { smartAccountClient } = useSmartAccount();
  const { hasBudgetWallet, isLoading, refreshWalletCheck } = useHasBudgetWallet();
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated } = usePrivy();

  useEffect(() => {
    if (!authenticated) {
      router.push('/onboarding');
    }
  }, [authenticated, router]);

  // Use smart account address for polling if available, otherwise EOA address
  const pollingAddress = smartAccountClient?.account?.address || eoaAddress;
  const { isPolling } = useWalletCreationPolling(pollingAddress);

  // Add a polling completion handler to refresh wallet check
  const [wasPolling, setWasPolling] = useState(false);
  
  useEffect(() => {
    if (wasPolling && !isPolling) {
      // Polling just completed, refresh wallet check after a short delay
      console.log('Polling completed, refreshing wallet check...');
      setTimeout(() => {
        refreshWalletCheck();
      }, 1000);
    }
    setWasPolling(isPolling);
  }, [isPolling, wasPolling, refreshWalletCheck]);

  const isOnboardingPage = pathname === '/onboarding';

  useEffect(() => {
    // Only proceed if wallet is connected and we have wallet check results
    if (!isConnected || isLoading || hasBudgetWallet === null) {
      return;
    }

    // Don't redirect if wallet creation is in progress (polling)
    if (isPolling) {
      return;
    }

    // If user doesn't have a budget wallet and is not on onboarding page, redirect to onboarding
    if (!hasBudgetWallet && !isOnboardingPage) {
      router.push('/onboarding');
      return;
    }

    // If user has a budget wallet but is on onboarding page, redirect to main dashboard
    if (hasBudgetWallet && isOnboardingPage) {
      router.push('/');
      return;
    }
  }, [isConnected, hasBudgetWallet, isLoading, isOnboardingPage, isPolling, router]);

  // Show loading spinner while checking wallet status
  if (isConnected && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Checking your budget account...</p>
        </div>
      </div>
    );
  }

  // If not connected, let the normal auth flow handle this
  if (!isConnected) {
    return <>{children}</>;
  }

  // If user doesn't have a wallet and not on onboarding page, don't render children
  // (they'll be redirected to onboarding)
  if (!hasBudgetWallet && !isOnboardingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  // If user has a wallet and is on onboarding page, don't render children
  // (they'll be redirected to dashboard)
  if (hasBudgetWallet && isOnboardingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}