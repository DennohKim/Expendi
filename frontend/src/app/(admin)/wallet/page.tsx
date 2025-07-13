"use client";

import React, { useState } from 'react';
import { useUserBudgetWallet } from '@/hooks/contract-queries/getUserBudgetWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatEther, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { useBalance, useAccount } from 'wagmi';
import { MOCK_USDC_ADDRESS, BUDGET_WALLET_ABI } from '@/lib/contracts/budget-wallet';
import { useSmartAccount } from '@/context/SmartAccountContext';

const WalletPage = () => {
  const { data, loading, error, refetch } = useUserBudgetWallet();
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const { smartAccountClient } = useSmartAccount();
  
  // Use smart account address if available, fallback to EOA
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress;
  
  // Get user's MockUSDC balance from their smart account wallet
  const { data: walletBalance, isLoading: walletBalanceLoading, refetch: refetchWalletBalance } = useBalance({
    address: queryAddress,
    token: MOCK_USDC_ADDRESS,
  });
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
      // MockUSDC has 6 decimals
      const formatted = parseFloat(formatUnits(balance, 6)).toFixed(2);
      return Number(formatted).toLocaleString();
    }
    const formatted = parseFloat(balance).toFixed(2);
    return Number(formatted).toLocaleString();
  };

  // Calculate allocated balance (total - unallocated)
  const allocatedBalance = data ? data.totalBalance - data.unallocatedBalance : BigInt(0);
  
  // Debug logging
  console.log("🔍 Balance Debug:", {
    totalBalance: data?.totalBalance?.toString(),
    unallocatedBalance: data?.unallocatedBalance?.toString(),
    allocatedBalance: allocatedBalance.toString(),
    hasData: !!data
  });

  // Handle the complete deposit process using smart account batch transaction
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!data?.address) {
      toast.error('Budget wallet not found');
      return;
    }

    if (!smartAccountClient?.account) {
      toast.error('Smart account not available for gas sponsorship');
      return;
    }

    const amount = parseUnits(depositAmount, 6); // USDC has 6 decimals

    // Check if user has sufficient balance
    if (!walletBalance || walletBalance.value < amount) {
      const currentBalance = walletBalance ? formatBalance(walletBalance.value) : '0.00';
      const neededAmount = formatBalance(amount);
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
        args: [data.address as `0x${string}`, amount],
      });

      // Encode deposit function call
      const depositCallData = encodeFunctionData({
        abi: BUDGET_WALLET_ABI,
        functionName: 'depositToken',
        args: [MOCK_USDC_ADDRESS, amount],
      });

      // Create batch calls array
      const batchCalls = [
        {
          to: MOCK_USDC_ADDRESS,
          data: approveCallData,
        },
        {
          to: data.address as `0x${string}`,
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
      setDepositAmount('');
      setIsDepositDialogOpen(false);
      
      // Refresh balances after confirmation
      refetch();
      refetchWalletBalance();
      
    } catch (error: any) {
      console.error('Batch deposit process failed:', error);
      
      // Enhanced error handling
      if (error.message?.includes('User rejected') || 
          error.message?.includes('rejected') ||
          error.message?.includes('User exited') ||
          error.message?.includes('user rejected')) {
        toast.error('Transaction was cancelled by user');
      } else if (error.message?.includes('timeout') || 
                 error.message?.includes('timed out')) {
        toast.error('Transaction is taking longer than expected. Please check your wallet or try again.');
        // Still try to refresh in case it went through
        setTimeout(() => {
          refetch();
          refetchWalletBalance();
        }, 5000);
      } else if (error.message?.includes('0xe450d38c') || 
                 error.message?.includes('ERC20InsufficientBalance') ||
                 error.message?.includes('insufficient funds') || 
                 error.message?.includes('insufficient balance')) {
        toast.error('Insufficient USDC balance in your smart account for this deposit');
      } else {
        toast.error('Batch transaction failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsApproving(false);
      setIsDepositing(false);
    }
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
                  {smartAccountAddress || eoaAddress || 'Not connected'}
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
              
              {/* Budget Wallet Balance */}
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Budget Wallet Balance
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatBalance(data.totalBalance)} USDC
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

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => copyToClipboard(data.address!)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Copy
              </Button>
              
              <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default" 
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
                        onClick={handleDeposit}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Unallocated
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatBalance(data.unallocatedBalance)} USDC
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
    </div>
  );
};

export default WalletPage;
