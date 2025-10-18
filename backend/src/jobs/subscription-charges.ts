import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { createSubscriptionService } from '../lib/subscription-service';
import { createSubscriptionCharger } from '../lib/subscription-charger';

export class SubscriptionChargeJob {
  private job: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(
    private prisma: PrismaClient,
    private cronExpression: string = '*/5 * * * *' // Every 5 minutes by default for precise scheduling
  ) {}

  start(): void {
    if (this.job) {
      console.log('⚠️ Subscription charge job is already running');
      return;
    }

    console.log(`🔄 Starting subscription charge job with schedule: ${this.cronExpression}`);
    
    this.job = cron.schedule(this.cronExpression, async () => {
      await this.executeChargeProcess();
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    console.log('✅ Subscription charge job started');
  }

  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 Subscription charge job stopped');
    }
  }

  async executeChargeProcess(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Subscription charging already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🚀 Starting subscription charge process...');
      
      const subscriptionService = createSubscriptionService(this.prisma);
      const charger = createSubscriptionCharger(this.prisma, subscriptionService);
      
      const results = await charger.processAllDueSubscriptions();
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const duration = Date.now() - startTime;

      console.log(`✅ Subscription charge process completed in ${duration}ms`);
      console.log(`📊 Results: ${successful} successful, ${failed} failed`);

      // Log any failures for monitoring
      if (failed > 0) {
        console.warn(`⚠️ ${failed} subscription charges failed:`);
        results
          .filter(r => !r.success)
          .forEach(r => {
            console.warn(`  - ${r.subscriptionId}: ${r.error}`);
          });
      }

    } catch (error) {
      console.error('❌ Subscription charge process failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  isJobRunning(): boolean {
    return this.isRunning;
  }

  getSchedule(): string {
    return this.cronExpression;
  }

  getStatus(): {
    isActive: boolean;
    isCurrentlyRunning: boolean;
    schedule: string;
    nextRun?: Date;
  } {
    return {
      isActive: this.job !== null,
      isCurrentlyRunning: this.isRunning,
      schedule: this.cronExpression,
      nextRun: this.job ? new Date() : undefined, // Placeholder for next run time
    };
  }
}

export const createSubscriptionChargeJob = (
  prisma: PrismaClient,
  cronExpression?: string
) => {
  const schedule = cronExpression || process.env.SUBSCRIPTION_CHECK_CRON || '0 */6 * * *';
  return new SubscriptionChargeJob(prisma, schedule);
};