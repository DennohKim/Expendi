"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useHasBudgetWallet } from '@/hooks/useHasBudgetWallet';
import { useWalletCreationPolling } from '@/hooks/useWalletCreationPolling';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { Loader2 } from 'lucide-react';
import { usePrivy, useMfaEnrollment } from '@privy-io/react-auth';
import { useBudgetWalletStore } from '@/store/budgetWalletStore';

interface EnhancedOnboardingGatewayProps {
  children: React.ReactNode;
  requireMFA?: boolean; // Optional: make MFA required for certain routes
}

export function EnhancedOnboardingGateway({ 
  children, 
  requireMFA = false 
}: EnhancedOnboardingGatewayProps) {
  const { address: eoaAddress, isConnected } = useAccount();
  const { smartAccountClient } = useSmartAccount();
  const { hasBudgetWallet, isLoading, refreshWalletCheck } = useHasBudgetWallet();
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, user } = usePrivy();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const { setWalletStatus } = useBudgetWalletStore();

  // Check if user has MFA enabled through Privy
  const userHasMfa = user?.mfaMethods && user.mfaMethods.length > 0;

  // Redirect unauthenticated users to onboarding
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

  // Update cache when wallet status changes from false to true (wallet created)
  useEffect(() => {
    if (hasBudgetWallet === true && pollingAddress) {
      console.log('📦 Updating cache: wallet created for address', pollingAddress);
      setWalletStatus(pollingAddress, true);
    }
  }, [hasBudgetWallet, pollingAddress, setWalletStatus]);

  const isOnboardingPage = pathname === '/onboarding';

  // Debug logging
  useEffect(() => {
    console.log('🔒 EnhancedOnboardingGateway State:', {
      pathname,
      authenticated,
      isConnected,
      userHasMfa,
      hasBudgetWallet,
      isLoading,
      requireMFA,
      isPolling,
      userMfaMethods: user?.mfaMethods
    });
  }, [pathname, authenticated, isConnected, userHasMfa, hasBudgetWallet, isLoading, requireMFA, isPolling, user?.mfaMethods]);

  // Show MFA enrollment modal when user is authenticated but doesn't have MFA
  useEffect(() => {
    if (authenticated && requireMFA && !userHasMfa && isOnboardingPage) {
      console.log('🔒 Showing Privy MFA enrollment modal...');
      showMfaEnrollmentModal();
    }
  }, [authenticated, requireMFA, userHasMfa, isOnboardingPage, showMfaEnrollmentModal]);

  useEffect(() => {
    // Don't redirect if wallet creation is in progress (polling)
    if (isPolling) {
      return;
    }

    // For authenticated users
    if (authenticated) {
      console.log('🔒 Authenticated user flow check...');
      
      // Check wallet status if MFA is not required or already completed
      if (!requireMFA || userHasMfa) {
        console.log('🔒 Checking wallet status...');
        
        // For wallet checks, we need wagmi connection
        if (isConnected) {
          // Wait for wallet check to complete
          if (isLoading || hasBudgetWallet === null) {
            console.log('🔒 Waiting for wallet check...');
            return;
          }

          // If no budget wallet and not on onboarding page, redirect to onboarding
          if (!hasBudgetWallet && !isOnboardingPage) {
            console.log('🔒 No budget wallet, redirecting to onboarding...');
            router.push('/onboarding');
            return;
          }

          // If has budget wallet and on onboarding page, redirect to dashboard
          if (hasBudgetWallet && isOnboardingPage) {
            console.log('🔒 Budget wallet exists, redirecting to dashboard...');
            router.push('/');
            return;
          }
        } else {
          // If authenticated but not connected, and on onboarding page, that's fine
          // The onboarding page will handle wallet connection
          console.log('🔒 Authenticated but not connected - staying on onboarding page');
        }
      } else {
        console.log('🔒 MFA required but not set up - staying on onboarding for MFA modal');
      }
    }
  }, [
    authenticated,
    isConnected, 
    hasBudgetWallet, 
    isLoading, 
    isOnboardingPage,
    isPolling, 
    router, 
    requireMFA, 
    userHasMfa
  ]);

  // Show loading spinner while checking wallet status
  if (isConnected && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Checking your account...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting (only for actual redirects)
  const shouldShowRedirectLoader = authenticated && isConnected && !isLoading && hasBudgetWallet !== null && (
    (!hasBudgetWallet && !isOnboardingPage) ||
    (hasBudgetWallet && isOnboardingPage)
  );

  if (shouldShowRedirectLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Redirecting...</p>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}