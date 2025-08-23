"use client";

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { useBucketTimeSeries, BucketTimeSeriesData } from '@/hooks/analytics/useBucketTimeSeries';

interface BucketTimeSeriesChartProps {
  userAddress: string | undefined;
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#ff0080', '#8000ff', '#ff8000', '#0080ff', '#ff0040'
];

const BucketTimeSeriesChart: React.FC<BucketTimeSeriesChartProps> = ({ userAddress }) => {
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedBuckets, setSelectedBuckets] = useState<Set<string>>(new Set());
  
  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let from: Date;
    
    switch (period) {
      case 'daily':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); // Last month
        break;
      case 'yearly':
        from = new Date(now.getFullYear() - 5, 0, 1); // Last 5 years
        break;
      default: // monthly
        from = new Date(now.getFullYear() - 1, now.getMonth(), 1); // Last year
    }
    
    return { from, to: now };
  }, [period]);

  const {
    data: timeSeriesData,
    isLoading,
    error,
    refetch
  } = useBucketTimeSeries(userAddress, {
    period,
    from: dateRange.from,
    to: dateRange.to
  });

  const chartData = useMemo(() => {
    if (!timeSeriesData?.buckets?.length) return [];

    // Get all unique periods across all buckets
    const allPeriods = new Set<string>();
    timeSeriesData.buckets.forEach(bucket => {
      bucket.data.forEach(point => allPeriods.add(point.period));
    });

    const sortedPeriods = Array.from(allPeriods).sort();
    
    // Transform data for recharts - keep raw values for chart, formatting happens in display
    return sortedPeriods.map(period => {
      const dataPoint: any = { period };
      
      timeSeriesData.buckets.forEach(bucket => {
        const bucketDataPoint = bucket.data.find(d => d.period === period);
        // Keep raw value (6-decimal USDC format) for chart calculations
        dataPoint[bucket.bucketName] = bucketDataPoint?.totalSpent || 0;
      });
      
      return dataPoint;
    });
  }, [timeSeriesData]);

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0.00';
    
    // Convert from 6-decimal USDC format to actual USD
    const usdValue = value / 1000000;
    
    if (usdValue === 0) return '$0.00';
    if (usdValue < 0.01) return `$${usdValue.toFixed(6)}`;
    if (usdValue < 1) return `$${usdValue.toFixed(4)}`;
    return `$${usdValue.toFixed(2)}`;
  };

  const formatPeriodLabel = (period: string) => {
    switch (period.length) {
      case 4: // Year format YYYY
        return period;
      case 7: // Month format YYYY-MM
        const [year, month] = period.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 10: // Day format YYYY-MM-DD
        return new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      default:
        return period;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {formatPeriodLabel(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey}: {formatCurrency(entry.value)}
            </p>
          ))}
          <p className="text-sm text-gray-500 mt-1 border-t pt-1">
            Total: {formatCurrency(payload.reduce((sum: number, entry: any) => sum + entry.value, 0))}
          </p>
        </div>
      );
    }
    return null;
  };

  const toggleBucketVisibility = (bucketName: string) => {
    setSelectedBuckets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bucketName)) {
        newSet.delete(bucketName);
      } else {
        newSet.add(bucketName);
      }
      return newSet;
    });
  };

  const visibleBuckets = useMemo(() => {
    if (!timeSeriesData?.buckets) return [];
    if (selectedBuckets.size === 0) return timeSeriesData.buckets;
    return timeSeriesData.buckets.filter(bucket => selectedBuckets.has(bucket.bucketName));
  }, [timeSeriesData?.buckets, selectedBuckets]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Bucket Spending Over Time
          </CardTitle>
          <CardDescription>Loading time series data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Bucket Spending Over Time
          </CardTitle>
          <CardDescription>Failed to load time series data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-red-500">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button onClick={() => refetch()} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Bucket Spending Over Time
        </CardTitle>
        <CardDescription>
          {timeSeriesData ? (
            <>
              Spending patterns from {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}
              {timeSeriesData.summary && (
                <>
                  <br />
                  Total spent: {formatCurrency(timeSeriesData.summary.totalSpentAcrossAllBuckets)} | 
                  Average per {period === 'daily' ? 'day' : period === 'monthly' ? 'month' : 'year'}: {formatCurrency(timeSeriesData.summary.averageSpentPerPeriod)}
                </>
              )}
            </>
          ) : (
            'Track your bucket spending over time with detailed breakdowns'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Period Selection */}
        <div className='flex justify-between items-center order-1'>
       

        {/* Bucket Selection */}
        {timeSeriesData?.buckets && timeSeriesData.buckets.length > 0 && (
          <div className="mb-4">
           <div className="flex flex-wrap gap-2">
              {timeSeriesData.buckets.map((bucket, index) => (
                <Badge
                  key={bucket.bucketId}
                  variant={selectedBuckets.size === 0 || selectedBuckets.has(bucket.bucketName) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: selectedBuckets.size === 0 || selectedBuckets.has(bucket.bucketName) 
                      ? COLORS[index % COLORS.length] 
                      : undefined
                  }}
                  onClick={() => toggleBucketVisibility(bucket.bucketName)}
                >
                  {bucket.bucketName}
                </Badge>
              ))}
              {selectedBuckets.size > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedBuckets(new Set())}
                  className="h-6 text-xs"
                >
                  Show All
                </Button>
              )}
            </div>
          </div>
        )}
         <div className="flex items-center gap-1 mb-4">
          {(['daily', 'monthly', 'yearly'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="capitalize"
            >
              {p === 'daily' ? 'D' : p === 'monthly' ? 'M' : 'Y'}
            </Button>
          ))}
        </div>
        </div>
        

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={formatPeriodLabel}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {visibleBuckets.map((bucket) => {
                  const bucketIndex = timeSeriesData?.buckets?.findIndex(b => b.bucketId === bucket.bucketId) ?? 0;
                  return (
                    <Bar
                      key={bucket.bucketId}
                      dataKey={bucket.bucketName}
                      fill={COLORS[bucketIndex % COLORS.length]}
                      radius={[2, 2, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Calendar className="h-12 w-12 mb-4" />
            <p className="text-center">
              No spending data available for the selected period.
              <br />
              <span className="text-sm">Try selecting a different time range or period.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BucketTimeSeriesChart;