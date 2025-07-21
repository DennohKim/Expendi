import { gql, useQuery } from '@apollo/client';

const GET_USER_BUDGET_WALLET = gql`
  query GetUserBudgetWallet($userAddress: ID!) {
    user(id: $userAddress) {
      id
      address
      totalBalance
      totalSpent
      bucketsCount
      createdAt
      updatedAt

      # Wallet creation details
      walletsCreated {
        id
        wallet
        salt
        timestamp
        blockNumber
        transactionHash
      }

      # All buckets for this user
      buckets {
        id
        name
        balance
        monthlySpent
        monthlyLimit
        active
        createdAt
        updatedAt
        lastResetTimestamp

        # Token balances in each bucket
        tokenBalances {
          id
          balance
          updatedAt
          token {
            id
            address
            name
            symbol
            decimals
          }
        }

        # Delegates for each bucket
        delegates {
          id
          active
          delegate {
            id
            address
          }
        }
      }

      # Recent transactions
      transactions {
        id
        amount
        timestamp
        blockNumber
        transactionHash
        bucket {
          name
        }
        token {
          symbol
          decimals
        }
      }
    }
  }
`;

export function useUserBudgetWallet(userAddress: string | undefined) {
  // const chainId = useChainId();
  
  const queryResult = useQuery(GET_USER_BUDGET_WALLET, {
    variables: { userAddress: userAddress?.toLowerCase() },
    skip: !userAddress,
    notifyOnNetworkStatusChange: true,
    onError: (error) => {
      console.error('GraphQL query error:', error);
    },
    onCompleted: (data) => {
      console.log('GraphQL query completed:', data);
    }
  });

  return queryResult;
}