import { PrismaClient, Subscription, TransactionStatus, SubscriptionAction } from '@prisma/client';
import { SubscriptionService } from './subscription-service';
import { BaseSubscriptionClient, getBaseClient } from './base-client';
import { addDays } from 'date-fns';

export interface ChargeResult {
  success: boolean;
  subscriptionId: string;
  transactionId?: string;
  error?: string;
  gasUsed?: bigint;
  blockNumber?: bigint;
}

export class SubscriptionCharger {
  constructor(
    private prisma: PrismaClient,
    private subscriptionService: SubscriptionService
  ) {}

  async processAllDueSubscriptions(): Promise<ChargeResult[]> {
    console.log('🔄 Starting subscription charging process...');
    
    const dueSubscriptions = await this.subscriptionService.getDueSubscriptions();
    console.log(`Found ${dueSubscriptions.length} due subscriptions`);
    
    const results: ChargeResult[] = [];
    
    for (const subscription of dueSubscriptions) {
      try {
        const result = await this.processSubscription(subscription);
        results.push(result);
        
        // Add delay between charges to avoid rate limiting
        await this.delay(1000);
      } catch (error) {
        console.error(`Failed to process subscription ${subscription.id}:`, error);
        results.push({
          success: false,
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    console.log(`✅ Completed charging process. ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  async processSubscription(subscription: Subscription): Promise<ChargeResult> {
    console.log(`Processing subscription ${subscription.id} for ${subscription.recurringAmount} ${subscription.currency}`);
    
    const baseClient = getBaseClient(subscription.testnet);
    
    try {
      // Step 1: Check if subscription is still active on-chain
      const isStillSubscribed = await this.checkSubscriptionStatus(baseClient, subscription);
      if (!isStillSubscribed) {
        await this.subscriptionService.updateSubscriptionStatus(
          subscription.id,
          'CANCELLED',
          'Subscription cancelled by user on-chain'
        );
        return {
          success: false,
          subscriptionId: subscription.id,
          error: 'Subscription cancelled by user',
        };
      }

      // Step 2: Create transaction record
      const transactionRecord = await this.createTransactionRecord(subscription);
      
      try {
        // Step 3: Execute the charge
        const chargeResult = await baseClient.executeCharge(
          subscription.subscriptionId,
          subscription.recurringAmount.toString(),
          this.getTokenAddress(subscription.currency, subscription.chainId),
          subscription.payerAddress as `0x${string}`
        );

        // Step 4: Update transaction record with success
        await this.updateTransactionRecord(transactionRecord.id, {
          status: TransactionStatus.COMPLETED,
          transactionHashes: chargeResult.transactionHashes,
          blockNumber: chargeResult.blockNumber,
          gasUsed: chargeResult.gasUsed,
          completedAt: new Date(),
        });

        // Step 5: Update subscription next charge date
        await this.subscriptionService.updateNextChargeDate(subscription.id);

        // Step 6: Create history record
        await this.createHistoryRecord(subscription.id, SubscriptionAction.CHARGED, {
          transactionId: transactionRecord.id,
          amount: subscription.recurringAmount.toString(),
          transactionHashes: chargeResult.transactionHashes,
        });

        // Step 7: Create regular transaction record for integration
        await this.createRegularTransactionRecord(subscription, chargeResult);

        console.log(`✅ Successfully charged subscription ${subscription.id}`);
        
        return {
          success: true,
          subscriptionId: subscription.id,
          transactionId: transactionRecord.id,
          gasUsed: chargeResult.gasUsed,
          blockNumber: chargeResult.blockNumber,
        };

      } catch (chargeError) {
        // Update transaction record with failure
        await this.updateTransactionRecord(transactionRecord.id, {
          status: TransactionStatus.FAILED,
          errorMessage: chargeError instanceof Error ? chargeError.message : 'Charge failed',
          failedAt: new Date(),
          retryCount: transactionRecord.retryCount + 1,
        });

        // Create history record for failed charge
        await this.createHistoryRecord(subscription.id, SubscriptionAction.CHARGE_FAILED, {
          transactionId: transactionRecord.id,
          error: chargeError instanceof Error ? chargeError.message : 'Charge failed',
        });

        throw chargeError;
      }

    } catch (error) {
      console.error(`❌ Failed to charge subscription ${subscription.id}:`, error);
      
      return {
        success: false,
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkSubscriptionStatus(
    baseClient: BaseSubscriptionClient,
    subscription: Subscription
  ): Promise<boolean> {
    try {
      const status = await baseClient.getSubscriptionStatus(subscription.subscriptionId);
      return status.isSubscribed;
    } catch (error) {
      console.error(`Failed to check subscription status for ${subscription.id}:`, error);
      return true; // Assume active if we can't check (don't want to cancel incorrectly)
    }
  }

  private async createTransactionRecord(subscription: Subscription) {
    const periodStart = new Date();
    const periodEnd = addDays(periodStart, subscription.periodInDays);

    return this.prisma.subscriptionTransaction.create({
      data: {
        subscriptionId: subscription.id,
        amount: subscription.recurringAmount,
        currency: subscription.currency,
        status: TransactionStatus.PENDING,
        periodStart,
        periodEnd,
        transactionHashes: [],
      },
    });
  }

  private async updateTransactionRecord(
    transactionId: string,
    data: {
      status: TransactionStatus;
      transactionHashes?: string[];
      blockNumber?: bigint;
      gasUsed?: bigint;
      completedAt?: Date;
      failedAt?: Date;
      errorMessage?: string;
      retryCount?: number;
    }
  ) {
    return this.prisma.subscriptionTransaction.update({
      where: { id: transactionId },
      data,
    });
  }

  private async createHistoryRecord(
    subscriptionId: string,
    action: SubscriptionAction,
    metadata: any
  ) {
    return this.prisma.subscriptionHistory.create({
      data: {
        subscriptionId,
        action,
        performedBy: 'system',
        reason: action === SubscriptionAction.CHARGED ? 'Automatic charge' : 'Charge failed',
        metadata,
      },
    });
  }

  private async createRegularTransactionRecord(
    subscription: Subscription,
    chargeResult: { transactionHashes: string[]; blockNumber: bigint; gasUsed: bigint }
  ) {
    // Create a regular transaction record for integration with existing system
    return this.prisma.transaction.create({
      data: {
        id: `sub_${subscription.id}_${Date.now()}`,
        userId: subscription.userId,
        chainName: this.getChainName(subscription.chainId),
        type: 'SUBSCRIPTION_CHARGE',
        amount: subscription.recurringAmount.toString(),
        tokenAddress: this.getTokenAddress(subscription.currency, subscription.chainId),
        blockNumber: chargeResult.blockNumber.toString(),
        blockTimestamp: new Date(),
        transactionHash: chargeResult.transactionHashes[0],
      },
    });
  }

  private getTokenAddress(currency: string, chainId: number): `0x${string}` {
    // USDC addresses on Base networks
    if (currency === 'USDC') {
      if (chainId === 8453) {
        return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
      } else if (chainId === 84532) {
        return '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
      }
    }
    
    throw new Error(`Unsupported currency ${currency} on chain ${chainId}`);
  }

  private getChainName(chainId: number): string {
    switch (chainId) {
      case 8453: return 'base';
      case 84532: return 'base-sepolia';
      default: throw new Error(`Unsupported chain ID ${chainId}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const createSubscriptionCharger = (
  prisma: PrismaClient,
  subscriptionService: SubscriptionService
) => {
  return new SubscriptionCharger(prisma, subscriptionService);
};