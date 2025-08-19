import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createAnalyticsService, AnalyticsService } from '../lib/analytics';
import { isValidChain, getAllSupportedChains } from '../types/chains';

// Validation schemas
const chainUserParamsSchema = z.object({
  chainName: z.string().refine(isValidChain, 'Invalid chain name'),
  userId: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format')
});

const multiChainUserParamsSchema = z.object({
  userId: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format')
});

const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional()
});

// Create multi-chain analytics router
export const createMultiChainAnalyticsRouter = (prisma: PrismaClient): Router => {
  const router = Router();
  const analyticsService = createAnalyticsService(prisma);

  // Get supported chains
  router.get('/chains', (req, res) => {
    try {
      const supportedChains = getAllSupportedChains().map(chain => ({
        name: chain.name,
        shortName: chain.shortName,
        chainId: chain.chainId,
        isMainnet: chain.isMainnet,
        nativeCurrency: chain.nativeCurrency,
        blockExplorer: chain.blockExplorer
      }));
      
      res.json({
        success: true,
        data: {
          chains: supportedChains,
          count: supportedChains.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get chains'
      });
    }
  });

  // Chain-specific user financial insights
  router.get('/chains/:chainName/users/:userId/insights', async (req, res) => {
    try {
      const { chainName, userId } = chainUserParamsSchema.parse(req.params);
      const compositeUserId = `${chainName}:${userId}`;
      
      const insights = await analyticsService.getUserFinancialInsights(userId);
      
      res.json({
        success: true,
        data: {
          ...insights,
          chainName,
          walletAddress: userId
        }
      });
    } catch (error) {
      console.error('Error fetching chain-specific user insights:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chain-specific bucket usage statistics
  router.get('/chains/:chainName/users/:userId/bucket-usage', async (req, res) => {
    try {
      const { chainName, userId } = chainUserParamsSchema.parse(req.params);
      const { bucketId } = req.query;
      const compositeUserId = `${chainName}:${userId}`;
      const compositeBucketId = bucketId ? `${chainName}:${bucketId}` : undefined;
      
      const bucketStats = await analyticsService.calculateBucketUsageStats(
        compositeUserId, 
        compositeBucketId
      );
      
      // Remove chain prefix from bucket IDs for clean response
      const cleanBucketStats = bucketStats.map(bucket => ({
        ...bucket,
        bucketId: bucket.bucketId.replace(`${chainName}:`, ''),
        chainName
      }));
      
      res.json({
        success: true,
        data: {
          chainName,
          walletAddress: userId,
          buckets: cleanBucketStats,
          summary: {
            totalBuckets: cleanBucketStats.length,
            activeBuckets: cleanBucketStats.filter(b => b.lastActivity).length,
            overBudgetBuckets: cleanBucketStats.filter(b => b.isOverBudget).length,
            totalTransactions: cleanBucketStats.reduce((sum, b) => sum + b.transactionCount, 0)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching chain-specific bucket usage:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chain-specific most used bucket
  router.get('/chains/:chainName/users/:userId/most-used-bucket', async (req, res) => {
    try {
      const { chainName, userId } = chainUserParamsSchema.parse(req.params);
      const compositeUserId = `${chainName}:${userId}`;
      
      const insights = await analyticsService.getUserFinancialInsights(compositeUserId);
      
      const cleanMostUsedBucket = insights.mostUsedBucket ? {
        ...insights.mostUsedBucket,
        bucketId: insights.mostUsedBucket.bucketId.replace(`${chainName}:`, ''),
        chainName
      } : null;
      
      res.json({
        success: true,
        data: {
          chainName,
          walletAddress: userId,
          mostUsedBucket: cleanMostUsedBucket,
          rank: 1
        }
      });
    } catch (error) {
      console.error('Error fetching chain-specific most used bucket:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chain-specific highest spending bucket
  router.get('/chains/:chainName/users/:userId/highest-spending-bucket', async (req, res) => {
    try {
      const { chainName, userId } = chainUserParamsSchema.parse(req.params);
      const compositeUserId = `${chainName}:${userId}`;
      
      const insights = await analyticsService.getUserFinancialInsights(compositeUserId);
      
      const cleanHighestSpendingBucket = insights.highestSpendingBucket ? {
        ...insights.highestSpendingBucket,
        bucketId: insights.highestSpendingBucket.bucketId.replace(`${chainName}:`, ''),
        chainName
      } : null;
      
      res.json({
        success: true,
        data: {
          chainName,
          walletAddress: userId,
          highestSpendingBucket: cleanHighestSpendingBucket,
          rank: 1
        }
      });
    } catch (error) {
      console.error('Error fetching chain-specific highest spending bucket:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chain-specific bucket activity
  router.get('/chains/:chainName/users/:userId/bucket-activity', async (req, res) => {
    try {
      const { chainName, userId } = chainUserParamsSchema.parse(req.params);
      const { month } = monthQuerySchema.parse(req.query);
      const compositeUserId = `${chainName}:${userId}`;
      
      let whereClause: any = { userId: compositeUserId, chainName };
      
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
        
        const cleanBucketId = tx.bucketId.replace(`${chainName}:`, '');
        const key = cleanBucketId;
        
        if (!bucketActivity.has(key)) {
          bucketActivity.set(key, {
            bucketId: cleanBucketId,
            bucketName: tx.bucket?.name || 'Unknown',
            transactionCount: 0,
            lastActivity: tx.blockTimestamp,
            firstActivity: tx.blockTimestamp,
            chainName
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
          chainName,
          walletAddress: userId,
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
      console.error('Error fetching chain-specific bucket activity:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Cross-chain user insights (aggregated across all chains)
  router.get('/users/:userId/cross-chain-insights', async (req, res) => {
    try {
      const { userId } = multiChainUserParamsSchema.parse(req.params);
      
      // Get user data from all chains
      const supportedChains = getAllSupportedChains();
      const chainInsights = await Promise.allSettled(
        supportedChains.map(async (chain) => {
          const compositeUserId = `${chain.shortName}:${userId}`;
          try {
            const insights = await analyticsService.getUserFinancialInsights(compositeUserId);
            return {
              chainName: chain.shortName,
              chainDisplayName: chain.name,
              insights
            };
          } catch (error) {
            return null;
          }
        })
      );
      
      const validChainInsights = chainInsights
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);
      
      // Aggregate cross-chain metrics
      const totalBalance = validChainInsights.reduce((sum, chain) => 
        sum + parseFloat(chain.insights.totalBalance), 0
      ).toString();
      
      const totalSpent = validChainInsights.reduce((sum, chain) => 
        sum + parseFloat(chain.insights.totalSpent), 0
      ).toString();
      
      const totalActiveBuckets = validChainInsights.reduce((sum, chain) => 
        sum + chain.insights.activeBuckets, 0
      );
      
      const averageBudgetAdherence = validChainInsights.length > 0 ? 
        validChainInsights.reduce((sum, chain) => sum + chain.insights.budgetAdherenceRate, 0) / validChainInsights.length : 0;
      
      res.json({
        success: true,
        data: {
          walletAddress: userId,
          crossChainSummary: {
            totalBalance,
            totalSpent,
            totalActiveBuckets,
            averageBudgetAdherence: Math.round(averageBudgetAdherence * 100) / 100,
            activeChains: validChainInsights.length,
            chainsData: validChainInsights
          }
        }
      });
    } catch (error) {
      console.error('Error fetching cross-chain insights:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Cross-chain bucket comparison
  router.get('/users/:userId/cross-chain-buckets', async (req, res) => {
    try {
      const { userId } = multiChainUserParamsSchema.parse(req.params);
      
      const supportedChains = getAllSupportedChains();
      const chainBuckets = await Promise.allSettled(
        supportedChains.map(async (chain) => {
          const compositeUserId = `${chain.shortName}:${userId}`;
          try {
            const bucketStats = await analyticsService.calculateBucketUsageStats(compositeUserId);
            return {
              chainName: chain.shortName,
              chainDisplayName: chain.name,
              buckets: bucketStats.map(bucket => ({
                ...bucket,
                bucketId: bucket.bucketId.replace(`${chain.shortName}:`, ''),
                chainName: chain.shortName
              }))
            };
          } catch (error) {
            return null;
          }
        })
      );
      
      const validChainBuckets = chainBuckets
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);
      
      // Find buckets with similar names across chains
      const bucketNameMap = new Map<string, any[]>();
      
      validChainBuckets.forEach(chain => {
        chain.buckets.forEach((bucket: any) => {
          const bucketName = bucket.bucketName.toLowerCase();
          if (!bucketNameMap.has(bucketName)) {
            bucketNameMap.set(bucketName, []);
          }
          bucketNameMap.get(bucketName)!.push({
            ...bucket,
            chainDisplayName: chain.chainDisplayName
          });
        });
      });
      
      const crossChainBuckets = Array.from(bucketNameMap.entries()).map(([name, buckets]) => ({
        bucketName: name,
        chains: buckets,
        totalSpent: buckets.reduce((sum, bucket) => sum + parseFloat(bucket.totalSpent), 0).toString(),
        totalTransactions: buckets.reduce((sum, bucket) => sum + bucket.transactionCount, 0),
        averageUtilization: buckets.reduce((sum, bucket) => sum + bucket.budgetUtilization, 0) / buckets.length
      }));
      
      res.json({
        success: true,
        data: {
          walletAddress: userId,
          crossChainBuckets: crossChainBuckets.sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent)),
          chainData: validChainBuckets,
          summary: {
            uniqueBucketNames: crossChainBuckets.length,
            totalChainsWithData: validChainBuckets.length,
            totalBucketsAcrossChains: validChainBuckets.reduce((sum, chain) => sum + chain.buckets.length, 0)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching cross-chain buckets:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
};

export default createMultiChainAnalyticsRouter;