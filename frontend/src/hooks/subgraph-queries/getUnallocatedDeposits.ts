import { gql, useQuery } from '@apollo/client';

const GET_UNALLOCATED_DEPOSITS = gql`
  query GetUnallocatedDeposits($userId: ID!, $first: Int = 100) {
    deposits(
      where: { 
        user: $userId
        bucket_: { name: "UNALLOCATED" }
      }
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

export interface UnallocatedDeposit {
  id: string;
  amount: string;
  timestamp: string;
  type: string;
  blockNumber: string;
  transactionHash: string;
  bucket: Bucket;
  token: Token;
}

export interface UnallocatedDepositsData {
  deposits: UnallocatedDeposit[];
}

export function useUnallocatedDeposits(userId: string | undefined, first: number = 100) {
  return useQuery<UnallocatedDepositsData>(GET_UNALLOCATED_DEPOSITS, {
    variables: { 
      userId: userId?.toLowerCase(),
      first
    },
    skip: !userId,
    onError: (error) => {
      console.error('getUnallocatedDeposits GraphQL query error:', error);
    },
    onCompleted: (data) => {
      console.log('getUnallocatedDeposits GraphQL query completed:', data);
    }
  });
}