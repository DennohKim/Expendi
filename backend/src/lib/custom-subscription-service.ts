import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { SubscriptionEventService } from './subscription-event-service';

// Import contract ABIs (generated from contract compilation)
import ExpendiSubscriptionsABI from '../contracts/ExpendiSubscriptions.json';

export interface CreateCustomSubscriptionParams {
  payerAddress: string;
  recipientAddress: string;
  amount: string; // Amount in USDC (6 decimals)
  periodInDays: number;
  nextChargeTimestamp: number;
  metadata: {
    name: string;
    description?: string;
    category: string;
    customBillingDate?: string;
  };
}

export interface SubscriptionPermissionParams {
  ownerAddress: string;
  spenderAddress: string;
  allowedAmount: string;
  periodInSeconds: number;
  expiryTimestamp: number;
}

export interface ChargeSubscriptionParams {
  subscriptionId: string;
}

export class CustomSubscriptionService {
  private prisma: PrismaClient;
  private provider: ethers.JsonRpcProvider; // HTTP provider for transactions
  private wallet: ethers.Wallet;
  private usdcAddress: string;
  private contractAddress: string;
  private eventService: SubscriptionEventService;

  constructor() {
    this.prisma = new PrismaClient();
    
    // Initialize HTTP provider for transactions (more reliable for sending txs)
    this.provider = new ethers.JsonRpcProvider(
      process.env.BASE_RPC_URL?.replace('wss://', 'https://') || 'https://mainnet.base.org'
    );
    
    // Initialize event service for monitoring subscription events
    this.eventService = new SubscriptionEventService();
    
    // Initialize backend wallet (this will execute subscription charges)
    const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
    }
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Contract addresses (these should be set after deployment)
    this.usdcAddress = process.env.USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base mainnet USDC
    this.contractAddress = process.env.EXPENDI_SUBSCRIPTION_CONTRACT_ADDRESS || '';
    
    if (!this.contractAddress) {
      console.warn('Subscription contract address not set. Please deploy contract first.');
    }
  }

  /**
   * Start event monitoring
   */
  async startEventMonitoring(): Promise<void> {
    await this.eventService.startEventMonitoring();
  }

  /**
   * Get subscription contract instance for transactions
   */
  private getSubscriptionContract(): ethers.Contract {
    return new ethers.Contract(this.contractAddress, ExpendiSubscriptionsABI.abi, this.wallet);
  }


  /**
   * Create a new subscription
   */
  async createSubscription(params: CreateCustomSubscriptionParams): Promise<{
    subscriptionId: string;
    transactionHash: string;
    contractAddress: string;
  }> {
    try {
      console.log('Creating custom subscription:', params);

      const contract = this.getSubscriptionContract();
      
      // Convert amount to proper units (USDC has 6 decimals)
      const amountInWei = ethers.parseUnits(params.amount, 6);
      
      // Prepare metadata
      const metadata = JSON.stringify(params.metadata);
      
      // Call contract to create subscription
      const tx = await contract.createSubscription(
        params.payerAddress,
        params.recipientAddress,
        amountInWei,
        params.periodInDays,
        params.nextChargeTimestamp,
        metadata
      );
      
      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Extract subscription ID from event logs
      const event = receipt.logs.find((log: any) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog?.name === 'SubscriptionCreated';
        } catch {
          return false;
        }
      });
      
      if (!event) {
        throw new Error('SubscriptionCreated event not found in transaction receipt');
      }
      
      const parsedEvent = contract.interface.parseLog(event);
      const subscriptionId = parsedEvent?.args?.subscriptionId;
      
      if (!subscriptionId) {
        throw new Error('Failed to extract subscription ID from event');
      }
      
      // Save to database
      await this.saveSubscriptionToDatabase({
        subscriptionId: subscriptionId,
        payerAddress: params.payerAddress,
        recipientAddress: params.recipientAddress,
        amount: params.amount,
        periodInDays: params.periodInDays,
        nextChargeTimestamp: new Date(params.nextChargeTimestamp * 1000),
        contractAddress: this.contractAddress,
        metadata: params.metadata,
        transactionHash: tx.hash
      });
      
      return {
        subscriptionId: subscriptionId,
        transactionHash: tx.hash,
        contractAddress: this.contractAddress
      };
      
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a subscription charge
   */
  async chargeSubscription(params: ChargeSubscriptionParams): Promise<{
    success: boolean;
    transactionHash?: string;
    amount?: string;
    error?: string;
  }> {
    try {
      console.log('Executing subscription charge:', params);

      const contract = this.getSubscriptionContract();
      
      // Check if subscription is due for charging
      const isDue = await contract.isSubscriptionDue(params.subscriptionId);
      if (!isDue) {
        return {
          success: false,
          error: 'Subscription is not due for charging yet'
        };
      }
      
      // Get subscription details
      const subscription = await contract.getSubscription(params.subscriptionId);
      
      if (!subscription.isActive || subscription.isPaused) {
        return {
          success: false,
          error: 'Subscription is not active or is paused'
        };
      }
      
      // Execute charge
      const tx = await contract.chargeSubscription(params.subscriptionId);
      console.log('Charge transaction sent:', tx.hash);
      
      // Wait for confirmation
      await tx.wait();
      
      // Update database
      await this.updateSubscriptionAfterCharge(params.subscriptionId, {
        lastChargeTimestamp: new Date(),
        totalCharged: ethers.formatUnits(subscription.totalCharged + subscription.amount, 6),
        chargeCount: subscription.chargeCount + 1,
        transactionHash: tx.hash
      });
      
      return {
        success: true,
        transactionHash: tx.hash,
        amount: ethers.formatUnits(subscription.amount, 6)
      };
      
    } catch (error) {
      console.error('Failed to charge subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get subscription status from blockchain
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<{
    isActive: boolean;
    isPaused: boolean;
    nextChargeTimestamp: number;
    totalCharged: string;
    chargeCount: number;
  }> {
    try {
      const contract = this.getSubscriptionContract();
      const subscription = await contract.getSubscription(subscriptionId);
      
      return {
        isActive: subscription.isActive,
        isPaused: subscription.isPaused,
        nextChargeTimestamp: Number(subscription.nextChargeTimestamp),
        totalCharged: ethers.formatUnits(subscription.totalCharged, 6),
        chargeCount: Number(subscription.chargeCount)
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      throw new Error(`Failed to get subscription status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subscriptionId: string): Promise<string> {
    try {
      const contract = this.getSubscriptionContract();
      const tx = await contract.pauseSubscription(subscriptionId);
      await tx.wait();
      
      // Update database
      await this.updateSubscriptionStatus(subscriptionId, { isPaused: true });
      
      return tx.hash;
    } catch (error) {
      console.error('Failed to pause subscription:', error);
      throw new Error(`Failed to pause subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resume a subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<string> {
    try {
      const contract = this.getSubscriptionContract();
      const tx = await contract.resumeSubscription(subscriptionId);
      await tx.wait();
      
      // Update database
      await this.updateSubscriptionStatus(subscriptionId, { isPaused: false });
      
      return tx.hash;
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      throw new Error(`Failed to resume subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<string> {
    try {
      const contract = this.getSubscriptionContract();
      const tx = await contract.cancelSubscription(subscriptionId);
      await tx.wait();
      
      // Update database
      await this.updateSubscriptionStatus(subscriptionId, { 
        isActive: false,
        isPaused: false 
      });
      
      return tx.hash;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all due subscriptions for charging
   */
  async getDueSubscriptions(): Promise<Array<{
    subscriptionId: string;
    contractAddress: string;
    payerAddress: string;
    recipientAddress: string;
    amount: string;
    nextChargeTimestamp: Date;
  }>> {
    try {
      const currentTimestamp = new Date();
      
      // Get due subscriptions from database
      const dueSubscriptions = await this.prisma.subscription.findMany({
        where: {
          isActive: true,
          isPaused: false,
          nextChargeTimestamp: {
            lte: currentTimestamp
          }
        },
        select: {
          subscriptionId: true,
          contractAddress: true,
          payerAddress: true,
          recipientAddress: true,
          recurringAmount: true,
          nextChargeTimestamp: true
        }
      });
      
      return dueSubscriptions.map(sub => ({
        subscriptionId: sub.subscriptionId,
        contractAddress: this.contractAddress,
        payerAddress: sub.payerAddress,
        recipientAddress: sub.recipientAddress || '',
        amount: sub.recurringAmount.toString(),
        nextChargeTimestamp: sub.nextChargeTimestamp || currentTimestamp
      }));
      
    } catch (error) {
      console.error('Failed to get due subscriptions:', error);
      return [];
    }
  }

  /**
   * Save subscription to database
   */
  private async saveSubscriptionToDatabase(data: {
    subscriptionId: string;
    payerAddress: string;
    recipientAddress: string;
    amount: string;
    periodInDays: number;
    nextChargeTimestamp: Date;
    contractAddress: string;
    metadata: any;
    transactionHash: string;
  }): Promise<void> {
    await this.prisma.subscription.create({
      data: {
        subscriptionId: data.subscriptionId,
        payerAddress: data.payerAddress,
        ownerAddress: process.env.BACKEND_WALLET_ADDRESS || '', // Expendi's wallet address
        recipientAddress: data.recipientAddress,
        name: data.metadata.name,
        description: data.metadata.description || '',
        category: data.metadata.category,
        recurringAmount: data.amount,
        periodInDays: data.periodInDays,
        nextChargeTimestamp: data.nextChargeTimestamp,
        contractAddress: data.contractAddress,
        customBillingDate: data.metadata.customBillingDate,
        isActive: true,
        isPaused: false,
        // Add temporary user relation - in production this should come from the API request
        user: {
          connectOrCreate: {
            where: {
              walletAddress_chainName: {
                walletAddress: data.payerAddress,
                chainName: 'base'
              }
            },
            create: {
              id: data.payerAddress, // Using wallet address as ID temporarily
              walletAddress: data.payerAddress,
              chainName: 'base',
              totalBalance: '0',
              totalSpent: '0',
              bucketsCount: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update subscription after charge
   */
  private async updateSubscriptionAfterCharge(subscriptionId: string, data: {
    lastChargeTimestamp: Date;
    totalCharged: string;
    chargeCount: number;
    transactionHash: string;
  }): Promise<void> {
    await this.prisma.subscription.update({
      where: { subscriptionId },
      data: {
        lastChargeTimestamp: data.lastChargeTimestamp,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Update subscription status
   */
  private async updateSubscriptionStatus(subscriptionId: string, data: {
    isActive?: boolean;
    isPaused?: boolean;
  }): Promise<void> {
    await this.prisma.subscription.update({
      where: { subscriptionId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }


  /**
   * Get user's daily spending information
   */
  async getDailySpendingInfo(userAddress: string): Promise<{
    spentToday: string;
    dailyLimit: string;
    resetTimestamp: number;
  }> {
    try {
      const contract = this.getSubscriptionContract();
      const spendingInfo = await contract.getDailySpendingInfo(userAddress);
      
      return {
        spentToday: ethers.formatUnits(spendingInfo.spentToday, 6),
        dailyLimit: ethers.formatUnits(spendingInfo.dailyLimit, 6),
        resetTimestamp: Number(spendingInfo.resetTimestamp)
      };
    } catch (error) {
      console.error('Failed to get daily spending info:', error);
      throw new Error(`Failed to get daily spending info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user can spend amount without exceeding limits
   */
  async canUserSpend(userAddress: string, amount: string): Promise<boolean> {
    try {
      const contract = this.getSubscriptionContract();
      const amountInWei = ethers.parseUnits(amount, 6);
      
      const canSpend = await contract.canUserSpend(userAddress, amountInWei);
      return canSpend;
    } catch (error) {
      console.error('Failed to check if user can spend:', error);
      return false;
    }
  }

  /**
   * Get event monitoring status
   */
  getEventMonitoringStatus(): {
    isRunning: boolean;
    lastProcessedBlock: string;
    contractAddress: string;
  } {
    return this.eventService.getStatus();
  }

  /**
   * Close database connection and event service
   */
  async close(): Promise<void> {
    try {
      // Cleanup event service
      await this.eventService.cleanup();
      
      // Close database connection
      await this.prisma.$disconnect();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}