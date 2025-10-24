import { useMemo } from 'react';
import { Address } from 'viem';
import { GoalStats } from '../types';
import { useSavingsGoals } from './useSavingsGoals';

/**
 * Hook to calculate aggregate statistics for user's goals
 */
export function useGoalStats(userAddress?: Address) {
  const { goals, isLoading, error } = useSavingsGoals(userAddress);

  const stats = useMemo((): GoalStats => {
    if (!goals.length) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalSaved: BigInt(0),
        totalInterestEarned: BigInt(0),
      };
    }

    let totalSaved = BigInt(0);
    let totalInterestEarned = BigInt(0);
    let activeGoals = 0;
    let completedGoals = 0;

    for (const goalCard of goals) {
      // Sum up total saved across all goals
      totalSaved += goalCard.goal.currentAmount;

      // Sum up total interest earned
      totalInterestEarned += goalCard.interestEarned;

      // Count active goals (not expired, not completed, and isActive)
      if (
        goalCard.goal.isActive &&
        !goalCard.progress.isExpired &&
        goalCard.progress.progressPercentage < BigInt(100)
      ) {
        activeGoals++;
      }

      // Count completed goals (reached 100% or more)
      if (goalCard.progress.progressPercentage >= BigInt(100)) {
        completedGoals++;
      }
    }

    return {
      totalGoals: goals.length,
      activeGoals,
      completedGoals,
      totalSaved,
      totalInterestEarned,
    };
  }, [goals]);

  return {
    stats,
    isLoading,
    error,
  };
}

