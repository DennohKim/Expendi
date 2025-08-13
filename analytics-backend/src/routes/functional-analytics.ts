import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createAnalyticsService, AnalyticsService } from '../lib/analytics';

const router = Router();

// Validation schemas
const userParamsSchema = z.object({
  userId: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format')
});

const bucketParamsSchema = z.object({
  userId: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
  bucketId: z.string().optional()
});

const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional()
});

// Create router with analytics service
export const createAnalyticsRouter = (prisma: PrismaClient): Router => {
  const analyticsService = createAnalyticsService(prisma);

  // Get user financial insights
  router.get('/users/:userId/insights', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      
      const insights = await analyticsService.getUserFinancialInsights(userId);
      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching user insights:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get bucket usage statistics
  router.get('/users/:userId/bucket-usage', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      const { bucketId } = req.query;
      
      const bucketStats = await analyticsService.calculateBucketUsageStats(
        userId, 
        typeof bucketId === 'string' ? bucketId : undefined
      );
      
      res.json({
        success: true,
        data: {
          buckets: bucketStats,
          summary: {
            totalBuckets: bucketStats.length,
            activeBuckets: bucketStats.filter(b => b.lastActivity).length,
            overBudgetBuckets: bucketStats.filter(b => b.isOverBudget).length,
            totalTransactions: bucketStats.reduce((sum, b) => sum + b.transactionCount, 0)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching bucket usage:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get most used bucket
  router.get('/users/:userId/most-used-bucket', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      
      const insights = await analyticsService.getUserFinancialInsights(userId);
      
      res.json({
        success: true,
        data: {
          mostUsedBucket: insights.mostUsedBucket,
          rank: 1
        }
      });
    } catch (error) {
      console.error('Error fetching most used bucket:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get highest spending bucket
  router.get('/users/:userId/highest-spending-bucket', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      
      const insights = await analyticsService.getUserFinancialInsights(userId);
      
      res.json({
        success: true,
        data: {
          highestSpendingBucket: insights.highestSpendingBucket,
          rank: 1
        }
      });
    } catch (error) {
      console.error('Error fetching highest spending bucket:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get most funded bucket
  router.get('/users/:userId/most-funded-bucket', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      
      const insights = await analyticsService.getUserFinancialInsights(userId);
      
      res.json({
        success: true,
        data: {
          mostFundedBucket: insights.mostFundedBucket,
          rank: 1
        }
      });
    } catch (error) {
      console.error('Error fetching most funded bucket:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get bucket activity frequency
  router.get('/users/:userId/bucket-activity', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      const { month } = monthQuerySchema.parse(req.query);
      
      let whereClause: any = { userId };
      
      if (month) {
        const [year, monthNum] = month.split('-').map(Number);
        const periodStart = new Date(year, monthNum - 1, 1);
        const periodEnd = new Date(year, monthNum, 0, 23, 59, 59);
        
        whereClause.blockTimestamp = {
          gte: periodStart,
          lte: periodEnd
        };
      }
      
      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        include: {
          bucket: true
        },
        orderBy: {
          blockTimestamp: 'desc'
        }
      });
      
      // Group transactions by bucket and calculate frequency
      const bucketActivity = new Map();
      
      transactions.forEach(tx => {
        if (!tx.bucketId) return;
        
        const key = tx.bucketId;
        if (!bucketActivity.has(key)) {
          bucketActivity.set(key, {
            bucketId: tx.bucketId,
            bucketName: tx.bucket?.name || 'Unknown',
            transactionCount: 0,
            lastActivity: tx.blockTimestamp,
            firstActivity: tx.blockTimestamp
          });
        }
        
        const bucket = bucketActivity.get(key);
        bucket.transactionCount++;
        
        if (tx.blockTimestamp > bucket.lastActivity) {
          bucket.lastActivity = tx.blockTimestamp;
        }
        if (tx.blockTimestamp < bucket.firstActivity) {
          bucket.firstActivity = tx.blockTimestamp;
        }
      });
      
      const activityData = Array.from(bucketActivity.values())
        .sort((a, b) => b.transactionCount - a.transactionCount);
      
      res.json({
        success: true,
        data: {
          bucketActivity: activityData,
          period: month || 'all-time',
          summary: {
            totalTransactions: transactions.length,
            activeBuckets: activityData.length,
            mostActiveCount: activityData.length > 0 ? activityData[0].transactionCount : 0
          }
        }
      });
    } catch (error) {
      console.error('Error fetching bucket activity:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get budget efficiency
  router.get('/users/:userId/budget-efficiency', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      
      const buckets = await prisma.bucket.findMany({
        where: { 
          userId,
          active: true
        }
      });
      
      const budgetEfficiency = buckets.map(bucket => {
        const monthlyLimit = parseFloat(bucket.monthlyLimit);
        const monthlySpent = parseFloat(bucket.monthlySpent);
        const balance = parseFloat(bucket.balance);
        
        const utilization = monthlyLimit > 0 ? (monthlySpent / monthlyLimit) * 100 : 0;
        const efficiency = monthlyLimit > 0 ? Math.min(100, (monthlySpent / monthlyLimit) * 100) : 0;
        
        return {
          bucketId: bucket.id,
          bucketName: bucket.name,
          monthlyLimit: bucket.monthlyLimit,
          monthlySpent: bucket.monthlySpent,
          currentBalance: bucket.balance,
          utilizationRate: Math.round(utilization * 100) / 100,
          efficiency: Math.round(efficiency * 100) / 100,
          isOverBudget: utilization > 100,
          remainingBudget: monthlyLimit > monthlySpent ? (monthlyLimit - monthlySpent).toString() : '0',
          status: utilization > 100 ? 'over_budget' : utilization > 80 ? 'warning' : 'healthy'
        };
      });
      
      const overallEfficiency = buckets.length > 0 ? 
        budgetEfficiency.reduce((sum, b) => sum + b.efficiency, 0) / buckets.length : 0;
      
      res.json({
        success: true,
        data: {
          bucketEfficiency: budgetEfficiency.sort((a, b) => b.efficiency - a.efficiency),
          overallEfficiency: Math.round(overallEfficiency * 100) / 100,
          summary: {
            totalBuckets: buckets.length,
            healthyBuckets: budgetEfficiency.filter(b => b.status === 'healthy').length,
            warningBuckets: budgetEfficiency.filter(b => b.status === 'warning').length,
            overBudgetBuckets: budgetEfficiency.filter(b => b.status === 'over_budget').length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching budget efficiency:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get seasonal usage patterns
  router.get('/users/:userId/seasonal-patterns', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      
      const seasonalData = await analyticsService.getSeasonalUsagePatterns(userId);
      
      res.json({
        success: true,
        data: seasonalData
      });
    } catch (error) {
      console.error('Error fetching seasonal patterns:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get abandoned buckets
  router.get('/users/:userId/abandoned-buckets', async (req, res) => {
    try {
      const { userId } = userParamsSchema.parse(req.params);
      
      const insights = await analyticsService.getUserFinancialInsights(userId);
      
      // Calculate potential savings
      const abandonedBucketsWithBalance = await Promise.all(
        insights.abandonedBuckets.map(async (bucket) => {
          const bucketData = await prisma.bucket.findUnique({
            where: { id: bucket.bucketId }
          });
          return {
            ...bucket,
            balance: bucketData?.balance || '0'
          };
        })
      );

      const potentialSavings = abandonedBucketsWithBalance.reduce((sum, bucket) => 
        sum + parseFloat(bucket.balance), 0
      ).toString();
      
      res.json({
        success: true,
        data: {
          abandonedBuckets: insights.abandonedBuckets,
          count: insights.abandonedBuckets.length,
          potentialSavings
        }
      });
    } catch (error) {
      console.error('Error fetching abandoned buckets:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
};

export default createAnalyticsRouter;