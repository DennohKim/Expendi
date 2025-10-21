'use client';

import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { usePrivy } from '@privy-io/react-auth';

/**
 * Hook to access Privy's smart wallet client
 * This provides access to the smart wallet for sending sponsored transactions
 */
export function useSmartWallet() {
  const { ready: privyReady, authenticated } = usePrivy();
  const smartWallets = useSmartWallets();
  const client = smartWallets.client;

  const isReady = Boolean(privyReady && authenticated && client);

  return {
    client: client as any, // Smart wallet client for sending transactions
    isReady,
    authenticated,
  };
}

