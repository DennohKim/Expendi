import { gql, useQuery } from '@apollo/client';

const GET_ALL_TRANSACTIONS = gql`
  query GetAllTransactions($userId: ID!, $first: Int = 100) {
    deposits(
      where: { user: $userId }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      amount
      timestamp
      type
      blockNumber
      transactionHash
      bucket {
        id
        name
      }
      token {
        id
        symbol
        decimals
      }
    }
    
    withdrawals(
      where: { user: $userId }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      amount
      timestamp
      type
      recipient
      blockNumber
      transactionHash
      bucket {
        id
        name
      }
      token {
        id
        symbol
        decimals
      }
    }
    
    bucketTransfers(
      where: { user: $userId }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      amount
      timestamp
      blockNumber
      transactionHash
      fromBucket {
        id
        name
      }
      toBucket {
        id
        name
      }
      token {
        id
        symbol
        decimals
      }
    }
  }
`;

export interface Token {
  id: string;
  symbol: string;
  decimals: string;
}

export interface Bucket {
  id: string;
  name: string;
}

export interface Deposit {
  id: string;
  amount: string;
  timestamp: string;
  type: string;
  blockNumber: string;
  transactionHash: string;
  bucket: Bucket;
  token: Token;
}

export interface Withdrawal {
  id: string;
  amount: string;
  timestamp: string;
  type: string;
  recipient: string;
  blockNumber: string;
  transactionHash: string;
  bucket: Bucket;
  token: Token;
}

export interface BucketTransfer {
  id: string;
  amount: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  fromBucket: Bucket;
  toBucket: Bucket;
  token: Token;
}

export interface AllTransactionsData {
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  bucketTransfers: BucketTransfer[];
}

export function useAllTransactions(userId: string | undefined, first: number = 100) {
  return useQuery<AllTransactionsData>(GET_ALL_TRANSACTIONS, {
    variables: { 
      userId: userId?.toLowerCase(),
      first
    },
    skip: !userId,
    onError: (error) => {
      console.error('getAllTransactions GraphQL query error:', error);
    },
    onCompleted: (data) => {
      console.log('getAllTransactions GraphQL query completed:', data);
    }
  });
}