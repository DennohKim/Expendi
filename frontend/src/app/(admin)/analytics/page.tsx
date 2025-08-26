"use client";

import React from 'react';
import { useAccount } from 'wagmi';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Activity, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';

// Import the TanStack Query hooks
import { useUserInsights } from '@/hooks/analytics/useUserInsights';
import { useBucketUsage } from '@/hooks/analytics/useBucketUsage';
import { Button } from '@/components/ui/button';
import BucketTimeSeriesChart from '@/components/analytics/BucketTimeSeriesChart';

interface AbandonedBucket {
  bucketId: string;
  bucketName: string;
  transactionCount: number;
  totalSpent: string;
  totalDeposited: string;
  lastActivity: string | null;
  budgetUtilization: number;
  isOverBudget: boolean;
}

export default function AnalyticsPage() {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  const [syncing, setSyncing] = React.useState(false);
  
  const queryAddress = React.useMemo(() => 
    smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress,
    [smartAccountReady, smartAccountAddress, eoaAddress]
  );

  const queryAddressToLower = queryAddress?.toLowerCase();
  // Use TanStack Query hooks
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights
  } = useUserInsights(queryAddressToLower);

  console.log("insights", insights);

  const {
    data: bucketUsageData,
    isLoading: bucketUsageLoading,
    error: bucketUsageError,
    refetch: refetchBucketUsage
  } = useBucketUsage(queryAddressToLower);

  const bucketUsage = bucketUsageData?.buckets || [];
  
  const loading = insightsLoading || bucketUsageLoading;
  const error = insightsError || bucketUsageError;

  const refetchAll = async () => {
    if (!queryAddressToLower) return;
    
    setSyncing(true);
    try {
      // First sync the user data
      const analyticsApiUrl = "https://expendi-production.up.railway.app";
      await fetch(`${analyticsApiUrl}/api/v2/sync/user/${queryAddressToLower}`, {
        method: 'POST'
      });
      
      // Then refetch all the analytics data
      refetchInsights();
      refetchBucketUsage();
    } catch (error) {
      console.error('Failed to sync user data:', error);
      // Still refetch the existing data even if sync fails
      refetchInsights();
      refetchBucketUsage();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500">
          {error instanceof Error ? error.message : 'Failed to load analytics data'}
        </div>
        <Button 
          onClick={refetchAll}
          disabled={syncing}
          variant="primary"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Retry'}</span>
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: string, showSymbol: boolean = true) => {
    const num = parseFloat(value);
    if (isNaN(num)) return showSymbol ? '$ 0.00' : '0.00';
    
    // Convert from USDC with 6 decimal places
    const valueInUnits = num / 1000000;
    
    // For USDC with 6 decimal places, show appropriate precision
    let formattedAmount: string;
    if (valueInUnits === 0) {
      formattedAmount = '0.00';
    } else if (valueInUnits < 0.01) {
      formattedAmount = valueInUnits.toFixed(6); // Show full precision for very small amounts
    } else if (valueInUnits < 1) {
      formattedAmount = valueInUnits.toFixed(4); // Show 4 decimal places for amounts less than 1
    } else {
      formattedAmount = valueInUnits.toFixed(2); // Show 2 decimal places for larger amounts
    }
    
    return showSymbol ? `$ ${formattedAmount}` : formattedAmount;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Analytics Dashboard</h1>
        <button 
          onClick={refetchAll}
          disabled={loading || syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${loading || syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Overview Cards */}
      {insights && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(insights.totalSpent)}</div>
              <p className="text-xs text-muted-foreground">Across all buckets</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Buckets</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.activeBuckets}</div>
              <p className="text-xs text-muted-foreground">Bucket count</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active Bucket</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {/* <div className="text-2xl font-bold">
                {insights.mostUsedBucket ? insights.mostUsedBucket.transactionCount : '0'}
              </div> */}
              <p className="text-xs text-muted-foreground">
                {insights.mostUsedBucket ? insights.mostUsedBucket.bucketName : 'No data'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abandoned Buckets</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.abandonedBuckets.length}</div>
              <p className="text-xs text-muted-foreground">Inactive buckets</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Bucket Usage</TabsTrigger>
          <TabsTrigger value="insights">Top Performers</TabsTrigger>
          <TabsTrigger value="abandoned">Abandoned Buckets</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          {/* Time Series Chart */}
          <BucketTimeSeriesChart userAddress={queryAddressToLower} />
          
          {/* Bucket Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Bucket Usage Statistics</CardTitle>
              <CardDescription>Transaction count and activity levels for each bucket</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bucketUsage.map((bucket) => (
                  <div key={bucket.bucketId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{bucket.bucketName}</p>
                      <p className="text-sm text-muted-foreground">
                        {bucket.transactionCount} transactions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last activity: {bucket.lastActivity ? new Date(bucket.lastActivity).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(bucket.totalSpent)}</p>
                      <p className="text-sm text-muted-foreground">spent</p>
                      {bucket.isOverBudget && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          Over Budget
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Most Used Bucket
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {insights.mostUsedBucket ? insights.mostUsedBucket.bucketName : 'No data'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {insights.mostUsedBucket ? `${insights.mostUsedBucket.transactionCount} transactions` : 'No transactions'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Highest Spending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {insights.highestSpendingBucket ? insights.highestSpendingBucket.bucketName : 'No data'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {insights.highestSpendingBucket ? formatCurrency(insights.highestSpendingBucket.totalSpent) : '$0.00 USDC'} spent
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Most Funded
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {insights.mostFundedBucket ? insights.mostFundedBucket.bucketName : 'No data'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {insights.mostFundedBucket ? formatCurrency(insights.mostFundedBucket.totalDeposited) : '$0.00 USDC'} funded
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="abandoned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Abandoned Buckets
              </CardTitle>
              <CardDescription>
                Buckets with no recent activity - consider consolidating or removing them
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights && insights.abandonedBuckets?.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {insights.abandonedBuckets.map((bucket: AbandonedBucket) => (
                      <div key={bucket.bucketId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{bucket.bucketName}</p>
                          <p className="text-sm text-muted-foreground">
                            {bucket.lastActivity ? 
                              `${Math.floor((Date.now() - new Date(bucket.lastActivity).getTime()) / (1000 * 60 * 60 * 24))} days since last activity` : 
                              'No recent activity'
                            }
                          </p>
                        </div>
                        <Badge variant="secondary">
                          Inactive
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Great! You have no abandoned buckets. All your buckets are actively being used.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}