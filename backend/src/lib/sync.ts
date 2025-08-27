import { PrismaClient } from '@prisma/client';
import { SubgraphService } from './subgraph';
import { MultiChainSubgraphService } from './multi-chain-subgraph';
import { SubgraphUser, SubgraphDeposit, SubgraphWithdrawal, SubgraphBucketTransfer } from '../types/subgraph';

// Helper function to map transaction types
const mapTransactionType = (subgraphType: string) => {
  switch (subgraphType) {
    case 'DIRECT_DEPOSIT':
      return 'DEPOSIT';
    case 'BUCKET_FUNDING':
      return 'BUCKET_FUNDING';
    case 'BUCKET_SPENDING':
      return 'BUCKET_SPENDING';
    case 'UNALLOCATED_WITHDRAW':
      return 'UNALLOCATED_WITHDRAW';
    case 'EMERGENCY_WITHDRAW':
      return 'EMERGENCY_WITHDRAW';
    default:
      return 'WITHDRAWAL';
  }
};

// Process user batch for a specific chain
const processUserBatch = (prisma: PrismaClient, chainName: string) => async (
  users: SubgraphUser[]
): Promise<void> => {
  for (const user of users) {
    const compositeId = `${chainName}:${user.id}`;

    await prisma.user.upsert({
      where: { id: compositeId },
      update: {
        totalBalance: user.totalBalance,
        totalSpent: user.totalSpent,
        bucketsCount: parseInt(user.bucketsCount),
        updatedAt: new Date(parseInt(user.updatedAt) * 1000),
        lastSyncedAt: new Date()
      },
      create: {
        id: compositeId,
        walletAddress: user.id.toLowerCase(),
        chainName,
        totalBalance: user.totalBalance,
        totalSpent: user.totalSpent,
        bucketsCount: parseInt(user.bucketsCount),
        createdAt: new Date(parseInt(user.createdAt) * 1000),
        updatedAt: new Date(parseInt(user.updatedAt) * 1000),
        lastSyncedAt: new Date()
      }
    });

    // Sync user's buckets for this chain
    for (const bucket of user.buckets || []) {
      const bucketCompositeId = `${chainName}:${bucket.id}`;

      await prisma.bucket.upsert({
        where: { id: bucketCompositeId },
        update: {
          name: bucket.name,
          balance: bucket.balance,
          monthlySpent: bucket.monthlySpent,
          monthlyLimit: bucket.monthlyLimit,
          active: bucket.active,
          updatedAt: new Date(parseInt(bucket.updatedAt) * 1000),
          lastSyncedAt: new Date()
        },
        create: {
          id: bucketCompositeId,
          userId: compositeId,
          chainName,
          name: bucket.name,
          balance: bucket.balance,
          monthlySpent: bucket.monthlySpent,
          monthlyLimit: bucket.monthlyLimit,
          active: bucket.active,
          createdAt: new Date(parseInt(bucket.createdAt) * 1000),
          updatedAt: new Date(parseInt(bucket.updatedAt) * 1000),
          lastSyncedAt: new Date()
        }
      });
    }
  }
};

// Sync users for a specific chain
const syncUsersForChain = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  chainName: string
) => async (): Promise<void> => {
  console.log(`👥 Syncing users for ${chainName}...`);
  
  let skip = 0;
  const batchSize = 100;
  let hasMore = true;
  const processUserBatchForChain = processUserBatch(prisma, chainName);

  while (hasMore) {
    const users = await multiChainService.getUsersFromChain(chainName, batchSize, skip);
    
    if (users.length === 0) {
      hasMore = false;
      break;
    }

    await processUserBatchForChain(users);
    skip += batchSize;
    console.log(`📈 Synced ${skip} users for ${chainName}`);
  }
};

// Sync deposits for a specific chain
const syncDepositsForChain = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  chainName: string,
  fromTimestamp?: string
) => async (): Promise<void> => {
  let skip = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    const deposits = await multiChainService.getDepositsFromChain(
      chainName, batchSize, skip, undefined, undefined, fromTimestamp
    );
    
    if (deposits.length === 0) {
      hasMore = false;
      break;
    }

    for (const deposit of deposits) {
      const transactionId = `${chainName}:${deposit.id}`;
      const userId = `${chainName}:${deposit.user.id}`;
      const bucketId = deposit.bucket ? `${chainName}:${deposit.bucket.id}` : null;

      await prisma.transaction.upsert({
        where: { id: transactionId },
        update: {},
        create: {
          id: transactionId,
          bucketId,
          userId,
          chainName,
          type: mapTransactionType(deposit.type),
          amount: deposit.amount,
          tokenAddress: (deposit.token || '0x0000000000000000000000000000000000000000').toLowerCase(),
          blockNumber: deposit.blockNumber,
          blockTimestamp: new Date(parseInt(deposit.timestamp) * 1000),
          transactionHash: deposit.transactionHash
        }
      });
    }

    skip += batchSize;
  }
};

// Sync withdrawals for a specific chain
const syncWithdrawalsForChain = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  chainName: string,
  fromTimestamp?: string
) => async (): Promise<void> => {
  let skip = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    const withdrawals = await multiChainService.getWithdrawalsFromChain(
      chainName, batchSize, skip, undefined, undefined, fromTimestamp
    );
    
    if (withdrawals.length === 0) {
      hasMore = false;
      break;
    }

    for (const withdrawal of withdrawals) {
      const transactionId = `${chainName}:${withdrawal.id}`;
      const userId = `${chainName}:${withdrawal.user.id}`;
      const bucketId = withdrawal.bucket ? `${chainName}:${withdrawal.bucket.id}` : null;

      await prisma.transaction.upsert({
        where: { id: transactionId },
        update: {},
        create: {
          id: transactionId,
          bucketId,
          userId,
          chainName,
          type: mapTransactionType(withdrawal.type),
          amount: withdrawal.amount,
          tokenAddress: (withdrawal.token || '0x0000000000000000000000000000000000000000').toLowerCase(),
          blockNumber: withdrawal.blockNumber,
          blockTimestamp: new Date(parseInt(withdrawal.timestamp) * 1000),
          transactionHash: withdrawal.transactionHash
        }
      });
    }

    skip += batchSize;
  }
};

// Sync bucket transfers for a specific chain
const syncBucketTransfersForChain = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  chainName: string,
  fromTimestamp?: string
) => async (): Promise<void> => {
  let skip = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    const transfers = await multiChainService.getBucketTransfersFromChain(
      chainName, batchSize, skip, undefined, fromTimestamp
    );
    
    if (transfers.length === 0) {
      hasMore = false;
      break;
    }

    for (const transfer of transfers) {
      const transactionId = `${chainName}:${transfer.id}`;
      const userId = `${chainName}:${transfer.user.id}`;
      const bucketId = `${chainName}:${transfer.fromBucket.id}`;

      await prisma.transaction.upsert({
        where: { id: transactionId },
        update: {},
        create: {
          id: transactionId,
          bucketId,
          userId,
          chainName,
          type: 'TRANSFER',
          amount: transfer.amount,
          tokenAddress: (transfer.token || '0x0000000000000000000000000000000000000000').toLowerCase(),
          blockNumber: transfer.blockNumber,
          blockTimestamp: new Date(parseInt(transfer.timestamp) * 1000),
          transactionHash: transfer.transactionHash
        }
      });
    }

    skip += batchSize;
  }
};

// Sync transactions for a specific chain
const syncTransactionsForChain = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  chainName: string
) => async (): Promise<void> => {
  console.log(`💸 Syncing transactions for ${chainName}...`);
  
  // Get the latest synced timestamp for this chain
  const lastSync = await prisma.transaction.findFirst({
    where: { chainName },
    orderBy: { blockTimestamp: 'desc' },
    select: { blockTimestamp: true }
  });

  const fromTimestamp = lastSync ? 
    Math.floor(lastSync.blockTimestamp.getTime() / 1000).toString() : 
    undefined;

  await Promise.all([
    syncDepositsForChain(prisma, multiChainService, chainName, fromTimestamp)(),
    syncWithdrawalsForChain(prisma, multiChainService, chainName, fromTimestamp)(),
    syncBucketTransfersForChain(prisma, multiChainService, chainName, fromTimestamp)()
  ]);
};

// Sync a single chain
export const syncChain = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService
) => async (chainName: string): Promise<void> => {
  console.log(`🔄 Starting sync for ${chainName}...`);
  
  try {
    const isAvailable = await multiChainService.isChainAvailable(chainName);
    if (!isAvailable) {
      console.warn(`⚠️  Chain ${chainName} is not available, skipping sync`);
      return;
    }

    // Sync users first (which includes their buckets)
    await syncUsersForChain(prisma, multiChainService, chainName)();
    
    // Then sync transactions (which reference the buckets)
    await syncTransactionsForChain(prisma, multiChainService, chainName)();

    console.log(`✅ Sync completed for ${chainName}`);
  } catch (error) {
    console.error(`❌ Sync failed for ${chainName}:`, error);
    throw error;
  }
};

// Sync all supported chains
export const syncAllChains = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService
) => async (): Promise<void> => {
  console.log('🔄 Starting multi-chain sync...');
  
  const supportedChains = multiChainService.getSupportedChains();
  const syncChainFn = syncChain(prisma, multiChainService);
  const syncPromises = supportedChains.map(syncChainFn);
  
  await Promise.allSettled(syncPromises);
  console.log('✅ Multi-chain sync completed');
};

// Sync specific user across all chains
export const syncUserAcrossChains = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService
) => async (walletAddress: string): Promise<void> => {
  console.log(`🔄 Syncing user ${walletAddress} across all chains...`);
  
  const supportedChains = multiChainService.getSupportedChains();
  const syncUserOnChainFn = syncUserOnChain(prisma, multiChainService);
  const syncPromises = supportedChains.map(chainName => 
    syncUserOnChainFn(walletAddress, chainName)
  );
  
  await Promise.allSettled(syncPromises);
  console.log(`✅ User ${walletAddress} synced across all chains`);
};

// Sync user on a specific chain
const syncUserOnChain = (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService
) => async (walletAddress: string, chainName: string): Promise<void> => {
  try {
    const buckets = await multiChainService.getUserBucketsFromChain(chainName, walletAddress);
    
    if (buckets.length > 0) {
      // Process as a single-user batch
      const mockUser: SubgraphUser = {
        id: walletAddress,
        totalBalance: '0',
        totalSpent: '0',
        bucketsCount: buckets.length.toString(),
        createdAt: Math.floor(Date.now() / 1000).toString(),
        updatedAt: Math.floor(Date.now() / 1000).toString(),
        buckets
      };

      const processUserBatchForChain = processUserBatch(prisma, chainName);
      await processUserBatchForChain([mockUser]);
      
      // Sync recent transactions for this user on this chain
      await syncRecentTransactionsForUser(prisma, multiChainService, walletAddress, chainName);
    }
  } catch (error) {
    console.warn(`Failed to sync user ${walletAddress} on ${chainName}:`, error);
  }
};

// Sync recent transactions for a user on a specific chain
const syncRecentTransactionsForUser = async (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  walletAddress: string,
  chainName: string
): Promise<void> => {
  const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000).toString();

  try {
    await Promise.all([
      syncDepositsForUserOnChain(prisma, multiChainService, walletAddress, chainName, oneDayAgo),
      syncWithdrawalsForUserOnChain(prisma, multiChainService, walletAddress, chainName, oneDayAgo),
      syncBucketTransfersForUserOnChain(prisma, multiChainService, walletAddress, chainName, oneDayAgo)
    ]);
  } catch (error) {
    console.warn(`Failed to sync recent transactions for user ${walletAddress} on ${chainName}:`, error);
  }
};

// Helper functions for syncing user-specific transactions
const syncDepositsForUserOnChain = async (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  walletAddress: string,
  chainName: string,
  fromTimestamp: string
): Promise<void> => {
  const deposits = await multiChainService.getDepositsFromChain(
    chainName, 100, 0, walletAddress, undefined, fromTimestamp
  );

  for (const deposit of deposits) {
    const transactionId = `${chainName}:${deposit.id}`;
    const userId = `${chainName}:${deposit.user.id}`;
    const bucketId = deposit.bucket ? `${chainName}:${deposit.bucket.id}` : null;

    await prisma.transaction.upsert({
      where: { id: transactionId },
      update: {},
      create: {
        id: transactionId,
        bucketId,
        userId,
        chainName,
        type: mapTransactionType(deposit.type),
        amount: deposit.amount,
        tokenAddress: (deposit.token || '0x0000000000000000000000000000000000000000').toLowerCase(),
        blockNumber: deposit.blockNumber,
        blockTimestamp: new Date(parseInt(deposit.timestamp) * 1000),
        transactionHash: deposit.transactionHash
      }
    });
  }
};

const syncWithdrawalsForUserOnChain = async (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  walletAddress: string,
  chainName: string,
  fromTimestamp: string
): Promise<void> => {
  const withdrawals = await multiChainService.getWithdrawalsFromChain(
    chainName, 100, 0, walletAddress, undefined, fromTimestamp
  );

  for (const withdrawal of withdrawals) {
    const transactionId = `${chainName}:${withdrawal.id}`;
    const userId = `${chainName}:${withdrawal.user.id}`;
    const bucketId = withdrawal.bucket ? `${chainName}:${withdrawal.bucket.id}` : null;

    await prisma.transaction.upsert({
      where: { id: transactionId },
      update: {},
      create: {
        id: transactionId,
        bucketId,
        userId,
        chainName,
        type: mapTransactionType(withdrawal.type),
        amount: withdrawal.amount,
        tokenAddress: (withdrawal.token || '0x0000000000000000000000000000000000000000').toLowerCase(),
        blockNumber: withdrawal.blockNumber,
        blockTimestamp: new Date(parseInt(withdrawal.timestamp) * 1000),
        transactionHash: withdrawal.transactionHash
      }
    });
  }
};

const syncBucketTransfersForUserOnChain = async (
  prisma: PrismaClient,
  multiChainService: MultiChainSubgraphService,
  walletAddress: string,
  chainName: string,
  fromTimestamp: string
): Promise<void> => {
  const transfers = await multiChainService.getBucketTransfersFromChain(
    chainName, 100, 0, walletAddress, fromTimestamp
  );

  for (const transfer of transfers) {
    const transactionId = `${chainName}:${transfer.id}`;
    const userId = `${chainName}:${transfer.user.id}`;
    const bucketId = `${chainName}:${transfer.fromBucket.id}`;

    await prisma.transaction.upsert({
      where: { id: transactionId },
      update: {},
      create: {
        id: transactionId,
        bucketId,
        userId,
        chainName,
        type: 'TRANSFER',
        amount: transfer.amount,
        tokenAddress: (transfer.token || '0x0000000000000000000000000000000000000000').toLowerCase(),
        blockNumber: transfer.blockNumber,
        blockTimestamp: new Date(parseInt(transfer.timestamp) * 1000),
        transactionHash: transfer.transactionHash
      }
    });
  }
};

// Legacy single-chain sync functions for backward compatibility
export const syncUsers = (prisma: PrismaClient, subgraphService: SubgraphService) => async (): Promise<void> => {
  console.log('Starting user sync...');
  
  let skip = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    const users = await subgraphService.getUsers(batchSize, skip);
    
    if (users.length === 0) {
      hasMore = false;
      break;
    }

    await processUserBatchLegacy(prisma, users);
    skip += batchSize;
    console.log(`Synced ${skip} users`);
  }

  console.log('User sync completed');
};

const processUserBatchLegacy = async (prisma: PrismaClient, users: SubgraphUser[]): Promise<void> => {
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        walletAddress: user.id.toLowerCase(),
        totalBalance: user.totalBalance,
        totalSpent: user.totalSpent,
        bucketsCount: parseInt(user.bucketsCount),
        updatedAt: new Date(parseInt(user.updatedAt) * 1000),
        lastSyncedAt: new Date()
      },
      create: {
        id: user.id,
        walletAddress: user.id.toLowerCase(),
        chainName: 'base', // Default to base for legacy compatibility
        totalBalance: user.totalBalance,
        totalSpent: user.totalSpent,
        bucketsCount: parseInt(user.bucketsCount),
        createdAt: new Date(parseInt(user.createdAt) * 1000),
        updatedAt: new Date(parseInt(user.updatedAt) * 1000),
        lastSyncedAt: new Date()
      }
    });

    // Sync user's buckets
    for (const bucket of user.buckets || []) {
      await prisma.bucket.upsert({
        where: { id: bucket.id },
        update: {
          name: bucket.name,
          balance: bucket.balance,
          monthlySpent: bucket.monthlySpent,
          monthlyLimit: bucket.monthlyLimit,
          active: bucket.active,
          updatedAt: new Date(parseInt(bucket.updatedAt) * 1000),
          lastSyncedAt: new Date()
        },
        create: {
          id: bucket.id,
          userId: user.id,
          chainName: 'base', // Default to base for legacy compatibility
          name: bucket.name,
          balance: bucket.balance,
          monthlySpent: bucket.monthlySpent,
          monthlyLimit: bucket.monthlyLimit,
          active: bucket.active,
          createdAt: new Date(parseInt(bucket.createdAt) * 1000),
          updatedAt: new Date(parseInt(bucket.updatedAt) * 1000),
          lastSyncedAt: new Date()
        }
      });
    }
  }
};

export const fullSync = (prisma: PrismaClient, subgraphService: SubgraphService) => async (): Promise<void> => {
  console.log('Starting full sync...');
  
  await syncUsers(prisma, subgraphService)();
  // Note: Legacy transaction sync would go here but omitted for brevity
  
  console.log('Full sync completed');
};