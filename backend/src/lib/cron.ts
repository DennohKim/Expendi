import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { createMultiChainSubgraphService } from './multi-chain-subgraph';
import { syncAllChains } from './sync';
import { createAnalyticsService } from './analytics';

export interface CronService {
  start: () => void;
  stop: () => void;
  getStatus: () => { syncJob: boolean; analyticsJob: boolean };
}

export const createCronService = (prisma: PrismaClient): CronService => {
  const multiChainSubgraph = createMultiChainSubgraphService();
  const analyticsService = createAnalyticsService(prisma);
  
  // Get intervals from environment or use defaults
  const syncInterval = process.env.SYNC_INTERVAL || '0 */5 * * * *'; // Every 5 minutes
  const analyticsInterval = process.env.ANALYTICS_INTERVAL || '0 0 * * *'; // Daily at midnight
  
  let syncTask: cron.ScheduledTask | null = null;
  let analyticsTask: cron.ScheduledTask | null = null;

  const start = () => {
    console.log('🚀 Starting cron jobs...');
    
    // Sync job
    if (cron.validate(syncInterval)) {
      syncTask = cron.schedule(syncInterval, async () => {
        try {
          console.log('🔄 Running scheduled sync across all chains...');
          const startTime = Date.now();
          
          await syncAllChains(prisma, multiChainSubgraph)();
          
          const duration = Date.now() - startTime;
          console.log(`✅ Scheduled sync completed successfully in ${duration}ms`);
        } catch (error) {
          console.error('❌ Scheduled sync failed:', error);
        }
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'UTC'
      });

      syncTask.start();
      console.log(`⏰ Sync job scheduled: ${syncInterval} (UTC)`);
    } else {
      console.error(`❌ Invalid sync interval: ${syncInterval}`);
    }

    // Analytics calculation job
    if (cron.validate(analyticsInterval)) {
      analyticsTask = cron.schedule(analyticsInterval, async () => {
        try {
          console.log('📊 Running scheduled analytics calculation...');
          const startTime = Date.now();
          
          // Get all unique users from the database
          const users = await prisma.user.findMany({
            select: { id: true },
            distinct: ['id']
          });

          // Calculate analytics for all users for the current month
          const currentMonth = new Date().toISOString().substring(0, 7);
          
          for (const user of users) {
            try {
              await analyticsService.calculateMonthlyAnalytics(user.id, currentMonth);
            } catch (error) {
              console.error(`Failed to calculate analytics for user ${user.id}:`, error);
              // Continue with other users even if one fails
            }
          }
          
          const duration = Date.now() - startTime;
          console.log(`✅ Scheduled analytics calculation completed for ${users.length} users in ${duration}ms`);
        } catch (error) {
          console.error('❌ Scheduled analytics calculation failed:', error);
        }
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'UTC'
      });

      analyticsTask.start();
      console.log(`📈 Analytics job scheduled: ${analyticsInterval} (UTC)`);
    } else {
      console.error(`❌ Invalid analytics interval: ${analyticsInterval}`);
    }
  };

  const stop = () => {
    console.log('🛑 Stopping cron jobs...');
    
    if (syncTask) {
      syncTask.stop();
      syncTask = null;
      console.log('⏹️ Sync job stopped');
    }
    
    if (analyticsTask) {
      analyticsTask.stop();
      analyticsTask = null;
      console.log('⏹️ Analytics job stopped');
    }
  };

  const getStatus = () => {
    return {
      syncJob: syncTask !== null,
      analyticsJob: analyticsTask !== null
    };
  };

  return {
    start,
    stop,
    getStatus
  };
};