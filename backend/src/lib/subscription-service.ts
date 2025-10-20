import { PrismaClient, Subscription, SubscriptionStatus, SubscriptionAction } from '@prisma/client';
import { addDays, startOfDay } from 'date-fns';
import { createBullMQScheduler } from './bullmq-scheduler';

export interface CreateSubscriptionData {
  subscriptionId: string;
  payerAddress: string;
  name: string;
  description?: string;
  category: string;
  recurringAmount: string;
  periodInDays: number;
  customBillingDate?: string;
  testnet: boolean;
  chainId: number;
}

export interface UpdateSubscriptionData {
  name?: string;
  description?: string;
  category?: string;
}

export class SubscriptionService {
  private bullMQScheduler = createBullMQScheduler(this.prisma);
  
  constructor(private prisma: PrismaClient) {}

  async createSubscription(userId: string, data: CreateSubscriptionData): Promise<Subscription> {
    const ownerAddress = process.env.SUBSCRIPTION_OWNER_ADDRESS;
    if (!ownerAddress) {
      throw new Error('Subscription owner address not configured');
    }

    // Ensure user exists, create if not, and get the correct composite userId
    const finalUserId = await this.ensureUserExists(userId, data.payerAddress, data.testnet ? 84532 : 8453);

    // Calculate next charge date based on period or custom date
    let nextChargeDate: Date;
    let customBillingDate: Date | undefined;
    
    if (data.periodInDays === 0 && data.customBillingDate) {
      // Custom scheduled payment
      customBillingDate = new Date(data.customBillingDate);
      nextChargeDate = customBillingDate;
      
      // Validate custom date is in the future
      if (customBillingDate <= new Date()) {
        throw new Error('Custom billing date must be in the future');
      }
    } else if (data.periodInDays > 0) {
      // Regular recurring payment
      nextChargeDate = addDays(new Date(), data.periodInDays);
    } else {
      throw new Error('Invalid period: must be greater than 0 or provide custom billing date');
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId: finalUserId,
        subscriptionId: data.subscriptionId,
        payerAddress: data.payerAddress,
        ownerAddress,
        name: data.name,
        description: data.description,
        category: data.category,
        recurringAmount: data.recurringAmount,
        periodInDays: data.periodInDays,
        customBillingDate,
        nextChargeDate,
        chainId: data.chainId,
        testnet: data.testnet,
        status: SubscriptionStatus.ACTIVE,
        isActive: true,
      },
    });

    // Create history record
    await this.createHistoryRecord(subscription.id, SubscriptionAction.CREATED, finalUserId, {
      reason: 'Subscription created',
      metadata: { subscriptionData: data },
    });

    // Schedule custom billing date subscriptions for precise timing
    if (data.periodInDays === 0 && customBillingDate) {
      await this.bullMQScheduler.scheduleSubscription(subscription);
    }

    return subscription;
  }

  async getUserSubscriptions(
    userId: string,
    filters: {
      status?: SubscriptionStatus;
      category?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ subscriptions: Subscription[]; total: number }> {
    const where: any = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { nextChargeDate: 'asc' },
        take: filters.limit || 10,
        skip: filters.offset || 0,
        include: {
          transactions: {
            orderBy: { attemptedAt: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total };
  }

  async getSubscriptionById(subscriptionId: string, userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      include: {
        transactions: {
          orderBy: { attemptedAt: 'desc' },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async updateSubscription(
    subscriptionId: string,
    userId: string,
    data: UpdateSubscriptionData
  ): Promise<Subscription> {
    const existing = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!existing) {
      throw new Error('Subscription not found');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data,
    });

    // Create history record
    await this.createHistoryRecord(subscriptionId, SubscriptionAction.UPDATED, userId, {
      reason: 'Subscription details updated',
      oldValues: {
        name: existing.name,
        description: existing.description,
        category: existing.category,
      },
      newValues: data,
    });

    return updated;
  }

  async pauseSubscription(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('Can only pause active subscriptions');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.PAUSED,
        isActive: false,
        pausedAt: new Date(),
      },
    });

    // Cancel any scheduled BullMQ jobs for custom billing dates
    if (subscription.periodInDays === 0) {
      await this.bullMQScheduler.cancelScheduledSubscription(subscriptionId);
    }

    // Create history record
    await this.createHistoryRecord(subscriptionId, SubscriptionAction.PAUSED, userId, {
      reason: 'Subscription paused by user',
    });

    return updated;
  }

  async resumeSubscription(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new Error('Can only resume paused subscriptions');
    }

    // Calculate next charge date based on when it was paused
    const pausedDuration = subscription.pausedAt
      ? Date.now() - subscription.pausedAt.getTime()
      : 0;
    const newNextChargeDate = subscription.nextChargeDate 
      ? new Date(subscription.nextChargeDate.getTime() + pausedDuration)
      : new Date(Date.now() + pausedDuration);

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        isActive: true,
        pausedAt: null,
        nextChargeDate: newNextChargeDate,
      },
    });

    // Create history record
    await this.createHistoryRecord(subscriptionId, SubscriptionAction.RESUMED, userId, {
      reason: 'Subscription resumed by user',
      metadata: { newNextChargeDate },
    });

    return updated;
  }

  async cancelSubscription(subscriptionId: string, userId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        isActive: false,
        cancelledAt: new Date(),
      },
    });

    // Cancel any scheduled BullMQ jobs for custom billing dates
    if (subscription.periodInDays === 0) {
      await this.bullMQScheduler.cancelScheduledSubscription(subscriptionId);
    }

    // Create history record
    await this.createHistoryRecord(subscriptionId, SubscriptionAction.CANCELLED, userId, {
      reason: 'Subscription cancelled by user',
    });
  }

  async getDueSubscriptions(): Promise<Subscription[]> {
    const now = new Date();
    return this.prisma.subscription.findMany({
      where: {
        isActive: true,
        status: SubscriptionStatus.ACTIVE,
        nextChargeDate: {
          lte: now,
        },
      },
      include: {
        user: true,
      },
    });
  }

  async updateNextChargeDate(subscriptionId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Handle custom billing dates differently
    if (subscription.periodInDays === 0) {
      // For custom date subscriptions, mark as completed/expired after the single charge
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.EXPIRED,
          isActive: false,
          lastChargeDate: new Date(),
          lastCheckDate: new Date(),
          endDate: new Date(),
        },
      });
    } else if (subscription.nextChargeDate) {
      // Regular recurring subscription - calculate next charge date
      const nextChargeDate = addDays(subscription.nextChargeDate, subscription.periodInDays);

      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          nextChargeDate,
          lastChargeDate: new Date(),
          lastCheckDate: new Date(),
        },
      });
    } else {
      // Edge case: no nextChargeDate, mark as expired
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.EXPIRED,
          isActive: false,
          lastChargeDate: new Date(),
          lastCheckDate: new Date(),
          endDate: new Date(),
        },
      });
    }
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    reason?: string
  ): Promise<void> {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        isActive: status === SubscriptionStatus.ACTIVE,
        lastCheckDate: new Date(),
      },
    });

    // Create history record
    await this.createHistoryRecord(subscriptionId, SubscriptionAction.UPDATED, 'system', {
      reason: reason || `Status updated to ${status}`,
      metadata: { newStatus: status },
    });
  }

  private async ensureUserExists(userId: string, walletAddress: string, chainId: number): Promise<string> {
    const chainName = chainId === 84532 ? 'base-sepolia' : 'base';
    
    // If userId doesn't follow the composite format, create proper composite ID
    const compositeUserId = userId.includes(':') ? userId : `${chainName}:${walletAddress.toLowerCase()}`;
    
    // Check if user already exists (try both provided userId and composite format)
    let existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser && userId !== compositeUserId) {
      existingUser = await this.prisma.user.findUnique({
        where: { id: compositeUserId },
      });
    }

    if (!existingUser) {
      // Create the user with the proper composite ID format
      await this.prisma.user.create({
        data: {
          id: compositeUserId,
          walletAddress: walletAddress.toLowerCase(),
          chainName,
          totalBalance: '0',
          totalSpent: '0',
          bucketsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSyncedAt: new Date(),
        },
      });
      
      return compositeUserId;
    }

    // Return the existing user's ID
    return existingUser.id;
  }

  private async createHistoryRecord(
    subscriptionId: string,
    action: SubscriptionAction,
    performedBy: string,
    data: {
      reason?: string;
      oldValues?: any;
      newValues?: any;
      metadata?: any;
    }
  ): Promise<void> {
    await this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId,
        action,
        performedBy,
        reason: data.reason,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
        metadata: data.metadata || null,
      },
    });
  }
}

export const createSubscriptionService = (prisma: PrismaClient) => {
  return new SubscriptionService(prisma);
};