// Contract mutation hooks (for writes/transactions only)
export {
  useCreateGoal,
  useDepositToGoal,
  useWithdrawFromGoal,
  useDeleteGoal,
  useTokenApproval,
  useCreateAutomation,
  useCancelAutomation,
  useTokenBalance,
  useTokenAllowance,
} from './useGoalzContract';

// Query hooks (for reading data from subgraph)
export {
  useSavingsGoals,
  useMyGoals,
  useFilteredGoals,
} from './useSavingsGoals';

export { useGoalStats } from './useGoalStats';

// Automation hooks
export {
  useAutomatedDeposit,
  useAutomationMetrics,
  useAutomationAllowanceCheck,
  formatFrequency,
  formatNextDeposit,
} from './useAutomation';

// Utility hooks
export { useGoalzUtils } from './useGoalzUtils';