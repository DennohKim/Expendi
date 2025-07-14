import { Address } from 'viem';
import { config } from '../config/env';
import { getCurrentBlock } from '../blockchain/client';
import { getAllEvents, processEventsWithTimestamps } from '../blockchain/eventListeners';
import { 
  insertEventsBatch, 
  updateIndexerStatus, 
  getIndexerStatus,
  insertWallet,
  insertBucket,
  insertSpending,
  getWalletsByUser
} from '../database/models';
import { IndexedEvent } from '../types';

// Indexer state
interface IndexerState {
  isRunning: boolean;
  lastProcessedBlock: bigint;
  knownWallets: Set<Address>;
}

let indexerState: IndexerState = {
  isRunning: false,
  lastProcessedBlock: 0n,
  knownWallets: new Set(),
};

// Initialize indexer state from database
const initializeIndexerState = async (): Promise<void> => {
  try {
    const factoryStatus = await getIndexerStatus(config.contracts.factory as Address);
    const tokenStatus = await getIndexerStatus(config.contracts.mockUSDC as Address);
    
    // Use the minimum last processed block or start blocks
    const factoryLastBlock = factoryStatus?.lastProcessedBlock || BigInt(config.startBlocks.factory);
    const tokenLastBlock = tokenStatus?.lastProcessedBlock || BigInt(config.startBlocks.mockUSDC);
    
    indexerState.lastProcessedBlock = factoryLastBlock < tokenLastBlock ? factoryLastBlock : tokenLastBlock;
    
    console.log('Indexer state initialized. Last processed block:', indexerState.lastProcessedBlock);
  } catch (error) {
    console.error('Error initializing indexer state:', error);
    indexerState.lastProcessedBlock = BigInt(Math.min(config.startBlocks.factory, config.startBlocks.mockUSDC));
  }
};

// Load known wallets from database
const loadKnownWallets = async (): Promise<void> => {
  try {
    // This would require a query to get all wallet addresses
    // For now, we'll build it dynamically as we process events
    indexerState.knownWallets = new Set();
    console.log('Known wallets loaded');
  } catch (error) {
    console.error('Error loading known wallets:', error);
  }
};

// Process and store events
const processEvents = async (events: IndexedEvent[]): Promise<void> => {
  if (events.length === 0) return;
  
  try {
    // Process events with timestamps
    const eventsWithTimestamps = await processEventsWithTimestamps(events);
    
    // Store events in database
    await insertEventsBatch(eventsWithTimestamps);
    
    // Process specific event types for business logic
    for (const event of eventsWithTimestamps) {
      await processSpecificEvent(event);
    }
    
    console.log(`Processed ${events.length} events`);
  } catch (error) {
    console.error('Error processing events:', error);
    throw error;
  }
};

// Process specific event types for business logic
const processSpecificEvent = async (event: IndexedEvent): Promise<void> => {
  try {
    switch (event.eventName) {
      case 'WalletCreated':
        await processWalletCreated(event);
        break;
      case 'BucketCreated':
        await processBucketCreated(event);
        break;
      case 'Spending':
        await processSpending(event);
        break;
      case 'Transfer':
        await processTransfer(event);
        break;
      default:
        // Other events are just stored, no additional processing needed
        break;
    }
  } catch (error) {
    console.error(`Error processing ${event.eventName} event:`, error);
  }
};

// Process wallet creation events
const processWalletCreated = async (event: IndexedEvent): Promise<void> => {
  const { user, wallet, template } = event.eventData;
  
  // Add wallet to known wallets
  indexerState.knownWallets.add(wallet);
  
  // Insert wallet into registry
  await insertWallet(
    wallet,
    user,
    template,
    event.contractAddress,
    event.blockNumber,
    event.transactionHash
  );
  
  console.log(`New wallet created: ${wallet} for user: ${user}`);
};

// Process bucket creation events
const processBucketCreated = async (event: IndexedEvent): Promise<void> => {
  const { bucketId, name, monthlyLimit, token } = event.eventData;
  
  await insertBucket(
    event.contractAddress,
    bucketId,
    name,
    monthlyLimit,
    token,
    event.blockNumber,
    event.transactionHash
  );
  
  console.log(`New bucket created: ${name} (ID: ${bucketId}) for wallet: ${event.contractAddress}`);
};

// Process spending events
const processSpending = async (event: IndexedEvent): Promise<void> => {
  const { bucketId, amount, recipient, token } = event.eventData;
  
  await insertSpending(
    event.contractAddress,
    bucketId,
    amount,
    recipient,
    token,
    event.blockNumber,
    event.transactionHash,
    event.timestamp
  );
  
  console.log(`Spending recorded: ${amount} from bucket ${bucketId} to ${recipient}`);
};

// Process token transfer events
const processTransfer = async (event: IndexedEvent): Promise<void> => {
  const { from, to, value } = event.eventData;
  
  // Additional processing for transfers involving our wallets
  if (indexerState.knownWallets.has(from) || indexerState.knownWallets.has(to)) {
    console.log(`Token transfer: ${value} from ${from} to ${to}`);
  }
};

// Sync events for a block range
const syncBlockRange = async (fromBlock: bigint, toBlock: bigint): Promise<void> => {
  try {
    console.log(`Syncing blocks ${fromBlock} to ${toBlock}`);
    
    const knownWalletAddresses = Array.from(indexerState.knownWallets);
    const events = await getAllEvents(fromBlock, toBlock, knownWalletAddresses);
    
    if (events.length > 0) {
      await processEvents(events);
    }
    
    // Update indexer status
    await updateIndexerStatus(config.contracts.factory as Address, toBlock);
    await updateIndexerStatus(config.contracts.mockUSDC as Address, toBlock);
    
    indexerState.lastProcessedBlock = toBlock;
    
  } catch (error) {
    console.error(`Error syncing blocks ${fromBlock} to ${toBlock}:`, error);
    throw error;
  }
};

// Main indexer loop
const indexerLoop = async (): Promise<void> => {
  while (indexerState.isRunning) {
    try {
      const currentBlock = await getCurrentBlock();
      const fromBlock = indexerState.lastProcessedBlock + 1n;
      const toBlock = currentBlock;
      
      if (fromBlock <= toBlock) {
        // Process in batches to avoid overwhelming the RPC
        const batchSize = BigInt(config.indexer.batchSize);
        let batchStart = fromBlock;
        
        while (batchStart <= toBlock) {
          const batchEnd = batchStart + batchSize - 1n > toBlock ? toBlock : batchStart + batchSize - 1n;
          
          await syncBlockRange(batchStart, batchEnd);
          batchStart = batchEnd + 1n;
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, config.indexer.pollingInterval));
      
    } catch (error) {
      console.error('Error in indexer loop:', error);
      
      // Wait longer on error before retrying
      await new Promise(resolve => setTimeout(resolve, config.indexer.pollingInterval * 2));
    }
  }
};

// Start indexer
export const startIndexer = async (): Promise<void> => {
  if (indexerState.isRunning) {
    console.log('Indexer is already running');
    return;
  }
  
  console.log('Starting indexer...');
  
  try {
    await initializeIndexerState();
    await loadKnownWallets();
    
    indexerState.isRunning = true;
    
    // Start the main loop
    indexerLoop().catch(error => {
      console.error('Indexer loop crashed:', error);
      indexerState.isRunning = false;
    });
    
    console.log('Indexer started successfully');
  } catch (error) {
    console.error('Failed to start indexer:', error);
    throw error;
  }
};

// Stop indexer
export const stopIndexer = async (): Promise<void> => {
  console.log('Stopping indexer...');
  indexerState.isRunning = false;
  console.log('Indexer stopped');
};

// Get indexer status
export const getIndexerInfo = () => {
  return {
    isRunning: indexerState.isRunning,
    lastProcessedBlock: indexerState.lastProcessedBlock,
    knownWalletsCount: indexerState.knownWallets.size,
  };
};

// Manual sync for specific block range
export const syncManual = async (fromBlock: bigint, toBlock: bigint): Promise<void> => {
  if (indexerState.isRunning) {
    throw new Error('Cannot run manual sync while indexer is running');
  }
  
  console.log(`Manual sync from block ${fromBlock} to ${toBlock}`);
  
  await initializeIndexerState();
  await loadKnownWallets();
  
  const batchSize = BigInt(config.indexer.batchSize);
  let batchStart = fromBlock;
  
  while (batchStart <= toBlock) {
    const batchEnd = batchStart + batchSize - 1n > toBlock ? toBlock : batchStart + batchSize - 1n;
    
    await syncBlockRange(batchStart, batchEnd);
    batchStart = batchEnd + 1n;
    
    console.log(`Progress: ${((batchStart - fromBlock) * 100n / (toBlock - fromBlock + 1n))}%`);
  }
  
  console.log('Manual sync completed');
};