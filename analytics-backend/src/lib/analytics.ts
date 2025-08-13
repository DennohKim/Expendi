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
  totalBalance: string;
  totalSpent: string;
  activeBuckets: number;
  mostUsedBucket: BucketUsageStats | null;
  highestSpendingBucket: BucketUsageStats | null;
  mostFundedBucket: BucketUsageStats | null;
  budgetAdherenceRate: number;
  abandonedBuckets: BucketUsageStats[];
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

// Calculate bucket usage statistics
export const calculateBucketUsageStats = (prisma: PrismaClient) => async (
  userId: string,
  bucketId?: string
): Promise<BucketUsageStats[]> => {
  const whereClause = {
    userId,
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
  userId: string
): Promise<UserFinancialInsights> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      buckets: {
        where: { active: true }
      }
    }
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const bucketStats = await calculateBucketUsageStats(prisma)(userId);
  
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
    userId,
    totalBalance: user.totalBalance,
    totalSpent: user.totalSpent,
    activeBuckets: user.buckets.length,
    mostUsedBucket,
    highestSpendingBucket,
    mostFundedBucket,
    budgetAdherenceRate: Math.round(budgetAdherenceRate * 100) / 100,
    abandonedBuckets
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

// Create analytics service with all functions
export const createAnalyticsService = (prisma: PrismaClient) => ({
  calculateBucketUsageStats: calculateBucketUsageStats(prisma),
  getUserFinancialInsights: getUserFinancialInsights(prisma),
  calculateMonthlyAnalytics: calculateMonthlyAnalytics(prisma),
  getSeasonalUsagePatterns: getSeasonalUsagePatterns(prisma)
});

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;