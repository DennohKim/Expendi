"use client";

import React, { useState } from 'react';
import { useUserBudgetWallet } from '@/hooks/subgraph-queries/useUserBudgetWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {  formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { useBalance, useAccount } from 'wagmi';
import { BUDGET_WALLET_ABI } from '@/lib/contracts/budget-wallet';
import { getNetworkConfig } from '@/lib/contracts/config';
import { useSmartAccount } from '@/context/SmartAccountContext';
import AllocateFunds from '@/components/wallet/AllocateFunds';
import WalletPageSkeleton from '@/components/wallet/WalletPageSkeleton';
import { formatAddress } from '@/lib/utils';

interface Bucket {
  name: string;
  tokenBalances?: Array<{ balance: string }>;
}

const WalletPage = () => {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const { smartAccountClient } = useSmartAccount();
  
  // Use smart account address if available, fallback to EOA
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress;
  const displayAddress = smartAccountAddress || eoaAddress;
  
  const { data, loading, error, refetch } = useUserBudgetWallet(queryAddress);
  console.log("Wallet data", data?.user?.walletsCreated[0].wallet)

  // Get network configuration (Base mainnet only)
  const networkConfig = getNetworkConfig();
  const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;

  // DEBUG: Log current network and addresses
  console.log("🔍 DEBUG Network Info:", {
    networkName: networkConfig.NETWORK_NAME,
    usdcAddress,
    subgraphUrl: networkConfig.SUBGRAPH_URL
  });

  // Get user's USDC balance from their smart account wallet
  const { data: walletBalance, isLoading: walletBalanceLoading, refetch: refetchWalletBalance } = useBalance({
    address: queryAddress,
    token: usdcAddress,
  });
  console.log("Query address being used:", data?.queryAddress);

  console.log("Wallet balance:", walletBalance);

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
      // MockUSDC has 6 decimals
      const formatted = parseFloat(formatUnits(balance, 6)).toFixed(2);
      return Number(formatted).toLocaleString();
    }
    const formatted = parseFloat(balance).toFixed(2);
    return Number(formatted).toLocaleString();
  };

  // Calculate allocated balance (total - unallocated) - using user data structure
  const userData = data?.user;
  console.log("User data:", userData)
  
  // Calculate allocated balance from all token balances in buckets except UNALLOCATED
  const allocatedBalance = userData?.buckets?.reduce((sum: bigint, bucket: Bucket) => {
    if (bucket.name !== 'UNALLOCATED') {
      // Sum all token balances in this bucket
      const bucketTokenBalance = bucket.tokenBalances?.reduce((tokenSum: bigint, tokenBalance: { balance: string }) => {
        return tokenSum + BigInt(tokenBalance.balance || '0');
      }, BigInt(0)) || BigInt(0);
      return sum + bucketTokenBalance;
    }
    return sum;
  }, BigInt(0)) || BigInt(0);
  
  // Calculate unallocated balance from UNALLOCATED bucket
  const unallocatedBalance = userData?.buckets?.find((bucket: Bucket) => bucket.name === 'UNALLOCATED')?.tokenBalances?.reduce((sum: bigint, tokenBalance: { balance: string }) => {
    return sum + BigInt(tokenBalance.balance || '0');
  }, BigInt(0)) || BigInt(0);
  
  // Calculate actual total balance as sum of all bucket balances
  const actualTotalBalance = allocatedBalance + unallocatedBalance;
  
  // Debug logging
  console.log("🔍 Balance Debug:", {
    originalTotalBalance: userData?.totalBalance?.toString(),
    actualTotalBalance: actualTotalBalance.toString(),
    unallocatedBalance: unallocatedBalance.toString(),
    allocatedBalance: allocatedBalance.toString(),
    hasData: !!userData,
    walletsCreated: userData?.walletsCreated?.length,
    allBuckets: userData?.buckets?.map((b: Bucket) => ({ name: b.name, tokenBalances: b.tokenBalances })),
    unallocatedBucket: userData?.buckets?.find((bucket: Bucket) => bucket.name === 'UNALLOCATED')
  });

  // Handle the complete deposit process using smart account batch transaction
  const handleDeposit = async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!userData?.walletsCreated?.[0]?.wallet) {
      toast.error('Budget wallet not found');
      return;
    }

    if (!smartAccountClient?.account) {
      toast.error('Smart account not available for gas sponsorship');
      return;
    }

    const parsedAmount = parseUnits(amount, 6); // USDC has 6 decimals

    // Check if user has sufficient balance
    if (!walletBalance || walletBalance.value < parsedAmount) {
      const currentBalance = walletBalance ? formatBalance(walletBalance.value) : '0.00';
      const neededAmount = formatBalance(parsedAmount);
      toast.error(`Insufficient USDC balance. You have ${currentBalance} USDC but need ${neededAmount} USDC`);
      return;
    }

    try {
      setIsDepositing(true);
      
      // Create batch transaction for approve + deposit (one signature)
      toast.info('Processing approve and deposit in single transaction...');
      console.log('🚀 Batch Deposit: Using smart account batch call for approve + deposit');
      
      // Encode approve function call
      const approveCallData = encodeFunctionData({
        abi: [
          {
            inputs: [
              { internalType: 'address', name: 'spender', type: 'address' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' }
            ],
            name: 'approve',
            outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ],
        functionName: 'approve',
        args: [userData?.walletsCreated?.[0]?.wallet as `0x${string}`, parsedAmount],
      });

      // Encode deposit function call
      const depositCallData = encodeFunctionData({
        abi: BUDGET_WALLET_ABI,
        functionName: 'depositToken',
        args: [usdcAddress, parsedAmount],
      });

      // Create batch calls array
      const batchCalls = [
        {
          to: usdcAddress,
          data: approveCallData,
        },
        {
          to: userData?.walletsCreated?.[0]?.wallet as `0x${string}`,
          data: depositCallData,
        }
      ];

      // Execute batch transaction
      const batchHash = await smartAccountClient.sendUserOperation({
        calls: batchCalls,
        account: smartAccountClient.account,
      });
      
      console.log('✅ Batch transaction submitted:', batchHash);
      toast.info('Transaction submitted, waiting for confirmation...');
      
      // Wait for UserOperation to be confirmed on-chain (with 60s timeout)
      const receipt = await smartAccountClient.waitForUserOperationReceipt({
        hash: batchHash,
        timeout: 60_000 // 60 seconds timeout
      });
      
      console.log('✅ UserOperation confirmed:', receipt);
      
      // Success - now balances should be updated
      toast.success('Funds successfully allocated to budget wallet!');
      
      // Refresh balances after confirmation
      setTimeout(() => {
        refetch();
        refetchWalletBalance();
      }, 1000);
      
    } catch (error: unknown) {
      console.error('Batch deposit process failed:', error);
      
      // Enhanced error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('User rejected') || 
          errorMessage.includes('rejected') ||
          errorMessage.includes('User exited') ||
          errorMessage.includes('user rejected')) {
        toast.error('Transaction was cancelled by user');
      } else if (errorMessage.includes('timeout') || 
                 errorMessage.includes('timed out')) {
        toast.error('Transaction is taking longer than expected. Please check your wallet or try again.');
        // Still try to refresh in case it went through
        setTimeout(() => {
          refetch();
          refetchWalletBalance();
        }, 5000);
      } else if (errorMessage.includes('0xe450d38c') || 
                 errorMessage.includes('ERC20InsufficientBalance') ||
                 errorMessage.includes('insufficient funds') || 
                 errorMessage.includes('insufficient balance')) {
        toast.error('Insufficient USDC balance in your smart account for this deposit');
      } else {
        toast.error('Batch transaction failed: ' + (errorMessage || 'Unknown error'));
      }
    } finally {
      setIsDepositing(false);
    }
  };

  // Handle dialog deposit
  const handleDialogDeposit = async () => {
    await handleDeposit(depositAmount);
    setDepositAmount('');
    setIsDepositDialogOpen(false);
  };

  if (loading) {
    return (
      <WalletPageSkeleton />
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Budget Account
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
                  Error Loading Account
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  There was an error loading your budget account information.
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

  if (!data || !userData || !userData.walletsCreated?.[0]?.wallet) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Budget Account
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
                  No Budget Account Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  You don&apos;t have a budget account yet. Create one to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
      <div className="grid grid-cols-12 gap-4 md:gap-6">

         {/* Quick Spend Tab - Above buckets on small/medium, right side on large */}
      <div className="col-span-12 h-auto mb-4 w-full xl:col-span-8 xl:h-[calc(100vh-120px)] xl:mb-0 overflow-y-auto pr-2">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Budget Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your budget account and view balance information
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
              onClick={() => {
                refetch();
                refetchWalletBalance();
              }}
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
                <Badge variant="secondary" className="text-xs">
                  Smart Account
                </Badge>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white">
                  {displayAddress ? formatAddress(displayAddress) : 'Not connected'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(smartAccountAddress || eoaAddress || '')}
                  className="shrink-0"
                  disabled={!smartAccountAddress && !eoaAddress}
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
 {/* Budget Wallet Balance */}
 <div className="text-center p-6 bg-[#ff7e5f]/10 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Budget Account
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatBalance(actualTotalBalance)} USDC
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Available for budgeting
                </div>
              </div>
              
              {/* User Wallet Balance */}
              <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Your Wallet Balance
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {walletBalanceLoading ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    `${walletBalance ? formatBalance(walletBalance.value) : '0.00'} USDC`
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Available to deposit
                </div>
              </div>
              </div>
             
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
             
              
              <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    disabled={!walletBalance || walletBalance.value === BigInt(0)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                      <path d="M12 5v14m7-7H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Deposit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Allocate Funds for Budgeting</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (USDC)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        step="0.01"
                        min="0"
                      />
                      {walletBalance && (
                        <p className="text-sm text-gray-500">
                          Available: {formatBalance(walletBalance.value)} USDC
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsDepositDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        variant="primary"
                        onClick={handleDialogDeposit}
                        disabled={isDepositing || !depositAmount}
                      >
                        {isDepositing ? 'Processing...' : 'Deposit'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  refetch();
                  refetchWalletBalance();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
                </svg>
                Refresh
              </Button>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Unallocated
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatBalance(unallocatedBalance)} USDC
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Allocated
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatBalance(allocatedBalance)} USDC
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
          </CardContent>
        </Card>
      </div>
      
      {/* User Buckets Grid - Below QuickSpend on small/medium, left side on large */}
      <div className="col-span-12 h-[calc(100vh-120px)]  xl:col-span-4">
      <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
           Control Funds 
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Allocate or withdraw funds from your budget account
          </p>
        </div>
        <AllocateFunds 
          walletBalance={walletBalance?.value || BigInt(0)} 
          unallocatedBalance={unallocatedBalance || BigInt(0)}
          handleDeposit={handleDeposit} 
          isDepositing={isDepositing}
          onDepositSuccess={() => {
            // Refresh balances after successful deposit
            setTimeout(() => {
              refetch();
              refetchWalletBalance();
            }, 1000);
          }}
        />
      </div>
        
      </div>

  );
};

export default WalletPage;
