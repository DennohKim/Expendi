import { Address, Hash } from 'viem';
import { query, transaction } from './connection';
import { IndexedEvent, IndexerStatus, ContractEvent, EventQueryParams } from '../types';

// Helper function to serialize BigInt values for JSON
const serializeEventData = (data: Record<string, any>): string => {
  return JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
};

// Event operations
export const insertEvent = async (event: Omit<IndexedEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
  const sql = `
    INSERT INTO events (
      contract_address, event_name, block_number, block_hash, 
      transaction_hash, transaction_index, log_index, event_data, 
      timestamp, processed
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `;
  
  const values = [
    event.contractAddress,
    event.eventName,
    event.blockNumber.toString(),
    event.blockHash,
    event.transactionHash,
    event.transactionIndex,
    event.logIndex,
    serializeEventData(event.eventData),
    event.timestamp,
    event.processed
  ];
  
  const result = await query(sql, values);
  return result.rows[0].id;
};

export const getEventsByContract = async (contractAddress: Address, limit = 100, offset = 0): Promise<IndexedEvent[]> => {
  const sql = `
    SELECT * FROM events 
    WHERE contract_address = $1 
    ORDER BY block_number DESC, log_index DESC 
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(sql, [contractAddress, limit, offset]);
  return result.rows.map(mapRowToEvent);
};

export const getEventsByQuery = async (params: EventQueryParams): Promise<IndexedEvent[]> => {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (params.contractAddress) {
    conditions.push(`contract_address = $${paramIndex++}`);
    values.push(params.contractAddress);
  }
  
  if (params.eventName) {
    conditions.push(`event_name = $${paramIndex++}`);
    values.push(params.eventName);
  }
  
  if (params.blockNumber) {
    conditions.push(`block_number = $${paramIndex++}`);
    values.push(params.blockNumber.toString());
  }
  
  if (params.transactionHash) {
    conditions.push(`transaction_hash = $${paramIndex++}`);
    values.push(params.transactionHash);
  }
  
  if (params.startBlock) {
    conditions.push(`block_number >= $${paramIndex++}`);
    values.push(params.startBlock.toString());
  }
  
  if (params.endBlock) {
    conditions.push(`block_number <= $${paramIndex++}`);
    values.push(params.endBlock.toString());
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = params.limit || 100;
  const offset = ((params.page || 1) - 1) * limit;
  
  const sql = `
    SELECT * FROM events 
    ${whereClause}
    ORDER BY block_number DESC, log_index DESC 
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;
  
  values.push(limit, offset);
  
  const result = await query(sql, values);
  return result.rows.map(mapRowToEvent);
};

// Wallet operations
export const insertWallet = async (
  walletAddress: Address,
  userAddress: Address,
  templateAddress: Address,
  factoryAddress: Address,
  deploymentBlock: bigint,
  deploymentTxHash: Hash
): Promise<number> => {
  const sql = `
    INSERT INTO wallet_registry (
      wallet_address, user_address, template_address, 
      factory_address, deployment_block, deployment_tx_hash
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (wallet_address) DO NOTHING
    RETURNING id
  `;
  
  const values = [
    walletAddress,
    userAddress,
    templateAddress,
    factoryAddress,
    deploymentBlock.toString(),
    deploymentTxHash
  ];
  
  const result = await query(sql, values);
  return result.rows[0]?.id || 0;
};

export const getWalletsByUser = async (userAddress: Address): Promise<any[]> => {
  const sql = `
    SELECT id, wallet_address, user_address, template_address, created_at 
    FROM wallet_registry 
    WHERE user_address = $1 
    ORDER BY created_at DESC
  `;
  
  const result = await query(sql, [userAddress]);
  return result.rows;
};

// Get all wallet addresses for indexing
export const getAllWalletAddresses = async (): Promise<Address[]> => {
  const sql = `
    SELECT DISTINCT wallet_address FROM wallet_registry 
    ORDER BY wallet_address
  `;
  
  const result = await query(sql);
  return result.rows.map((row: any) => row.wallet_address as Address);
};

// Bucket operations
export const insertBucket = async (
  walletAddress: Address,
  bucketId: bigint,
  name: string,
  monthlyLimit: bigint,
  tokenAddress: Address,
  createdBlock: bigint,
  createdTxHash: Hash
): Promise<number> => {
  const sql = `
    INSERT INTO buckets (
      wallet_address, bucket_id, name, monthly_limit, 
      token_address, created_block, created_tx_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (wallet_address, bucket_id) DO UPDATE SET
      name = EXCLUDED.name,
      monthly_limit = EXCLUDED.monthly_limit,
      token_address = EXCLUDED.token_address,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  
  const values = [
    walletAddress,
    bucketId.toString(),
    name,
    monthlyLimit.toString(),
    tokenAddress,
    createdBlock.toString(),
    createdTxHash
  ];
  
  const result = await query(sql, values);
  return result.rows[0].id;
};

export const getBucketsByWallet = async (walletAddress: Address): Promise<any[]> => {
  const sql = `
    SELECT * FROM buckets 
    WHERE wallet_address = $1 AND is_active = true
    ORDER BY created_at ASC
  `;
  
  const result = await query(sql, [walletAddress]);
  return result.rows;
};

// Spending operations
export const insertSpending = async (
  walletAddress: Address,
  bucketId: bigint,
  amount: bigint,
  recipient: Address,
  tokenAddress: Address,
  blockNumber: bigint,
  transactionHash: Hash,
  timestamp: Date
): Promise<number> => {
  const sql = `
    INSERT INTO spending_records (
      wallet_address, bucket_id, amount, recipient, 
      token_address, block_number, transaction_hash, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `;
  
  const values = [
    walletAddress,
    bucketId.toString(),
    amount.toString(),
    recipient,
    tokenAddress,
    blockNumber.toString(),
    transactionHash,
    timestamp
  ];
  
  const result = await query(sql, values);
  return result.rows[0].id;
};

export const getSpendingByWallet = async (walletAddress: Address, limit = 100): Promise<any[]> => {
  const sql = `
    SELECT * FROM spending_records 
    WHERE wallet_address = $1 
    ORDER BY timestamp DESC 
    LIMIT $2
  `;
  
  const result = await query(sql, [walletAddress, limit]);
  return result.rows;
};

// Transfer operations
export const insertTransfer = async (
  tokenAddress: Address,
  fromAddress: Address,
  toAddress: Address,
  amount: bigint,
  transferType: 'deposit' | 'withdrawal' | 'bucket_transfer' | 'external',
  walletAddress: Address | null,
  fromBucketId: bigint | null,
  toBucketId: bigint | null,
  blockNumber: bigint,
  transactionHash: Hash,
  logIndex: number,
  timestamp: Date
): Promise<number> => {
  const sql = `
    INSERT INTO transfers (
      token_address, from_address, to_address, amount, transfer_type,
      wallet_address, from_bucket_id, to_bucket_id, block_number,
      transaction_hash, log_index, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `;
  
  const values = [
    tokenAddress,
    fromAddress,
    toAddress,
    amount.toString(),
    transferType,
    walletAddress,
    fromBucketId?.toString() || null,
    toBucketId?.toString() || null,
    blockNumber.toString(),
    transactionHash,
    logIndex,
    timestamp
  ];
  
  const result = await query(sql, values);
  return result.rows[0].id;
};

export const getTransfersByWallet = async (walletAddress: Address, limit = 100): Promise<any[]> => {
  const sql = `
    SELECT * FROM transfers 
    WHERE wallet_address = $1 OR from_address = $1 OR to_address = $1
    ORDER BY timestamp DESC 
    LIMIT $2
  `;
  
  const result = await query(sql, [walletAddress, limit]);
  return result.rows;
};

export const getTransfersByType = async (transferType: string, limit = 100): Promise<any[]> => {
  const sql = `
    SELECT * FROM transfers 
    WHERE transfer_type = $1 
    ORDER BY timestamp DESC 
    LIMIT $2
  `;
  
  const result = await query(sql, [transferType, limit]);
  return result.rows;
};

export const getTransfersByToken = async (tokenAddress: Address, limit = 100): Promise<any[]> => {
  const sql = `
    SELECT * FROM transfers 
    WHERE token_address = $1 
    ORDER BY timestamp DESC 
    LIMIT $2
  `;
  
  const result = await query(sql, [tokenAddress, limit]);
  return result.rows;
};

// Indexer status operations
export const updateIndexerStatus = async (
  contractAddress: Address,
  lastProcessedBlock: bigint,
  isActive = true
): Promise<void> => {
  const sql = `
    INSERT INTO indexer_status (contract_address, last_processed_block, is_active)
    VALUES ($1, $2, $3)
    ON CONFLICT (contract_address) DO UPDATE SET
      last_processed_block = EXCLUDED.last_processed_block,
      is_active = EXCLUDED.is_active,
      last_updated = CURRENT_TIMESTAMP
  `;
  
  await query(sql, [contractAddress, lastProcessedBlock.toString(), isActive]);
};

export const getIndexerStatus = async (contractAddress: Address): Promise<IndexerStatus | null> => {
  const sql = `
    SELECT * FROM indexer_status 
    WHERE contract_address = $1
  `;
  
  const result = await query(sql, [contractAddress]);
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    contractAddress: row.contract_address,
    lastProcessedBlock: BigInt(row.last_processed_block),
    isActive: row.is_active,
    lastUpdated: row.last_updated
  };
};

// Helper functions
const mapRowToEvent = (row: any): IndexedEvent => ({
  id: row.id,
  contractAddress: row.contract_address,
  eventName: row.event_name,
  blockNumber: BigInt(row.block_number),
  blockHash: row.block_hash,
  transactionHash: row.transaction_hash,
  transactionIndex: row.transaction_index,
  logIndex: row.log_index,
  eventData: row.event_data,
  timestamp: row.timestamp,
  processed: row.processed,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Batch operations
export const insertEventsBatch = async (events: Omit<IndexedEvent, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number[]> => {
  return transaction(async (client) => {
    const results: number[] = [];
    
    for (const event of events) {
      const sql = `
        INSERT INTO events (
          contract_address, event_name, block_number, block_hash, 
          transaction_hash, transaction_index, log_index, event_data, 
          timestamp, processed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const values = [
        event.contractAddress,
        event.eventName,
        event.blockNumber.toString(),
        event.blockHash,
        event.transactionHash,
        event.transactionIndex,
        event.logIndex,
        serializeEventData(event.eventData),
        event.timestamp,
        event.processed
      ];
      
      const result = await client.query(sql, values);
      results.push(result.rows[0].id);
    }
    
    return results;
  });
};

// Withdrawal operations
export const insertWithdrawal = async (
  walletAddress: Address,
  userAddress: Address,
  recipientAddress: Address,
  tokenAddress: Address,
  amount: bigint,
  withdrawalType: 'unallocated' | 'emergency',
  blockNumber: bigint,
  transactionHash: Hash,
  logIndex: number,
  timestamp: Date
): Promise<number> => {
  const sql = `
    INSERT INTO withdrawals (
      wallet_address, user_address, recipient_address, token_address,
      amount, withdrawal_type, block_number, transaction_hash, 
      log_index, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `;
  
  const values = [
    walletAddress,
    userAddress,
    recipientAddress,
    tokenAddress,
    amount.toString(),
    withdrawalType,
    blockNumber.toString(),
    transactionHash,
    logIndex,
    timestamp
  ];
  
  const result = await query(sql, values);
  return result.rows[0].id;
};

export const getWithdrawalsByWallet = async (walletAddress: Address, limit = 100, offset = 0): Promise<any[]> => {
  const sql = `
    SELECT * FROM withdrawals 
    WHERE wallet_address = $1 
    ORDER BY timestamp DESC, log_index DESC 
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(sql, [walletAddress, limit, offset]);
  return result.rows;
};

export const getWithdrawalsByUser = async (userAddress: Address, limit = 100, offset = 0): Promise<any[]> => {
  const sql = `
    SELECT * FROM withdrawals 
    WHERE user_address = $1 
    ORDER BY timestamp DESC, log_index DESC 
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(sql, [userAddress, limit, offset]);
  return result.rows;
};

export const getWithdrawalsByType = async (withdrawalType: 'unallocated' | 'emergency', limit = 100, offset = 0): Promise<any[]> => {
  const sql = `
    SELECT * FROM withdrawals 
    WHERE withdrawal_type = $1 
    ORDER BY timestamp DESC, log_index DESC 
    LIMIT $2 OFFSET $3
  `;
  
  const result = await query(sql, [withdrawalType, limit, offset]);
  return result.rows;
};