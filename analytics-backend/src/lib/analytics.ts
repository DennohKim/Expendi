import { PrismaClient } from '@prisma/client';

export interface BucketUsageStats {
  bucketId: string;
  bucketName: string;
  transactionCount: number;
  totalSpent: string;
  totalDeposited: string;
  lastActivity: Date | null;
  budgetUtilization: number;
  isOverBudget: boolean;
}

export interface UserFinancialInsights {
  userId: string;
  totalSpent: string;
  activeBuckets: number;
  mostUsedBucket: BucketUsageStats | null;
  highestSpendingBucket: BucketUsageStats | null;
  mostFundedBucket: BucketUsageStats | null;
  budgetAdherenceRate: number;
  abandonedBuckets: BucketUsageStats[];
  chainName: string;
  walletAddress: string;
}

export interface SeasonalUsagePatterns {
  monthlySpending: Array<{
    month: string;
    totalSpent: number;
    transactionCount: number;
    budgetAdherenceRate: number;
  }>;
  averageMonthlySpending: number;
  spendingTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface BucketTimeSeriesData {
  bucketId: string;
  bucketName: string;
  data: Array<{
    period: string;
    totalSpent: number;
    timestamp: Date;
  }>;
}

export interface BucketUsageTimeSeries {
  period: 'daily' | 'monthly' | 'yearly';
  buckets: BucketTimeSeriesData[];
  totalPeriods: number;
  dateRange: {
    from: Date;
    to: Date;
  };
}

// Calculate bucket usage statistics
export const calculateBucketUsageStats = (prisma: PrismaClient) => async (
  userCompositeId: string,
  bucketId?: string
): Promise<BucketUsageStats[]> => {
  const whereClause = {
    userId: userCompositeId,
    // Exclude UNALLOCATED bucket from analytics
    NOT: {
      name: 'UNALLOCATED'
    },
    ...(bucketId && { id: bucketId })
  };

  const buckets = await prisma.bucket.findMany({
    where: whereClause,
    include: {
      transactions: {
        orderBy: {
          blockTimestamp: 'desc'
        }
      }
    }
  });

  return buckets.map((bucket: any) => {
    const withdrawals = bucket.transactions.filter((t: any) => 
      ['BUCKET_SPENDING', 'WITHDRAWAL'].includes(t.type)
    );
    
    const deposits = bucket.transactions.filter((t: any) => 
      ['BUCKET_FUNDING', 'DEPOSIT'].includes(t.type)
    );

    const totalSpent = withdrawals.reduce((sum: number, t: any) => 
      sum + parseFloat(t.amount), 0
    ).toString();

    const totalDeposited = deposits.reduce((sum: number, t: any) => 
      sum + parseFloat(t.amount), 0
    ).toString();

    const monthlyLimit = parseFloat(bucket.monthlyLimit);
    const monthlySpent = parseFloat(bucket.monthlySpent);
    
    const budgetUtilization = monthlyLimit > 0 ? (monthlySpent / monthlyLimit) * 100 : 0;
    const isOverBudget = budgetUtilization > 100;

    const lastActivity = bucket.transactions.length > 0 ? 
      bucket.transactions[0].blockTimestamp : null;

    return {
      bucketId: bucket.id,
      bucketName: bucket.name,
      transactionCount: bucket.transactions.length,
      totalSpent,
      totalDeposited,
      lastActivity,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      isOverBudget
    };
  });
};

// Get user financial insights
export const getUserFinancialInsights = (prisma: PrismaClient) => async (
  walletAddress: string
): Promise<UserFinancialInsights> => {
  // Find user by wallet address (could be on any chain)
  const users = await prisma.user.findMany({
    where: { 
      walletAddress: walletAddress.toLowerCase()
    },
    include: {
      buckets: {
        where: { 
          active: true,
          // Exclude UNALLOCATED bucket from financial insights
          NOT: {
            name: 'UNALLOCATED'
          }
        }
      }
    }
  });

  console.log(`Debug: Found ${users.length} users for wallet ${walletAddress}`);
  users.forEach(u => console.log(`Debug: User ID: ${u.id}, Chain: ${u.chainName}, Buckets: ${u.buckets.length}`));

  if (users.length === 0) {
    throw new Error(`User with wallet address ${walletAddress} not found`);
  }
  
  // If multiple users, prefer the one with the most buckets or most recent
  const user = users.reduce((prev, current) => 
    current.buckets.length > prev.buckets.length ? current : prev
  );

  const bucketStats = await calculateBucketUsageStats(prisma)(user.id);
  
  // Calculate actual totalBalance and totalSpent from transactions
  const userTransactions = await prisma.transaction.findMany({
    where: { userId: user.id }
  });
  
  // Debug logging
  console.log(`Debug: User ID: ${user.id}, Wallet: ${walletAddress}`);
  console.log(`Debug: Found ${userTransactions.length} transactions`);
  console.log(`Debug: Transaction types:`, userTransactions.map(t => t.type));
  
  // Calculate amounts by type for debugging
  const spendingTransactions = userTransactions.filter(t => ['BUCKET_SPENDING', 'WITHDRAWAL', 'EMERGENCY_WITHDRAW'].includes(t.type));
  const totalSpentDebug = spendingTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  console.log(`Debug: Spending transactions count: ${spendingTransactions.length}`);
  console.log(`Debug: Total spent (from ${spendingTransactions.length} transactions): ${totalSpentDebug}`);
  
  // Calculate total spent from actual spending transactions (excluding UNALLOCATED transfers)
  const calculatedTotalSpent = userTransactions
    .filter(t => ['BUCKET_SPENDING', 'WITHDRAWAL', 'EMERGENCY_WITHDRAW'].includes(t.type))
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  // Most used bucket (by transaction count)
  const mostUsedBucket = bucketStats.reduce((max, bucket) => 
    bucket.transactionCount > (max?.transactionCount || 0) ? bucket : max, 
    null as BucketUsageStats | null
  );

  // Highest spending bucket
  const highestSpendingBucket = bucketStats.reduce((max, bucket) => 
    parseFloat(bucket.totalSpent) > parseFloat(max?.totalSpent || '0') ? bucket : max,
    null as BucketUsageStats | null
  );

  // Most funded bucket
  const mostFundedBucket = bucketStats.reduce((max, bucket) => 
    parseFloat(bucket.totalDeposited) > parseFloat(max?.totalDeposited || '0') ? bucket : max,
    null as BucketUsageStats | null
  );

  // Budget adherence rate (percentage of buckets within budget)
  const bucketsWithBudget = bucketStats.filter((b) => {
    const userBucket = user.buckets.find(bucket => bucket.id === b.bucketId);
    return parseFloat(userBucket?.monthlyLimit || '0') > 0;
  });
  const bucketsWithinBudget = bucketsWithBudget.filter(b => !b.isOverBudget);
  const budgetAdherenceRate = bucketsWithBudget.length > 0 ? 
    (bucketsWithinBudget.length / bucketsWithBudget.length) * 100 : 100;

  // Abandoned buckets (have balance but no activity in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const abandonedBuckets = bucketStats.filter((bucket) => {
    const bucketData = user.buckets.find(b => b.id === bucket.bucketId);
    const hasBalance = parseFloat(bucketData?.balance || '0') > 0;
    const noRecentActivity = !bucket.lastActivity || bucket.lastActivity < thirtyDaysAgo;
    return hasBalance && noRecentActivity;
  });

  return {
    userId: user.walletAddress,
    totalSpent: calculatedTotalSpent.toString(),
    activeBuckets: user.buckets.length,
    mostUsedBucket,
    highestSpendingBucket,
    mostFundedBucket,
    budgetAdherenceRate: Math.round(budgetAdherenceRate * 100) / 100,
    abandonedBuckets,
    chainName: user.chainName || 'base',
    walletAddress: user.walletAddress
  };
};

// Calculate monthly analytics
export const calculateMonthlyAnalytics = (prisma: PrismaClient) => async (
  userId: string,
  month: string,
  chainName?: string
): Promise<void> => {
  const [year, monthNum] = month.split('-').map(Number);
  const periodStart = new Date(year, monthNum - 1, 1);
  const periodEnd = new Date(year, monthNum, 0, 23, 59, 59);

  const whereClause: any = {
    userId,
    blockTimestamp: {
      gte: periodStart,
      lte: periodEnd
    }
  };

  // Add chain filter if specified
  if (chainName) {
    whereClause.chainName = chainName;
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      bucket: true
    }
  });

  // Calculate user-level analytics
  const totalSpent = transactions
    .filter((t: any) => ['BUCKET_SPENDING', 'WITHDRAWAL', 'UNALLOCATED_WITHDRAW', 'EMERGENCY_WITHDRAW'].includes(t.type))
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  const totalDeposited = transactions
    .filter((t: any) => ['DEPOSIT', 'BUCKET_FUNDING'].includes(t.type))
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  const averageTransactionSize = transactions.length > 0 ? 
    (totalSpent + totalDeposited) / transactions.length : 0;

  const activeBuckets = new Set(transactions.map((t: any) => t.bucketId).filter(Boolean)).size;

  // Calculate budget adherence
  const bucketWhereClause: any = { userId };
  if (chainName) {
    bucketWhereClause.chainName = chainName;
  }

  const userBuckets = await prisma.bucket.findMany({
    where: bucketWhereClause
  });

  const bucketsWithBudget = userBuckets.filter((b: any) => parseFloat(b.monthlyLimit) > 0);
  const bucketsWithinBudget = bucketsWithBudget.filter((b: any) => parseFloat(b.monthlySpent) <= parseFloat(b.monthlyLimit));
  const budgetAdherenceRate = bucketsWithBudget.length > 0 ? 
    bucketsWithinBudget.length / bucketsWithBudget.length : 1;

  // Extract chain name from composite userId or use parameter
  const actualChainName = chainName || userId.split(':')[0];

  // Upsert user analytics
  await prisma.userAnalytics.upsert({
    where: {
      userId_chainName_periodType_periodStart: {
        userId,
        chainName: actualChainName,
        periodType: 'MONTHLY',
        periodStart
      }
    },
    update: {
      periodEnd,
      totalSpent: totalSpent.toString(),
      totalDeposited: totalDeposited.toString(),
      transactionCount: transactions.length,
      averageTransactionSize: averageTransactionSize.toString(),
      activeBucketsCount: activeBuckets,
      budgetAdherenceRate: budgetAdherenceRate
    },
    create: {
      userId,
      chainName: actualChainName,
      periodType: 'MONTHLY',
      periodStart,
      periodEnd,
      totalSpent: totalSpent.toString(),
      totalDeposited: totalDeposited.toString(),
      transactionCount: transactions.length,
      averageTransactionSize: averageTransactionSize.toString(),
      activeBucketsCount: activeBuckets,
      budgetAdherenceRate: budgetAdherenceRate
    }
  });

  // Calculate bucket-level analytics
  const bucketTransactions = new Map<string, any[]>();
  transactions.forEach((t: any) => {
    if (t.bucketId) {
      if (!bucketTransactions.has(t.bucketId)) {
        bucketTransactions.set(t.bucketId, []);
      }
      bucketTransactions.get(t.bucketId)!.push(t);
    }
  });

  for (const [bucketId, bucketTxs] of bucketTransactions) {
    const bucket = userBuckets.find((b: any) => b.id === bucketId);
    if (!bucket) continue;

    const bucketSpent = bucketTxs
      .filter(t => ['BUCKET_SPENDING', 'WITHDRAWAL'].includes(t.type))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const bucketDeposited = bucketTxs
      .filter(t => ['BUCKET_FUNDING', 'DEPOSIT'].includes(t.type))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const withdrawalCount = bucketTxs.filter(t => ['BUCKET_SPENDING', 'WITHDRAWAL'].includes(t.type)).length;
    const depositCount = bucketTxs.filter(t => ['BUCKET_FUNDING', 'DEPOSIT'].includes(t.type)).length;

    const monthlyLimit = parseFloat(bucket.monthlyLimit);
    const budgetUtilization = monthlyLimit > 0 ? bucketSpent / monthlyLimit : 0;
    const isOverBudget = budgetUtilization > 1;

    const lastActivity = bucketTxs.length > 0 ? 
      bucketTxs.sort((a, b) => b.blockTimestamp.getTime() - a.blockTimestamp.getTime())[0].blockTimestamp : null;

    await prisma.bucketAnalytics.upsert({
      where: {
        bucketId_chainName_periodType_periodStart: {
          bucketId,
          chainName: actualChainName,
          periodType: 'MONTHLY',
          periodStart
        }
      },
      update: {
        periodEnd,
        totalSpent: bucketSpent.toString(),
        totalDeposited: bucketDeposited.toString(),
        transactionCount: bucketTxs.length,
        withdrawalCount,
        depositCount,
        budgetUtilization,
        isOverBudget,
        lastActivityAt: lastActivity
      },
      create: {
        bucketId,
        userId,
        chainName: actualChainName,
        periodType: 'MONTHLY',
        periodStart,
        periodEnd,
        totalSpent: bucketSpent.toString(),
        totalDeposited: bucketDeposited.toString(),
        transactionCount: bucketTxs.length,
        withdrawalCount,
        depositCount,
        budgetUtilization,
        isOverBudget,
        lastActivityAt: lastActivity
      }
    });
  }
};

// Calculate trend from values
const calculateTrend = (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
  if (values.length < 2) return 'stable';
  
  const recent = values.slice(-3);
  const older = values.slice(-6, -3);
  
  if (recent.length === 0 || older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (changePercent > 10) return 'increasing';
  if (changePercent < -10) return 'decreasing';
  return 'stable';
};

// Get seasonal usage patterns
export const getSeasonalUsagePatterns = (prisma: PrismaClient) => async (
  userId: string
): Promise<SeasonalUsagePatterns> => {
  const monthlyAnalytics = await prisma.userAnalytics.findMany({
    where: {
      userId,
      periodType: 'MONTHLY'
    },
    orderBy: {
      periodStart: 'asc'
    }
  });

  const monthlySpending = monthlyAnalytics.map((analytics: any) => ({
    month: analytics.periodStart.toISOString().substring(0, 7), // YYYY-MM format
    totalSpent: parseFloat(analytics.totalSpent),
    transactionCount: analytics.transactionCount,
    budgetAdherenceRate: Number(analytics.budgetAdherenceRate)
  }));

  return {
    monthlySpending,
    averageMonthlySpending: monthlySpending.reduce((sum: number, m) => sum + m.totalSpent, 0) / (monthlySpending.length || 1),
    spendingTrend: calculateTrend(monthlySpending.map((m) => m.totalSpent))
  };
};

// Get bucket usage time series data
export const getBucketUsageTimeSeries = (prisma: PrismaClient) => async (
  userId: string,
  period: 'daily' | 'monthly' | 'yearly',
  fromDate?: Date,
  toDate?: Date,
  bucketId?: string
): Promise<BucketUsageTimeSeries> => {
  const now = new Date();
  const defaultFromDate = new Date(now.getFullYear() - 1, 0, 1); // 1 year ago
  const defaultToDate = now;

  const from = fromDate || defaultFromDate;
  const to = toDate || defaultToDate;

  // Get user buckets
  const whereClause: any = {
    userId,
    active: true,
    // Exclude UNALLOCATED bucket from time series analytics
    NOT: {
      name: 'UNALLOCATED'
    },
    ...(bucketId && { id: bucketId })
  };

  const buckets = await prisma.bucket.findMany({
    where: whereClause,
    include: {
      transactions: {
        where: {
          blockTimestamp: {
            gte: from,
            lte: to
          },
          type: {
            in: ['BUCKET_SPENDING', 'WITHDRAWAL']
          }
        },
        orderBy: {
          blockTimestamp: 'asc'
        }
      }
    }
  });

  // Group transactions by time period
  const groupTransactionsByPeriod = (transactions: any[], period: 'daily' | 'monthly' | 'yearly') => {
    const grouped = new Map<string, { totalSpent: number; timestamp: Date }>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.blockTimestamp);
      let periodKey: string;
      let periodStart: Date;

      switch (period) {
        case 'daily':
          periodKey = date.toISOString().substring(0, 10); // YYYY-MM-DD
          periodStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          break;
        case 'monthly':
          periodKey = date.toISOString().substring(0, 7); // YYYY-MM
          periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
          break;
        case 'yearly':
          periodKey = date.getFullYear().toString(); // YYYY
          periodStart = new Date(date.getFullYear(), 0, 1);
          break;
      }

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, { totalSpent: 0, timestamp: periodStart });
      }

      const existing = grouped.get(periodKey)!;
      existing.totalSpent += parseFloat(transaction.amount);
    });

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      totalSpent: data.totalSpent,
      timestamp: data.timestamp
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  // Fill in missing periods with zero values
  const fillMissingPeriods = (data: any[], period: 'daily' | 'monthly' | 'yearly', from: Date, to: Date) => {
    const filled = [];
    const current = new Date(from);

    while (current <= to) {
      let periodKey: string;
      let nextPeriod: Date;

      switch (period) {
        case 'daily':
          periodKey = current.toISOString().substring(0, 10);
          nextPeriod = new Date(current);
          nextPeriod.setDate(nextPeriod.getDate() + 1);
          break;
        case 'monthly':
          periodKey = current.toISOString().substring(0, 7);
          nextPeriod = new Date(current);
          nextPeriod.setMonth(nextPeriod.getMonth() + 1);
          break;
        case 'yearly':
          periodKey = current.getFullYear().toString();
          nextPeriod = new Date(current);
          nextPeriod.setFullYear(nextPeriod.getFullYear() + 1);
          break;
        default:
          throw new Error(`Invalid period: ${period}`);
      }

      const existingData = data.find(d => d.period === periodKey);
      filled.push({
        period: periodKey,
        totalSpent: existingData?.totalSpent || 0,
        timestamp: new Date(current)
      });

      current.setTime(nextPeriod.getTime());
    }

    return filled;
  };

  // Process each bucket
  const bucketsTimeSeries: BucketTimeSeriesData[] = buckets.map(bucket => {
    const groupedData = groupTransactionsByPeriod(bucket.transactions, period);
    const filledData = fillMissingPeriods(groupedData, period, from, to);

    return {
      bucketId: bucket.id,
      bucketName: bucket.name,
      data: filledData
    };
  });

  return {
    period,
    buckets: bucketsTimeSeries,
    totalPeriods: bucketsTimeSeries.length > 0 ? bucketsTimeSeries[0].data.length : 0,
    dateRange: { from, to }
  };
};

// Create analytics service with all functions
export const createAnalyticsService = (prisma: PrismaClient) => ({
  calculateBucketUsageStats: calculateBucketUsageStats(prisma),
  getUserFinancialInsights: getUserFinancialInsights(prisma),
  calculateMonthlyAnalytics: calculateMonthlyAnalytics(prisma),
  getSeasonalUsagePatterns: getSeasonalUsagePatterns(prisma),
  getBucketUsageTimeSeries: getBucketUsageTimeSeries(prisma)
});

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;