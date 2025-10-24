import { useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { Goal, GoalCard, GoalProgress } from '../types';

// GraphQL query for fetching savings goals by owner
const GET_SAVINGS_GOALS_BY_OWNER = gql`
  query GetSavingsGoalsByOwner($userAddress: String!) {
    savingsGoals(where: { owner: $userAddress }) {
      id
      what
      why
      targetAmount
      currentAmount
      targetDate
      depositToken
      complete
      shareBalance
      createdAt
      owner {
        id
        address
      }
      deposits {
        amount
        shares
        timestamp
      }
      withdrawals {
        amount
        timestamp
      }
    }
  }
`;

interface SubgraphDeposit {
  amount: string;
  shares: string;
  timestamp: string;
}

interface SubgraphWithdrawal {
  amount: string;
  timestamp: string;
}

interface SubgraphOwner {
  id: string;
  address: string;
}

interface SubgraphGoal {
  id: string;
  what: string;
  why: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  depositToken: string;
  complete: boolean;
  shareBalance: string;
  createdAt: string;
  owner: SubgraphOwner;
  deposits: SubgraphDeposit[];
  withdrawals: SubgraphWithdrawal[];
}

interface SavingsGoalsResponse {
  savingsGoals: SubgraphGoal[];
}

// Transform subgraph data to Goal type
function transformSubgraphGoal(subgraphGoal: SubgraphGoal): Goal {
  return {
    what: subgraphGoal.what,
    why: subgraphGoal.why || '',
    targetAmount: BigInt(subgraphGoal.targetAmount),
    currentAmount: BigInt(subgraphGoal.currentAmount),
    targetDate: BigInt(subgraphGoal.targetDate),
    depositToken: subgraphGoal.depositToken as Address,
    complete: subgraphGoal.complete,
    shareBalance: BigInt(subgraphGoal.shareBalance),
    owner: subgraphGoal.owner.address as Address,
    // Computed fields for compatibility
    name: subgraphGoal.what,
    deadline: BigInt(subgraphGoal.targetDate),
    token: subgraphGoal.depositToken as Address,
    isActive: !subgraphGoal.complete,
    depositedAmount: BigInt(subgraphGoal.currentAmount),
    vaultShares: BigInt(subgraphGoal.shareBalance),
  };
}

// Calculate goal progress
function calculateProgress(goal: Goal): GoalProgress {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const targetDate = goal.targetDate;
  
  // Calculate progress percentage (capped at 100%)
  const progressPercentage = goal.targetAmount > 0
    ? (goal.currentAmount * BigInt(100)) / goal.targetAmount
    : BigInt(0);
  
  // Calculate time left
  const isExpired = now >= targetDate;
  const timeLeftDays = isExpired 
    ? BigInt(0) 
    : (targetDate - now) / BigInt(86400); // Convert seconds to days
  
  return {
    progressPercentage: progressPercentage > BigInt(100) ? BigInt(100) : progressPercentage,
    timeLeftDays,
    isExpired,
  };
}

// Calculate interest earned (shares value - deposits)
function calculateInterestEarned(goal: Goal): bigint {
  // This is a simplified calculation
  // In a real scenario, you'd need to fetch the current value of shares from the vault
  // For now, we'll return 0 or calculate based on share balance vs current amount
  const shareValue = goal.currentAmount; // Assuming 1:1 for now
  const deposited = goal.currentAmount;
  return shareValue > deposited ? shareValue - deposited : BigInt(0);
}

// Transform to GoalCard
function transformToGoalCard(subgraphGoal: SubgraphGoal): GoalCard {
  const goal = transformSubgraphGoal(subgraphGoal);
  const progress = calculateProgress(goal);
  const interestEarned = calculateInterestEarned(goal);
  
  return {
    id: BigInt(subgraphGoal.id),
    goal,
    progress,
    interestEarned,
  };
}

/**
 * Hook to fetch savings goals for a specific user
 * Automatically converts the user address to lowercase for querying
 * Uses context to route to the Goalz subgraph
 */
export function useSavingsGoals(userAddress?: Address) {
  // Convert address to lowercase for subgraph query
  const queryAddress = userAddress?.toLowerCase();
  console.log("🔍 useSavingsGoals - queryAddress:", queryAddress);
  
  // Query with context specifying the goalz subgraph
  const { data, loading, error, refetch } = useQuery<SavingsGoalsResponse>(
    GET_SAVINGS_GOALS_BY_OWNER,
    {
      variables: { userAddress: queryAddress },
      skip: !queryAddress, // Skip query if no address
      pollInterval: 10000, // Poll every 10 seconds for updates
      context: { subgraph: 'goalz' }, // Route to Goalz subgraph
    }
  );

  console.log("📊 useSavingsGoals - Query State:", {
    loading,
    error: error?.message,
    hasData: !!data,
    savingsGoalsCount: data?.savingsGoals?.length,
    skip: !queryAddress,
  });
  
  if (error) {
    console.error("❌ GraphQL Error:", error);
  }

  const goals = useMemo(() => {
    if (!data?.savingsGoals) return [];
    return data.savingsGoals.map(transformToGoalCard);
  }, [data]);

  console.log("✅ useSavingsGoals - Transformed goals:", goals.length);

  return {
    goals,
    isLoading: loading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch savings goals for the currently connected user
 * Uses wagmi's useAccount to get the user address
 */
export function useMyGoals() {
  const { address } = useAccount();
  return useSavingsGoals(address);
}

type FilterType = 'all' | 'active' | 'completed' | 'expired';
type SortType = 'newest' | 'deadline' | 'progress' | 'amount';

/**
 * Hook to fetch and filter savings goals
 * Provides filtering and sorting capabilities
 */
export function useFilteredGoals(
  userAddress?: Address,
  filter: FilterType = 'all',
  sort: SortType = 'newest'
) {
  const { goals: allGoals, isLoading, error, refetch } = useSavingsGoals(userAddress);

  const filteredAndSortedGoals = useMemo(() => {
    let filtered = [...allGoals];

    // Apply filters
    switch (filter) {
      case 'active':
        filtered = filtered.filter(
          g => g.goal.isActive && !g.progress.isExpired && g.progress.progressPercentage < BigInt(100)
        );
        break;
      case 'completed':
        filtered = filtered.filter(g => g.progress.progressPercentage >= BigInt(100));
        break;
      case 'expired':
        filtered = filtered.filter(
          g => g.progress.isExpired && g.progress.progressPercentage < BigInt(100)
        );
        break;
      // 'all' - no filter
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        filtered.sort((a, b) => {
          // Sort by goal ID descending (newer goals have higher IDs)
          return Number(b.id - a.id);
        });
        break;
      case 'deadline':
        filtered.sort((a, b) => {
          // Sort by deadline ascending (soonest first)
          return Number(a.goal.deadline - b.goal.deadline);
        });
        break;
      case 'progress':
        filtered.sort((a, b) => {
          // Sort by progress descending (highest progress first)
          return Number(b.progress.progressPercentage - a.progress.progressPercentage);
        });
        break;
      case 'amount':
        filtered.sort((a, b) => {
          // Sort by target amount descending (highest first)
          return Number(b.goal.targetAmount - a.goal.targetAmount);
        });
        break;
    }

    return filtered;
  }, [allGoals, filter, sort]);

  return {
    goals: filteredAndSortedGoals,
    isLoading,
    error,
    refetch,
  };
}

