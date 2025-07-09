// App layout component with Privy providers
'use client';

import React from 'react';
import { Providers } from '@/lib/privy/providers';
import { WalletConnection } from './WalletConnection';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Expendi
                </h1>
              </div>
              <WalletConnection />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-6">
          {children}
        </main>
      </div>
    </Providers>
  );
}

// Optional: Minimal layout for pages that don't need the full header
export function SimpleAppLayout({ children }: AppLayoutProps) {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </Providers>
  );
}