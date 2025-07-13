import { gql, useQuery } from '@apollo/client';

const GET_BUCKET_TRANSACTIONS = gql`
  query GetBucketTransactions($bucketId: ID!, $first: Int = 100) {
    bucket(id: $bucketId) {
      id
      name
      balance
      monthlySpent
      monthlyLimit
      active
      
      deposits(
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
        token {
          id
          symbol
          decimals
        }
      }
      
      withdrawals(
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
        token {
          id
          symbol
          decimals
        }
      }
      
      transfers(
        first: $first
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        amount
        timestamp
        blockNumber
        transactionHash
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
      
      receivedTransfers(
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
        token {
          id
          symbol
          decimals
        }
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

export interface BucketDeposit {
  id: string;
  amount: string;
  timestamp: string;
  type: string;
  blockNumber: string;
  transactionHash: string;
  token: Token;
}

export interface BucketWithdrawal {
  id: string;
  amount: string;
  timestamp: string;
  type: string;
  recipient: string;
  blockNumber: string;
  transactionHash: string;
  token: Token;
}

export interface BucketTransferOut {
  id: string;
  amount: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  toBucket: Bucket;
  token: Token;
}

export interface BucketTransferIn {
  id: string;
  amount: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  fromBucket: Bucket;
  token: Token;
}

export interface BucketDetails {
  id: string;
  name: string;
  balance: string;
  monthlySpent: string;
  monthlyLimit: string;
  active: boolean;
  deposits: BucketDeposit[];
  withdrawals: BucketWithdrawal[];
  transfers: BucketTransferOut[];
  receivedTransfers: BucketTransferIn[];
}

export interface BucketTransactionsData {
  bucket: BucketDetails;
}

export function useBucketTransactions(bucketId: string | undefined, first: number = 100) {
  return useQuery<BucketTransactionsData>(GET_BUCKET_TRANSACTIONS, {
    variables: { 
      bucketId,
      first
    },
    skip: !bucketId,
    onError: (error) => {
      console.error('getBucketTransactions GraphQL query error:', error);
    },
    onCompleted: (data) => {
      console.log('getBucketTransactions GraphQL query completed:', data);
    }
  });
}