// Simple wallet connection component using Privy
import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Wallet, LogOut, User, Mail } from 'lucide-react';
import { useWalletUser } from '@/hooks/useWalletUser';
import { BudgetWalletCreationStatus } from './BudgetWalletCreationProgress';
import { useAnalytics } from '@/hooks/useAnalytics';

export function WalletConnection() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { 
    isCreatingBudgetWallet, 
    budgetWalletCreationStep, 
    retryWalletCreation
  } = useWalletUser();
  const { track } = useAnalytics();

  if (!ready) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <button
        data-tour="wallet-connect"
        onClick={() => {
          track('wallet_connect_clicked');
          login();
        }}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* User Info */}
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <User className="h-4 w-4" />
        <span>
          {user?.wallet?.address && 
            `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
          }
        </span>
        {user?.email?.address && (
          <>
            <span className="text-gray-400">•</span>
            <Mail className="h-4 w-4" />
            <span>{user.email.address}</span>
          </>
        )}
      </div>

      {/* Budget Wallet Creation Status */}
      <BudgetWalletCreationStatus 
        isCreating={isCreatingBudgetWallet}
        step={budgetWalletCreationStep}
        onRetry={retryWalletCreation}
      />

      {/* Logout Button */}
      <button
        onClick={() => {
          track('wallet_disconnect_clicked');
          logout();
        }}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <LogOut className="h-4 w-4 mr-1" />
        Logout
      </button>
    </div>
  );
}

// Optional: Minimal connection status indicator
export function WalletStatus() {
  const { ready, authenticated } = usePrivy();

  if (!ready) {
    return <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse"></div>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${authenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className="text-xs text-gray-500">
        {authenticated ? 'Connected' : 'Not connected'}
      </span>
    </div>
  );
}