import { createPublicClient, http, parseAbi, Address, Log, decodeEventLog, getEventSelector } from 'viem';
import { base } from 'viem/chains';
import { PrismaClient } from '@prisma/client';

// Subscription contract events ABI
const subscriptionAbi = parseAbi([
  'event SubscriptionCreated(uint256 indexed subscriptionId, address indexed payer, address indexed recipient, uint256 amount, uint256 periodInDays)',
  'event SubscriptionCharged(uint256 indexed subscriptionId, address indexed payer, address indexed recipient, uint256 amount)',
  'event SubscriptionPaused(uint256 indexed subscriptionId)',
  'event SubscriptionResumed(uint256 indexed subscriptionId)',
  'event SubscriptionCancelled(uint256 indexed subscriptionId)',
  'event SecurityLimitTriggered(address indexed user, string limitType, uint256 amount, uint256 limit)',
  'event SubscriptionCompleted(uint256 indexed subscriptionId, address indexed payer, address indexed recipient)'
]);

interface IndexedSubscriptionEvent {
  contractAddress: Address;
  eventName: string;
  blockNumber: bigint;
  blockHash: string;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  eventData: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}

export class SubscriptionEventService {
  private prisma: PrismaClient;
  private publicClient: any;
  private contractAddress: string;
  private isRunning: boolean = false;
  private lastProcessedBlock: bigint = 0n;

  constructor() {
    this.prisma = new PrismaClient();
    
    // Initialize viem public client
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org')
    });

    this.contractAddress = process.env.EXPENDI_SUBSCRIPTION_CONTRACT_ADDRESS || '';
    
    if (!this.contractAddress) {
      console.warn('Subscription contract address not set. Event monitoring disabled.');
    }
  }

  /**
   * Start monitoring subscription events
   */
  async startEventMonitoring(): Promise<void> {
    if (!this.contractAddress || this.isRunning) {
      return;
    }

    console.log('🔗 Starting subscription event monitoring with viem');
    this.isRunning = true;

    // Initialize last processed block
    await this.initializeLastProcessedBlock();

    // Start polling loop
    this.startPollingLoop();
  }

  /**
   * Stop event monitoring
   */
  stopEventMonitoring(): void {
    console.log('⏹️ Stopping subscription event monitoring');
    this.isRunning = false;
  }

  /**
   * Initialize last processed block from database or contract deployment
   */
  private async initializeLastProcessedBlock(): Promise<void> {
    try {
      // Get current block number
      const currentBlock = await this.publicClient.getBlockNumber();
      
      // Start from 10 blocks ago to catch any recent events we might have missed
      this.lastProcessedBlock = currentBlock - 10n;
      
      console.log(`📊 Starting event monitoring from block: ${this.lastProcessedBlock}`);
    } catch (error) {
      console.error('Error initializing last processed block:', error);
      this.lastProcessedBlock = 0n;
    }
  }

  /**
   * Start the polling loop to check for new events
   */
  private startPollingLoop(): void {
    const pollInterval = 5000; // 5 seconds

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        await this.processNewEvents();
      } catch (error) {
        console.error('Error in polling loop:', error);
      }

      // Continue polling
      setTimeout(poll, pollInterval);
    };

    poll();
  }

  /**
   * Process new events since last processed block
   */
  private async processNewEvents(): Promise<void> {
    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      const fromBlock = this.lastProcessedBlock + 1n;
      
      if (fromBlock > currentBlock) {
        return; // No new blocks to process
      }

      // Get logs for subscription contract
      const logs = await this.publicClient.getLogs({
        address: this.contractAddress as Address,
        fromBlock,
        toBlock: currentBlock,
        topics: [
          [
            getEventSelector('SubscriptionCreated(uint256,address,address,uint256,uint256)'),
            getEventSelector('SubscriptionCharged(uint256,address,address,uint256)'),
            getEventSelector('SubscriptionPaused(uint256)'),
            getEventSelector('SubscriptionResumed(uint256)'),
            getEventSelector('SubscriptionCancelled(uint256)'),
            getEventSelector('SecurityLimitTriggered(address,string,uint256,uint256)'),
            getEventSelector('SubscriptionCompleted(uint256,address,address)')
          ]
        ]
      });

      if (logs.length > 0) {
        console.log(`📋 Found ${logs.length} subscription events from blocks ${fromBlock} to ${currentBlock}`);
        
        // Process each log
        const events = await this.parseEvents(logs);
        await this.processEvents(events);
      }

      // Update last processed block
      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      console.error('Error processing new events:', error);
    }
  }

  /**
   * Parse raw logs into structured events
   */
  private async parseEvents(logs: Log[]): Promise<IndexedSubscriptionEvent[]> {
    const events: IndexedSubscriptionEvent[] = [];

    for (const log of logs) {
      try {
        const decoded = decodeEventLog({
          abi: subscriptionAbi,
          data: log.data,
          topics: log.topics,
        });

        if (!decoded.args || !decoded.eventName) continue;

        // Get block timestamp
        const block = await this.publicClient.getBlock({ blockNumber: log.blockNumber });
        const timestamp = new Date(Number(block.timestamp) * 1000);

        const event: IndexedSubscriptionEvent = {
          contractAddress: log.address,
          eventName: decoded.eventName,
          blockNumber: log.blockNumber!,
          blockHash: log.blockHash!,
          transactionHash: log.transactionHash!,
          transactionIndex: log.transactionIndex!,
          logIndex: log.logIndex!,
          eventData: decoded.args as Record<string, any>,
          timestamp,
          processed: false,
        };

        events.push(event);
      } catch (error) {
        console.error('Error parsing subscription event log:', error);
      }
    }

    return events;
  }

  /**
   * Process parsed events and update database
   */
  private async processEvents(events: IndexedSubscriptionEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.processSpecificEvent(event);
      } catch (error) {
        console.error(`Error processing ${event.eventName} event:`, error);
      }
    }
  }

  /**
   * Process specific event types
   */
  private async processSpecificEvent(event: IndexedSubscriptionEvent): Promise<void> {
    switch (event.eventName) {
      case 'SubscriptionCreated':
        await this.processSubscriptionCreated(event);
        break;
      case 'SubscriptionCharged':
        await this.processSubscriptionCharged(event);
        break;
      case 'SubscriptionPaused':
        await this.processSubscriptionPaused(event);
        break;
      case 'SubscriptionResumed':
        await this.processSubscriptionResumed(event);
        break;
      case 'SubscriptionCancelled':
        await this.processSubscriptionCancelled(event);
        break;
      case 'SecurityLimitTriggered':
        await this.processSecurityLimitTriggered(event);
        break;
      case 'SubscriptionCompleted':
        await this.processSubscriptionCompleted(event);
        break;
      default:
        console.log(`Unknown subscription event: ${event.eventName}`);
    }
  }

  /**
   * Process SubscriptionCreated events
   */
  private async processSubscriptionCreated(event: IndexedSubscriptionEvent): Promise<void> {
    const { subscriptionId, payer, recipient, amount, periodInDays } = event.eventData;
    
    console.log(`✅ Subscription created: ID ${subscriptionId}, Payer: ${payer}, Recipient: ${recipient}`);
    
    // Update subscription in database if it exists
    try {
      await this.prisma.subscription.updateMany({
        where: { subscriptionId: subscriptionId.toString() },
        data: {
          isActive: true,
          createdAt: event.timestamp,
          updatedAt: event.timestamp
        }
      });
    } catch (error) {
      console.error('Error updating subscription from SubscriptionCreated event:', error);
    }
  }

  /**
   * Process SubscriptionCharged events
   */
  private async processSubscriptionCharged(event: IndexedSubscriptionEvent): Promise<void> {
    const { subscriptionId, payer, recipient, amount } = event.eventData;
    
    console.log(`💳 Subscription charged: ID ${subscriptionId}, Amount: ${amount}, Payer: ${payer}`);
    
    // Update last charge timestamp in database
    try {
      await this.prisma.subscription.updateMany({
        where: { subscriptionId: subscriptionId.toString() },
        data: {
          lastChargeTimestamp: event.timestamp,
          updatedAt: event.timestamp
        }
      });
    } catch (error) {
      console.error('Error updating subscription from SubscriptionCharged event:', error);
    }
  }

  /**
   * Process SubscriptionPaused events
   */
  private async processSubscriptionPaused(event: IndexedSubscriptionEvent): Promise<void> {
    const { subscriptionId } = event.eventData;
    
    console.log(`⏸️ Subscription paused: ID ${subscriptionId}`);
    
    try {
      await this.prisma.subscription.updateMany({
        where: { subscriptionId: subscriptionId.toString() },
        data: {
          isPaused: true,
          updatedAt: event.timestamp
        }
      });
    } catch (error) {
      console.error('Error updating subscription from SubscriptionPaused event:', error);
    }
  }

  /**
   * Process SubscriptionResumed events
   */
  private async processSubscriptionResumed(event: IndexedSubscriptionEvent): Promise<void> {
    const { subscriptionId } = event.eventData;
    
    console.log(`▶️ Subscription resumed: ID ${subscriptionId}`);
    
    try {
      await this.prisma.subscription.updateMany({
        where: { subscriptionId: subscriptionId.toString() },
        data: {
          isPaused: false,
          updatedAt: event.timestamp
        }
      });
    } catch (error) {
      console.error('Error updating subscription from SubscriptionResumed event:', error);
    }
  }

  /**
   * Process SubscriptionCancelled events
   */
  private async processSubscriptionCancelled(event: IndexedSubscriptionEvent): Promise<void> {
    const { subscriptionId } = event.eventData;
    
    console.log(`❌ Subscription cancelled: ID ${subscriptionId}`);
    
    try {
      await this.prisma.subscription.updateMany({
        where: { subscriptionId: subscriptionId.toString() },
        data: {
          isActive: false,
          isPaused: false,
          updatedAt: event.timestamp
        }
      });
    } catch (error) {
      console.error('Error updating subscription from SubscriptionCancelled event:', error);
    }
  }

  /**
   * Process SecurityLimitTriggered events
   */
  private async processSecurityLimitTriggered(event: IndexedSubscriptionEvent): Promise<void> {
    const { user, limitType, amount, limit } = event.eventData;
    
    console.warn(`🚨 Security limit triggered: User ${user}, Type: ${limitType}, Amount: ${amount}, Limit: ${limit}`);
    
    // Here you can add additional security monitoring logic:
    // - Send alerts to administrators
    // - Log security events to audit system
    // - Temporarily flag user accounts
  }

  /**
   * Process SubscriptionCompleted events
   */
  private async processSubscriptionCompleted(event: IndexedSubscriptionEvent): Promise<void> {
    const { subscriptionId, payer, recipient } = event.eventData;
    
    console.log(`🎯 Subscription completed: ID ${subscriptionId}, Payer: ${payer}, Recipient: ${recipient}`);
    
    try {
      await this.prisma.subscription.updateMany({
        where: { subscriptionId: subscriptionId.toString() },
        data: {
          isActive: false,
          updatedAt: event.timestamp
        }
      });
    } catch (error) {
      console.error('Error updating subscription from SubscriptionCompleted event:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isRunning: boolean;
    lastProcessedBlock: string;
    contractAddress: string;
  } {
    return {
      isRunning: this.isRunning,
      lastProcessedBlock: this.lastProcessedBlock.toString(),
      contractAddress: this.contractAddress
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopEventMonitoring();
    await this.prisma.$disconnect();
  }
}