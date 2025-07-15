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
  getWalletsByUser,
  getAllWalletAddresses,
  insertTransfer,
  insertWithdrawal
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
    const walletAddresses = await getAllWalletAddresses();
    indexerState.knownWallets = new Set(walletAddresses);
    console.log(`Known wallets loaded: ${walletAddresses.length} wallets`);
    if (walletAddresses.length > 0) {
      console.log('Wallet addresses:', walletAddresses.join(', '));
    }
  } catch (error) {
    console.error('Error loading known wallets:', error);
    indexerState.knownWallets = new Set();
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
      case 'WalletRegistered':
        await processWalletRegistered(event);
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
      case 'UnallocatedWithdraw':
        await processUnallocatedWithdraw(event);
        break;
      case 'EmergencyWithdraw':
        await processEmergencyWithdraw(event);
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
  const { user, wallet, salt } = event.eventData;
  
  // Add wallet to known wallets
  indexerState.knownWallets.add(wallet);
  
  // Insert wallet into registry (using salt instead of template)
  await insertWallet(
    wallet,
    user,
    event.contractAddress, // factory address as template
    event.contractAddress,
    event.blockNumber,
    event.transactionHash
  );
  
  console.log(`🆕 New wallet created: ${wallet} for user: ${user} with salt: ${salt}`);
  console.log(`📊 Now monitoring ${indexerState.knownWallets.size} wallet contracts`);
};

// Process wallet registration events
const processWalletRegistered = async (event: IndexedEvent): Promise<void> => {
  const { user, wallet } = event.eventData;
  
  // Add wallet to known wallets
  indexerState.knownWallets.add(wallet);
  
  console.log(`Wallet registered: ${wallet} for user: ${user}`);
};

// Process bucket creation events
const processBucketCreated = async (event: IndexedEvent): Promise<void> => {
  const { user, bucketName, monthlyLimit } = event.eventData;
  
  try {
    // Since the new contract doesn't emit bucketId, we'll use bucketName hash as ID
    // and default token to ETH (address zero for native ETH)
    const nameHex = Buffer.from(bucketName).toString('hex').padEnd(16, '0').slice(0, 16);
    const bucketId = BigInt(`0x${nameHex}`);
    const defaultTokenAddress = '0x0000000000000000000000000000000000000000'; // ETH
    
    await insertBucket(
      event.contractAddress,
      bucketId,
      bucketName,
      BigInt(monthlyLimit),
      defaultTokenAddress,
      event.blockNumber,
      event.transactionHash
    );
    
    console.log(`🪣 New bucket created: "${bucketName}" for user: ${user} in wallet: ${event.contractAddress}`);
    console.log(`   Monthly limit: ${monthlyLimit} - Saved to database with ID: ${bucketId}`);
  } catch (error) {
    console.error(`Error saving bucket "${bucketName}" to database:`, error);
  }
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
  
  // Only process transfers involving our tracked wallets
  if (!indexerState.knownWallets.has(from) && !indexerState.knownWallets.has(to)) {
    return;
  }
  
  try {
    const { transferType, walletAddress, fromBucketId, toBucketId } = classifyTransfer(from, to);
    
    await insertTransfer(
      event.contractAddress, // token address
      from,
      to,
      BigInt(value),
      transferType,
      walletAddress,
      fromBucketId,
      toBucketId,
      event.blockNumber,
      event.transactionHash,
      event.logIndex,
      event.timestamp
    );
    
    console.log(`💸 ${transferType}: ${value} ${event.contractAddress} from ${from} to ${to}`);
    if (walletAddress) {
      console.log(`   Wallet: ${walletAddress}`);
    }
  } catch (error) {
    console.error(`Error processing transfer from ${from} to ${to}:`, error);
  }
};

// Classify transfer type based on from/to addresses
const classifyTransfer = (
  from: Address, 
  to: Address
): {
  transferType: 'deposit' | 'withdrawal' | 'bucket_transfer' | 'external';
  walletAddress: Address | null;
  fromBucketId: bigint | null;
  toBucketId: bigint | null;
} => {
  const fromIsWallet = indexerState.knownWallets.has(from);
  const toIsWallet = indexerState.knownWallets.has(to);
  
  if (fromIsWallet && toIsWallet) {
    // Transfer between two budget wallets - could be bucket transfer
    return {
      transferType: 'bucket_transfer',
      walletAddress: from, // Use sender as primary wallet
      fromBucketId: null, // TODO: Need to determine from transaction context
      toBucketId: null
    };
  } else if (toIsWallet && !fromIsWallet) {
    // External address sending to budget wallet = deposit
    return {
      transferType: 'deposit',
      walletAddress: to,
      fromBucketId: null,
      toBucketId: null
    };
  } else if (fromIsWallet && !toIsWallet) {
    // Budget wallet sending to external address = withdrawal
    return {
      transferType: 'withdrawal',
      walletAddress: from,
      fromBucketId: null, // TODO: Need to determine from transaction context
      toBucketId: null
    };
  } else {
    // Shouldn't happen given our filter, but handle gracefully
    return {
      transferType: 'external',
      walletAddress: null,
      fromBucketId: null,
      toBucketId: null
    };
  }
};

// Process unallocated withdrawal events
const processUnallocatedWithdraw = async (event: IndexedEvent): Promise<void> => {
  const { user, token, amount, recipient } = event.eventData;
  
  try {
    await insertWithdrawal(
      event.contractAddress, // wallet address
      user,
      recipient,
      token,
      BigInt(amount),
      'unallocated',
      event.blockNumber,
      event.transactionHash,
      event.logIndex,
      event.timestamp
    );
    
    console.log(`💸 Unallocated withdrawal: ${amount} ${token} from ${user} to ${recipient}`);
  } catch (error) {
    console.error(`Error processing unallocated withdrawal:`, error);
  }
};

// Process emergency withdrawal events
const processEmergencyWithdraw = async (event: IndexedEvent): Promise<void> => {
  const { user, token, amount } = event.eventData;
  
  try {
    await insertWithdrawal(
      event.contractAddress, // wallet address
      user,
      user, // In emergency withdrawals, recipient is the user
      token,
      BigInt(amount),
      'emergency',
      event.blockNumber,
      event.transactionHash,
      event.logIndex,
      event.timestamp
    );
    
    console.log(`🚨 Emergency withdrawal: ${amount} ${token} for user ${user}`);
  } catch (error) {
    console.error(`Error processing emergency withdrawal:`, error);
  }
};

// Sync events for a block range
const syncBlockRange = async (fromBlock: bigint, toBlock: bigint): Promise<void> => {
  try {
    console.log(`Syncing blocks ${fromBlock} to ${toBlock}`);
    
    const knownWalletAddresses = Array.from(indexerState.knownWallets);
    if (knownWalletAddresses.length > 0) {
      console.log(`Monitoring ${knownWalletAddresses.length} wallet contracts for events`);
    }
    
    const events = await getAllEvents(fromBlock, toBlock, knownWalletAddresses);
    
    if (events.length > 0) {
      console.log(`Found ${events.length} events to process`);
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
  
  console.log(`📊 Manual sync from block ${fromBlock} to ${toBlock}`);
  
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
  
  console.log('✅ Manual sync completed');
};