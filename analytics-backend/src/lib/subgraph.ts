import axios from 'axios';
import { 
  SubgraphUser, 
  SubgraphBucket, 
  SubgraphDeposit, 
  SubgraphWithdrawal, 
  SubgraphBucketTransfer,
  SubgraphResponse 
} from '../types/subgraph';

// Core subgraph query function
const querySubgraph = async <T>(
  subgraphUrl: string,
  query: string, 
  variables?: Record<string, any>
): Promise<T> => {
  try {
    const response = await axios.post<SubgraphResponse<T>>(subgraphUrl, {
      query,
      variables
    });

    if (response.data.errors) {
      throw new Error(`Subgraph query failed: ${response.data.errors.map(e => e.message).join(', ')}`);
    }

    return response.data.data;
  } catch (error) {
    console.error('Subgraph query error:', error);
    throw error;
  }
};

// Individual query functions
export const getUsers = (subgraphUrl: string) => async (
  first: number = 1000, 
  skip: number = 0
): Promise<SubgraphUser[]> => {
  const query = `
    query GetUsers($first: Int!, $skip: Int!) {
      users(first: $first, skip: $skip, orderBy: updatedAt, orderDirection: desc) {
        id
        totalBalance
        totalSpent
        bucketsCount
        createdAt
        updatedAt
        buckets {
          id
          name
          balance
          monthlySpent
          monthlyLimit
          active
          createdAt
          updatedAt
        }
      }
    }
  `;

  const result = await querySubgraph<{ users: SubgraphUser[] }>(subgraphUrl, query, { first, skip });
  return result.users;
};

export const getUserBuckets = (subgraphUrl: string) => async (
  userId: string
): Promise<SubgraphBucket[]> => {
  const query = `
    query GetUserBuckets($userId: String!) {
      buckets(where: { user: $userId }, orderBy: createdAt, orderDirection: asc) {
        id
        name
        balance
        monthlySpent
        monthlyLimit
        active
        createdAt
        updatedAt
        user {
          id
        }
      }
    }
  `;

  const result = await querySubgraph<{ buckets: SubgraphBucket[] }>(subgraphUrl, query, { userId });
  return result.buckets;
};

export const getDeposits = (subgraphUrl: string) => async (
  first: number = 1000,
  skip: number = 0,
  userId?: string,
  bucketId?: string,
  fromTimestamp?: string
): Promise<SubgraphDeposit[]> => {
  const whereClause: string[] = [];
  
  if (userId) whereClause.push(`user: "${userId}"`);
  if (bucketId) whereClause.push(`bucket: "${bucketId}"`);
  if (fromTimestamp) whereClause.push(`timestamp_gte: "${fromTimestamp}"`);

  const whereString = whereClause.length > 0 ? `where: { ${whereClause.join(', ')} }` : '';

  const query = `
    query GetDeposits($first: Int!, $skip: Int!) {
      deposits(first: $first, skip: $skip, ${whereString}, orderBy: timestamp, orderDirection: desc) {
        id
        type
        amount
        token
        blockNumber
        timestamp
        transactionHash
        user {
          id
        }
        bucket {
          id
          name
        }
      }
    }
  `;

  const result = await querySubgraph<{ deposits: SubgraphDeposit[] }>(subgraphUrl, query, { first, skip });
  return result.deposits;
};

export const getWithdrawals = (subgraphUrl: string) => async (
  first: number = 1000,
  skip: number = 0,
  userId?: string,
  bucketId?: string,
  fromTimestamp?: string
): Promise<SubgraphWithdrawal[]> => {
  const whereClause: string[] = [];
  
  if (userId) whereClause.push(`user: "${userId}"`);
  if (bucketId) whereClause.push(`bucket: "${bucketId}"`);
  if (fromTimestamp) whereClause.push(`timestamp_gte: "${fromTimestamp}"`);

  const whereString = whereClause.length > 0 ? `where: { ${whereClause.join(', ')} }` : '';

  const query = `
    query GetWithdrawals($first: Int!, $skip: Int!) {
      withdrawals(first: $first, skip: $skip, ${whereString}, orderBy: timestamp, orderDirection: desc) {
        id
        type
        amount
        token
        blockNumber
        timestamp
        transactionHash
        recipient
        user {
          id
        }
        bucket {
          id
          name
        }
      }
    }
  `;

  const result = await querySubgraph<{ withdrawals: SubgraphWithdrawal[] }>(subgraphUrl, query, { first, skip });
  return result.withdrawals;
};

export const getBucketTransfers = (subgraphUrl: string) => async (
  first: number = 1000,
  skip: number = 0,
  userId?: string,
  fromTimestamp?: string
): Promise<SubgraphBucketTransfer[]> => {
  const whereClause: string[] = [];
  
  if (userId) whereClause.push(`user: "${userId}"`);
  if (fromTimestamp) whereClause.push(`timestamp_gte: "${fromTimestamp}"`);

  const whereString = whereClause.length > 0 ? `where: { ${whereClause.join(', ')} }` : '';

  const query = `
    query GetBucketTransfers($first: Int!, $skip: Int!) {
      bucketTransfers(first: $first, skip: $skip, ${whereString}, orderBy: timestamp, orderDirection: desc) {
        id
        amount
        token
        blockNumber
        timestamp
        transactionHash
        fromBucket {
          id
          name
        }
        toBucket {
          id
          name
        }
        user {
          id
        }
      }
    }
  `;

  const result = await querySubgraph<{ bucketTransfers: SubgraphBucketTransfer[] }>(subgraphUrl, query, { first, skip });
  return result.bucketTransfers;
};

export const getLatestBlockTimestamp = (subgraphUrl: string) => async (): Promise<string> => {
  const query = `
    query GetLatestBlock {
      _meta {
        block {
          timestamp
        }
      }
    }
  `;

  const result = await querySubgraph<{ _meta: { block: { timestamp: number } } }>(subgraphUrl, query);
  return result._meta.block.timestamp.toString();
};

// Higher-order function to create a subgraph service for a specific URL
export const createSubgraphService = (subgraphUrl: string) => ({
  getUsers: getUsers(subgraphUrl),
  getUserBuckets: getUserBuckets(subgraphUrl),
  getDeposits: getDeposits(subgraphUrl),
  getWithdrawals: getWithdrawals(subgraphUrl),
  getBucketTransfers: getBucketTransfers(subgraphUrl),
  getLatestBlockTimestamp: getLatestBlockTimestamp(subgraphUrl)
});

export type SubgraphService = ReturnType<typeof createSubgraphService>;