"use client";

import React from 'react';
import { useAccount } from 'wagmi';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, DollarSign, Activity, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';

// Import the TanStack Query hooks
import { useUserInsights } from '@/hooks/analytics/useUserInsights';
import { useBucketUsage } from '@/hooks/analytics/useBucketUsage';
import { useBudgetEfficiency } from '@/hooks/analytics/useBudgetEfficiency';
import { useAbandonedBuckets } from '@/hooks/analytics/useAbandonedBuckets';

export default function AnalyticsPage() {
  const { address: eoaAddress } = useAccount();
  const { smartAccountAddress, smartAccountReady } = useSmartAccount();
  
  const queryAddress = React.useMemo(() => 
    smartAccountReady && smartAccountAddress ? smartAccountAddress : eoaAddress,
    [smartAccountReady, smartAccountAddress, eoaAddress]
  );

  // Use TanStack Query hooks
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights
  } = useUserInsights(queryAddress);

  console.log("insights", insights);

  const {
    data: bucketUsageData,
    isLoading: bucketUsageLoading,
    error: bucketUsageError,
    refetch: refetchBucketUsage
  } = useBucketUsage(queryAddress);

  const {
    data: budgetEfficiencyData,
    isLoading: budgetEfficiencyLoading,
    error: budgetEfficiencyError,
    refetch: refetchBudgetEfficiency
  } = useBudgetEfficiency(queryAddress);

  const {
    data: abandonedBucketsData,
    isLoading: abandonedBucketsLoading,
    error: abandonedBucketsError,
    refetch: refetchAbandonedBuckets
  } = useAbandonedBuckets(queryAddress);

  const bucketUsage = bucketUsageData?.buckets || [];
  const budgetEfficiency = budgetEfficiencyData?.bucketEfficiency || [];
  
  const loading = insightsLoading || bucketUsageLoading || budgetEfficiencyLoading || abandonedBucketsLoading;
  const error = insightsError || bucketUsageError || budgetEfficiencyError || abandonedBucketsError;

  const refetchAll = () => {
    refetchInsights();
    refetchBucketUsage();
    refetchBudgetEfficiency();
    refetchAbandonedBuckets();
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
        <button 
          onClick={refetchAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const formatCurrency = (value: string, showSymbol: boolean = true) => {
    const num = parseFloat(value);
    if (isNaN(num)) return showSymbol ? '$0.00 USDC' : '0.00';
    
    // For USDC with 6 decimal places, show appropriate precision
    let formattedAmount: string;
    if (num === 0) {
      formattedAmount = '0.00';
    } else if (num < 0.01) {
      formattedAmount = num.toFixed(6); // Show full precision for very small amounts
    } else if (num < 1) {
      formattedAmount = num.toFixed(4); // Show 4 decimal places for amounts less than 1
    } else {
      formattedAmount = num.toFixed(2); // Show 2 decimal places for larger amounts
    }
    
    return showSymbol ? `$${formattedAmount} USDC` : formattedAmount;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'over_budget': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <button 
          onClick={refetchAll}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
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
              <div className="text-2xl font-bold">{formatCurrency(insights.totalSpending)}</div>
              <p className="text-xs text-muted-foreground">Across all buckets</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(insights.averageTransactionAmount)}</div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active Bucket</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.mostUsedBucket.transactionCount}</div>
              <p className="text-xs text-muted-foreground">{insights.mostUsedBucket.bucketName}</p>
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

      <Tabs defaultValue="efficiency" className="space-y-4">
        <TabsList>
          <TabsTrigger value="efficiency">Budget Efficiency</TabsTrigger>
          <TabsTrigger value="usage">Bucket Usage</TabsTrigger>
          <TabsTrigger value="insights">Top Performers</TabsTrigger>
          <TabsTrigger value="abandoned">Abandoned Buckets</TabsTrigger>
        </TabsList>

        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Efficiency</CardTitle>
              <CardDescription>How efficiently you're using your bucket budgets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetEfficiency.map((bucket) => (
                  <div key={bucket.bucketId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{bucket.bucketName}</p>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(bucket.status)}>
                            {bucket.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(bucket.monthlySpent, false)} / {formatCurrency(bucket.monthlyLimit, false)} USDC
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{bucket.utilizationRate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">utilization</p>
                      </div>
                    </div>
                    <Progress value={bucket.utilizationRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
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
                    <p className="font-medium">{insights.mostUsedBucket.bucketName}</p>
                    <p className="text-sm text-muted-foreground">
                      {insights.mostUsedBucket.transactionCount} transactions
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
                    <p className="font-medium">{insights.highestSpendingBucket.bucketName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(insights.highestSpendingBucket.totalSpent)} spent
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
                    <p className="font-medium">{insights.mostFundedBucket.bucketName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(insights.mostFundedBucket.totalFunded)} funded
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
              {abandonedBucketsData && abandonedBucketsData.abandonedBuckets?.length > 0 ? (
                <div className="space-y-4">
                  {abandonedBucketsData.potentialSavings && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="font-medium">Potential Savings</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(abandonedBucketsData.potentialSavings)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Available in abandoned buckets
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {abandonedBucketsData.abandonedBuckets.map((bucket) => (
                      <div key={bucket.bucketId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{bucket.bucketName}</p>
                          <p className="text-sm text-muted-foreground">
                            {bucket.daysSinceLastActivity} days since last activity
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