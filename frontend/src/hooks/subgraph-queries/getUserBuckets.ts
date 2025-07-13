import { gql, useQuery } from '@apollo/client';

const GET_USER_BUCKETS = gql`
  query GetUserBuckets($userId: ID!) {
    user(id: $userId) {
      buckets {
        id
        name
        balance
        monthlyLimit
        monthlySpent
        active
        createdAt
        updatedAt
        tokenBalances {
          id
          balance
          token {
            id
            name
            symbol
            decimals
          }
        }
      }
      deposits {
        id
        amount
        timestamp
        type
        bucket {
          id
          name
        }
        token {
          id
          symbol
        }
      }
      withdrawals {
        id
        amount
        timestamp
        recipient
        type
        bucket {
          id
          name
        }
        token {
          id
          symbol
        }
      }
      delegates {
        id
        delegate {
          id
          address
        }
        bucket {
          id
          name
        }
        active
        createdAt
      }
      delegatedBuckets {
        id
        user {
          id
          address
        }
        bucket {
          id
          name
        }
        active
      }
    }
  }
`;

export function useUserBuckets(userId: string | undefined) {
  return useQuery(GET_USER_BUCKETS, {
    variables: { userId: userId?.toLowerCase() },
    skip: !userId,
    onError: (error) => {
      console.error('getUserBuckets GraphQL query error:', error);
    },
    onCompleted: (data) => {
      console.log('getUserBuckets GraphQL query completed:', data);
    }
  });
}