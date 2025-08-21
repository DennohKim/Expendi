"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, Activity, Send, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { useUserBuckets } from '@/hooks/subgraph-queries/getUserBuckets';
import { QuickSpendBucket } from '@/components/buckets/QuickSpendBucket';

interface TokenBalance {
  id: string;
  balance: string;
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface Bucket {
  id: string;
  name: string;
  balance: string;
  monthlyLimit: string;
  monthlySpent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tokenBalances: TokenBalance[];
}

interface Transaction {
  id: string;
  amount: string;
  timestamp: string;
  type?: string;
  recipient?: string;
  bucket: {
    id: string;
    name: string;
  };
  token: {
    id: string;
    symbol: string;
  };
}

export default function BucketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const bucketId = params.id as string;
  
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  
  const queryAddress = React.useMemo(() => 
    smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress,
    [smartAccountReady, smartAccountAddress, eoaAddress]
  );

  const { data, loading, error } = useUserBuckets(queryAddress);
  
  // Transfer state
  const [transferAmount, setTransferAmount] = React.useState('');
  const [targetBucketId, setTargetBucketId] = React.useState('');
  
  const bucket = React.useMemo(() => {
    if (!data?.user?.buckets) return null;
    return data.user.buckets.find((b: Bucket) => b.id === bucketId);
  }, [data, bucketId]);

  const transactions = React.useMemo(() => {
    if (!data?.user) return [];
    
    const deposits = (data.user.deposits || []).filter((d: Transaction) => d.bucket.id === bucketId);
    const withdrawals = (data.user.withdrawals || []).filter((w: Transaction) => w.bucket.id === bucketId);
    
    return [...deposits, ...withdrawals]
      .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
      .slice(0, 10); // Show latest 10 transactions
  }, [data, bucketId]);

  const otherBuckets = React.useMemo(() => {
    if (!data?.user?.buckets) return [];
    return data.user.buckets.filter((b: Bucket) => b.id !== bucketId && b.active);
  }, [data, bucketId]);

  const calculations = React.useMemo(() => {
    if (!bucket) return null;
    
    const limitInTokens = parseFloat(bucket.monthlyLimit) / 1e6;
    const spentInTokens = parseFloat(bucket.monthlySpent) / 1e6;
    const spentPercentage = limitInTokens > 0 ? (spentInTokens / limitInTokens) * 100 : 0;
    
    const totalTokenBalanceRaw = bucket.tokenBalances.reduce((total: bigint, tokenBalance: TokenBalance) => {
      const balance = BigInt(tokenBalance.balance);
      return total + balance;
    }, BigInt(0));

    const availableBalance = formatUnits(totalTokenBalanceRaw, 6);
    const remainingBudget = Math.max(0, limitInTokens - spentInTokens);

    return {
      limitInTokens,
      spentInTokens,
      spentPercentage,
      totalTokenBalanceRaw,
      availableBalance,
      remainingBudget
    };
  }, [bucket]);

  const formatTokenAmount = React.useCallback((amount: number) => {
    return amount.toFixed(2).replace(/\.?0+$/, '');
  }, []);

  const formatDate = React.useCallback((timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const handleTransfer = React.useCallback(async () => {
    if (!transferAmount || !targetBucketId || !bucket) {
      return;
    }

    try {
      // Convert amount to proper units (USDC has 6 decimals)
      const amountInUnits = parseFloat(transferAmount) * 1e6;
      const availableBalance = parseFloat(calculations?.availableBalance || '0');
      
      if (parseFloat(transferAmount) > availableBalance) {
        alert('Insufficient balance for transfer');
        return;
      }

      // TODO: Implement actual transfer logic using smart contracts
      // This would involve calling the bucket contract to transfer funds
      console.log('Transfer:', {
        from: bucket.id,
        to: targetBucketId,
        amount: amountInUnits
      });

      // Reset form
      setTransferAmount('');
      setTargetBucketId('');
      
      // Show success message (replace with proper toast)
      alert('Transfer initiated successfully!');
      
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed. Please try again.');
    }
  }, [transferAmount, targetBucketId, bucket, calculations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading bucket details...</div>
      </div>
    );
  }

  if (error || !bucket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-lg text-red-600">
          {error ? 'Error loading bucket' : 'Bucket not found'}
        </div>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!calculations) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {bucket.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Bucket Details</p>
          </div>
        </div>
        <div className='flex gap-2'>
          <Button variant="outline">Update Bucket</Button>
          <Button variant="destructive">Delete Bucket</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bucket Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Budget Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Monthly Spending Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Spending</span>
                  <span>
                    {formatTokenAmount(calculations.spentInTokens)} / {formatTokenAmount(calculations.limitInTokens)} USDC
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      calculations.spentPercentage > 90 ? "bg-red-500" : 
                      calculations.spentPercentage > 70 ? "bg-yellow-500" : 
                      "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(calculations.spentPercentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {calculations.spentPercentage.toFixed(1)}% used
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {calculations.availableBalance}
                  </div>
                  <div className="text-sm text-muted-foreground">Available Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatTokenAmount(calculations.remainingBudget)}
                  </div>
                  <div className="text-sm text-muted-foreground">Remaining Budget</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for this bucket
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          'recipient' in transaction ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          {'recipient' in transaction ? (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {'recipient' in transaction ? 'Withdrawal' : 'Deposit'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(transaction.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          'recipient' in transaction ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {'recipient' in transaction ? '-' : '+'}
                          {formatUnits(BigInt(transaction.amount), 6)} USDC
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="spend" className="w-full">
                <TabsList className="grid w-fit grid-cols-2 mx-4 mb-2">
                  <TabsTrigger value="spend" className="flex items-center gap-2">
                    Spend
                  </TabsTrigger>
                  <TabsTrigger value="transfer" className="flex items-center gap-2">
                    Transfer
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="spend" className="px-4 pb-4">
                  <div className="space-y-4">
                    <QuickSpendBucket bucket={[bucket]} />
                  </div>
                </TabsContent>
                
                <TabsContent value="transfer" className="px-4 pb-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="transfer-amount">Amount (USDC)</Label>
                      <Input
                        id="transfer-amount"
                        type="number"
                        placeholder="0.00"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        max={calculations?.availableBalance}
                        step="0.01"
                      />
                      <p className="text-sm text-muted-foreground">
                        Available: {calculations?.availableBalance} USDC
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="target-bucket">Transfer to Bucket</Label>
                      <Select value={targetBucketId} onValueChange={setTargetBucketId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination bucket" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherBuckets.map((otherBucket: Bucket) => {
                            const otherCalculations = {
                              totalTokenBalanceRaw: otherBucket.tokenBalances.reduce((total, tokenBalance) => {
                                const balance = BigInt(tokenBalance.balance);
                                return total + balance;
                              }, BigInt(0))
                            };
                            const otherAvailableBalance = formatUnits(otherCalculations.totalTokenBalanceRaw, 6);
                            
                            return (
                              <SelectItem key={otherBucket.id} value={otherBucket.id}>
                                <div className="flex justify-between w-full">
                                  <span>{otherBucket.name}</span>
                                  <span className="text-muted-foreground text-sm">
                                    {otherAvailableBalance} USDC
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {otherBuckets.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No other active buckets available for transfer
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleTransfer}
                      className="w-full"
                      variant="primary"
                      disabled={!transferAmount || !targetBucketId || parseFloat(transferAmount) <= 0}
                    >
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Transfer Funds
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Bucket Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Bucket Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(bucket.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{formatDate(bucket.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={bucket.active ? "success" : "secondary"}>
                  {bucket.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}