"use client";

import React, { useState } from 'react';
import { useUserBudgetWallet } from '@/hooks/contract-queries/getUserBudgetWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatEther } from 'viem';

const WalletPage = () => {
  const { data, loading, error, refetch } = useUserBudgetWallet();
  const [copied, setCopied] = useState(false);
  console.log("wallet data", data);
  console.log("Query address being used:", data?.queryAddress);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy address');
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance: string | bigint) => {
    if (typeof balance === 'bigint') {
      return parseFloat(formatEther(balance)).toFixed(4);
    }
    return parseFloat(balance).toFixed(4);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Budget Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Loading your budget wallet information...
            </p>
          </div>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Budget Wallet
            </h1>
          </div>
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-destructive">
                  <svg
                    className="mx-auto h-12 w-12 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Error Loading Wallet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  There was an error loading your budget wallet information.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data || !data.hasWallet || !data.address) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Budget Wallet
            </h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-gray-400">
                  <svg
                    className="mx-auto h-12 w-12 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h11M9 21V3m0 0l4-4M9 3L5 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  No Budget Wallet Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have a budget wallet yet. Create one to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Budget Wallet
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your budget wallet and view balance information
          </p>
        </div>

        {/* Wallet Information Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Wallet Details
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetch()}
              className="h-8 w-8"
              title="Refresh wallet data"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
              </svg>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Wallet Address
                </span>
                <Badge variant="secondary" className="text-xs">
                  Budget Wallet
                </Badge>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white">
                  {data.address}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(data.address!)}
                  className="shrink-0"
                >
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                  <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            {/* Balance Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Current Balance
              </span>
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatBalance(data.totalBalance)} ETH
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Available for budgeting
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => copyToClipboard(data.address!)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Copy Address
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => refetch()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
                </svg>
                Refresh
              </Button>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Unallocated
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatBalance(data.unallocatedBalance)} ETH
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Wallet Status
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  Active
                </p>
              </div>
            </div>

            {/* Debug Info */}
            {data?.queryAddress && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Query Address (for debugging):</span>
                  <div className="font-mono text-xs text-gray-700 dark:text-gray-300 mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    {data.queryAddress}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {data.queryAddress.length > 42 ? 'Smart Account' : 'EOA'} address being used for queries
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Contract:</span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Budget Wallet
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Network:</span>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Base Sepolia
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalletPage;
