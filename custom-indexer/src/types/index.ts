import { Address, Hash } from 'viem';

// Database Event Types
export interface IndexedEvent {
  id?: number;
  contractAddress: Address;
  eventName: string;
  blockNumber: bigint;
  blockHash: Hash;
  transactionHash: Hash;
  transactionIndex: number;
  logIndex: number;
  eventData: Record<string, any>;
  timestamp: Date;
  processed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Factory Contract Events
export interface WalletCreatedEvent extends IndexedEvent {
  eventName: 'WalletCreated';
  eventData: {
    user: Address;
    wallet: Address;
    salt: bigint;
  };
}

export interface WalletRegisteredEvent extends IndexedEvent {
  eventName: 'WalletRegistered';
  eventData: {
    user: Address;
    wallet: Address;
  };
}

// Budget Wallet Events
export interface BucketCreatedEvent extends IndexedEvent {
  eventName: 'BucketCreated';
  eventData: {
    bucketId: bigint;
    name: string;
    monthlyLimit: bigint;
    token: Address;
  };
}

export interface SpendingEvent extends IndexedEvent {
  eventName: 'Spending';
  eventData: {
    bucketId: bigint;
    amount: bigint;
    recipient: Address;
    token: Address;
  };
}

export interface BucketLimitUpdatedEvent extends IndexedEvent {
  eventName: 'BucketLimitUpdated';
  eventData: {
    bucketId: bigint;
    newLimit: bigint;
  };
}

export interface DelegatePermissionChangedEvent extends IndexedEvent {
  eventName: 'DelegatePermissionChanged';
  eventData: {
    delegate: Address;
    bucketId: bigint;
    canSpend: boolean;
  };
}

export interface UnallocatedWithdrawEvent extends IndexedEvent {
  eventName: 'UnallocatedWithdraw';
  eventData: {
    user: Address;
    token: Address;
    amount: bigint;
    recipient: Address;
  };
}

export interface EmergencyWithdrawEvent extends IndexedEvent {
  eventName: 'EmergencyWithdraw';
  eventData: {
    user: Address;
    token: Address;
    amount: bigint;
  };
}

// USDC Transfer Events
export interface TransferEvent extends IndexedEvent {
  eventName: 'Transfer';
  eventData: {
    from: Address;
    to: Address;
    value: bigint;
  };
}

// Union type for all events
export type ContractEvent = 
  | WalletCreatedEvent
  | WalletRegisteredEvent
  | BucketCreatedEvent
  | SpendingEvent
  | BucketLimitUpdatedEvent
  | DelegatePermissionChangedEvent
  | UnallocatedWithdrawEvent
  | EmergencyWithdrawEvent
  | TransferEvent;

// Indexer Status
export interface IndexerStatus {
  contractAddress: Address;
  lastProcessedBlock: bigint;
  isActive: boolean;
  lastUpdated: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query Parameters
export interface EventQueryParams {
  contractAddress?: Address;
  eventName?: string;
  blockNumber?: bigint;
  transactionHash?: Hash;
  user?: Address;
  wallet?: Address;
  bucketId?: bigint;
  page?: number;
  limit?: number;
  startBlock?: bigint;
  endBlock?: bigint;
}