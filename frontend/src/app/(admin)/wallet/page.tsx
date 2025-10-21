"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { useBalance, useAccount } from 'wagmi';
import { getNetworkConfig } from '@/lib/contracts/config';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { formatAddress } from '@/lib/utils';
import { useUserBuckets } from '@/hooks/subgraph-queries/getUserBuckets';

const WalletPage = () => {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  const [copied, setCopied] = useState(false);
  
  // Use smart account address if available, fallback to EOA
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress;
  const displayAddress = smartAccountAddress || eoaAddress;
  
  // Get user buckets for balance calculations
  const { data: bucketsData, loading, error } = useUserBuckets(queryAddress);

  
  // Get network configuration (Base mainnet only)
  const networkConfig = getNetworkConfig();
  const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;

  // Get user's USDC balance from their smart account wallet
  const { data: walletBalance, isLoading: walletBalanceLoading, refetch: refetchWalletBalance } = useBalance({
    address: queryAddress,
    token: usdcAddress,
  });

  // Get buckets data
  const buckets = bucketsData?.user?.buckets || [];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('Failed to copy address: ' + errorMessage);
    }
  };

  const formatBalance = (balance: string | bigint) => {
    if (typeof balance === 'bigint') {
      // USDC has 6 decimals
      const formatted = parseFloat(formatUnits(balance, 6)).toFixed(2);
      return Number(formatted).toLocaleString();
    }
    const formatted = parseFloat(balance).toFixed(2);
    return Number(formatted).toLocaleString();
  };

  // Calculate total balance from buckets (simplified without budget wallet logic)
  const totalBucketBalance = buckets?.reduce((sum: bigint, bucket: { balance?: string }) => {
    return sum + BigInt(bucket.balance || '0');
  }, BigInt(0)) || BigInt(0);

  // Simple refresh function
  const refreshData = () => {
    refetchWalletBalance();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading wallet data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Error Loading Wallet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  There was an error loading your wallet information.
                </p>
                <Button onClick={refreshData} variant="outline">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Smart Account Wallet
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View your smart account balance and manage your buckets
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
              onClick={refreshData}
              className="h-8 w-8"
              title="Refresh wallet data"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
              </svg>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Smart Account Address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Smart Account Address
                </span>
                <Badge variant="primary" className="text-sm">
                  USDC on Base
                </Badge>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white">
                  {displayAddress ? formatAddress(displayAddress) : 'Not connected'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(displayAddress || '')}
                  className="shrink-0"
                  disabled={!displayAddress}
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
            <div className="space-y-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Balance Overview
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Smart Account Balance */}
                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Smart Account Balance
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {walletBalanceLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      `${walletBalance ? formatBalance(walletBalance.value) : '0.00'} USDC`
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Available balance
                  </div>
                </div>
                
                {/* Total Bucket Balance */}
                <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Total in Buckets
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {formatBalance(totalBucketBalance)} USDC
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Organized in buckets
                  </div>
                </div>
              </div>
            </div>

            {/* Bucket Summary */}
            {buckets.length > 0 && (
              <div className="space-y-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Bucket Summary
                </span>
                <div className="grid grid-cols-1 gap-3">
                  {buckets.slice(0, 3).map((bucket: { id: string; name: string; balance: string }) => (
                    <div key={bucket.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {bucket.name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatBalance(bucket.balance)} USDC
                      </span>
                    </div>
                  ))}
                  {buckets.length > 3 && (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      ... and {buckets.length - 3} more buckets
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalletPage;
