// Privy providers for wallet connection and Wagmi integration
'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi-config';
import { privyConfig } from './config';
import { useEffect } from 'react';
import { setupConsoleFilters } from '../utils/console-filter';
import { PrivyErrorBoundary, DefaultPrivyFallback } from './ErrorBoundary';

const queryClient = new QueryClient();

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Setup console filters for development warnings
  useEffect(() => {
    setupConsoleFilters();
  }, []);

  // Check if Privy app ID is configured
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  if (!privyAppId) {
    console.error('NEXT_PUBLIC_PRIVY_APP_ID is not configured. Please set this environment variable.');
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-red-200">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-gray-700 mb-4">
            Privy is not configured. Please set the following environment variable:
          </p>
          <code className="bg-gray-100 px-4 py-2 rounded text-sm">
            NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
          </code>
          <p className="text-sm text-gray-500 mt-4">
            Get your Privy App ID from{' '}
            <a href="https://privy.io" className="text-blue-600 hover:underline">
              privy.io
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <PrivyErrorBoundary fallback={DefaultPrivyFallback}>
      <PrivyProvider
        appId={privyAppId}
        config={privyConfig}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config} reconnectOnMount={false}>
            {children}
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </PrivyErrorBoundary>
  );
}