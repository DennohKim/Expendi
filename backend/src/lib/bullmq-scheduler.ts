import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient, Subscription } from '@prisma/client';
import { CustomSubscriptionService } from './custom-subscription-service';
import { BlockchainService } from './blockchain-service';

export interface SubscriptionJobData {
  subscriptionId: string;
  scheduledTime: string; // ISO string
  retryCount?: number;
  payerAddress?: string;
  recipientAddress?: string;
  amount?: string;
}

export class BullMQScheduler {
  private queue: Queue;
  private worker: Worker;
  private redis: Redis;
  private customSubscriptionService: CustomSubscriptionService;
  private blockchainService: BlockchainService;

  constructor(private prisma: PrismaClient) {
    // Initialize services
    this.customSubscriptionService = new CustomSubscriptionService();
    this.blockchainService = new BlockchainService();
    
    // Start event monitoring
    this.customSubscriptionService.startEventMonitoring();
    // Redis connection configuration
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    };

    this.redis = new Redis(redisConfig);

    // Initialize queue for subscription payments
    this.queue = new Queue('subscription-payments', {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
      },
    });

    // Initialize worker to process subscription payments
    this.worker = new Worker(
      'subscription-payments',
      async (job: Job<SubscriptionJobData>) => {
        await this.processSubscriptionJob(job);
      },
      {
        connection: redisConfig,
        concurrency: 5, // Process up to 5 subscription payments simultaneously
      }
    );

    // Event listeners for monitoring
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      console.log(`✅ Subscription payment completed: ${job.data.subscriptionId}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Subscription payment failed: ${job?.data.subscriptionId}`, err.message);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`⚠️ Subscription payment stalled: ${jobId}`);
    });

    this.queue.on('error', (err) => {
      console.error('❌ BullMQ Queue error:', err);
    });

    this.worker.on('error', (err) => {
      console.error('❌ BullMQ Worker error:', err);
    });
  }

  async scheduleSubscription(subscription: Subscription): Promise<void> {
    if (subscription.periodInDays !== 0) {
      // Skip recurring subscriptions - handled by regular cron
      return;
    }

    const now = new Date();
    const scheduleTime = subscription.nextChargeTimestamp || subscription.customBillingDate;
    
    if (!scheduleTime) {
      console.error(`No schedule time found for subscription ${subscription.subscriptionId}`);
      return;
    }

    const delay = new Date(scheduleTime).getTime() - now.getTime();

    const jobData: SubscriptionJobData = {
      subscriptionId: subscription.subscriptionId,
      scheduledTime: new Date(scheduleTime).toISOString(),
      payerAddress: subscription.payerAddress,
      recipientAddress: subscription.recipientAddress || '',
      amount: subscription.recurringAmount.toString(),
    };

    if (delay <= 0) {
      // Should be processed immediately
      await this.queue.add(
        'process-subscription',
        jobData,
        { priority: 10 } // High priority for immediate processing
      );
      return;
    }

    // Schedule for exact time using delay
    await this.queue.add(
      'process-subscription',
      jobData,
      {
        delay,
        jobId: `subscription-${subscription.subscriptionId}`, // Unique job ID to prevent duplicates
        priority: 5, // Normal priority for scheduled payments
      }
    );

    console.log(`📅 Scheduled subscription ${subscription.subscriptionId} for ${new Date(scheduleTime).toISOString()} (delay: ${delay}ms)`);
  }

  async scheduleAllCustomSubscriptions(): Promise<void> {
    const customSubscriptions = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        periodInDays: 0, // Custom date subscriptions
        OR: [
          {
            nextChargeTimestamp: {
              gt: new Date(), // Future payments only
            },
          },
          {
            customBillingDate: {
              gt: new Date(), // Future custom billing dates
            },
          },
        ],
      },
    });

    let scheduledCount = 0;
    for (const subscription of customSubscriptions) {
      try {
        await this.scheduleSubscription(subscription);
        scheduledCount++;
      } catch (error) {
        console.error(`Failed to schedule subscription ${subscription.subscriptionId}:`, error);
      }
    }

    console.log(`📅 Scheduled ${scheduledCount}/${customSubscriptions.length} custom subscriptions`);
  }

  private async processSubscriptionJob(job: Job<SubscriptionJobData>): Promise<void> {
    const { subscriptionId, scheduledTime } = job.data;
    
    try {
      // Get fresh subscription data
      const subscription = await this.prisma.subscription.findUnique({
        where: { subscriptionId: subscriptionId },
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      if (!subscription.isActive) {
        console.log(`⏭️ Skipping inactive subscription ${subscriptionId}`);
        return;
      }

      if (subscription.isPaused) {
        console.log(`⏸️ Skipping paused subscription ${subscriptionId}`);
        return;
      }

      console.log(`⏰ Processing scheduled payment for subscription ${subscriptionId} (scheduled: ${scheduledTime})`);
      
      // Security check: Validate user can spend before processing
      if (subscription.payerAddress) {
        const canSpend = await this.customSubscriptionService.canUserSpend(
          subscription.payerAddress, 
          subscription.recurringAmount.toString()
        );
        
        if (!canSpend) {
          console.warn(`⚠️ Security limit check failed for user ${subscription.payerAddress}, amount: ${subscription.recurringAmount} USDC`);
          
          // Get spending info for logging
          try {
            const spendingInfo = await this.customSubscriptionService.getDailySpendingInfo(subscription.payerAddress);
            console.warn(`Daily spending: ${spendingInfo.spentToday}/${spendingInfo.dailyLimit} USDC`);
          } catch (error) {
            console.error('Failed to get spending info:', error);
          }
          
          // Don't process payment, but don't fail the job entirely
          // This allows the subscription to be retried later
          throw new Error(`User ${subscription.payerAddress} has reached spending limits`);
        }
      }
      
      // Use custom subscription service to charge
      const result = await this.customSubscriptionService.chargeSubscription({
        subscriptionId
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Subscription processing failed');
      }

      console.log(`✅ Successfully processed subscription ${subscriptionId}. Amount: ${result.amount} USDC. TX: ${result.transactionHash}`);
      
      // Schedule next payment if recurring
      if (subscription.periodInDays > 0) {
        const nextChargeTime = new Date(Date.now() + subscription.periodInDays * 24 * 60 * 60 * 1000);
        
        // Update database with next charge time
        await this.prisma.subscription.update({
          where: { subscriptionId },
          data: {
            nextChargeTimestamp: nextChargeTime,
            updatedAt: new Date()
          }
        });
        
        // Schedule next payment
        await this.scheduleSubscription({
          ...subscription,
          nextChargeTimestamp: nextChargeTime
        });
        
        console.log(`📅 Scheduled next payment for ${subscriptionId} at ${nextChargeTime.toISOString()}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to process subscription ${subscriptionId}:`, error);
      throw error; // Re-throw to trigger BullMQ retry mechanism
    }
  }

  async cancelScheduledSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const jobId = `subscription-${subscriptionId}`;
      const job = await this.queue.getJob(jobId);
      
      if (job) {
        await job.remove();
        console.log(`❌ Cancelled scheduled subscription ${subscriptionId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to cancel subscription ${subscriptionId}:`, error);
      return false;
    }
  }

  async getScheduledJobsCount(): Promise<number> {
    const waiting = await this.queue.getWaiting();
    const delayed = await this.queue.getDelayed();
    return waiting.length + delayed.length;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async cleanup(): Promise<void> {
    try {
      await this.worker.close();
      await this.queue.close();
      await this.redis.quit();
      await this.customSubscriptionService.close();
      console.log('🧹 BullMQ Scheduler cleanup completed');
    } catch (error) {
      console.error('❌ Error during BullMQ cleanup:', error);
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('❌ BullMQ health check failed:', error);
      return false;
    }
  }
}

export const createBullMQScheduler = (prisma: PrismaClient) => {
  return new BullMQScheduler(prisma);
};