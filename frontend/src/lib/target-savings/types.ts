import { Address } from 'viem';

export interface Goal {
  what: string; // goal name/title
  why: string; // goal description
  targetAmount: bigint;
  currentAmount: bigint;
  targetDate: bigint; // deadline
  depositToken: Address;
  complete: boolean;
  shareBalance: bigint;
  // Computed/derived fields for compatibility
  owner?: Address;
  name: string;
  deadline: bigint;
  token: Address;
  vault?: Address;
  isActive: boolean;
  depositedAmount?: bigint;
  vaultShares?: bigint;
}

export interface GoalProgress {
  progressPercentage: bigint;
  timeLeftDays: bigint;
  isExpired: boolean;
}

export interface CreateGoalParams {
  name: string; // maps to "what"
  description?: string; // maps to "why"
  targetAmount: bigint;
  deadline: bigint; // maps to "targetDate"
  token: Address; // maps to "depositToken"
  vault?: Address; // not used in new contract
}

export interface DepositParams {
  goalId: bigint;
  amount: bigint;
}

export interface WithdrawParams {
  goalId: bigint;
  // amount not needed in new contract - withdraws all
}

export interface AutomationParams {
  goalId: bigint;
  amount: bigint;
  interval: bigint;
}

export interface AutomatedDepositData {
  amount: bigint;
  frequency: bigint; // in seconds
  lastDeposit: bigint; // timestamp
  gelatoTaskId: string;
  isActive: boolean;
  nextDepositDate?: Date;
  depositsRemaining?: number;
  estimatedCompletion?: Date;
}

export interface AutomationSetupData {
  depositAmount: string;
  frequency: bigint;
  customFrequency?: string;
  approvalAmount: bigint;
  estimatedDeposits: number;
}

export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
}

export interface VaultInfo {
  address: Address;
  name: string;
  asset: Address;
}

export interface GoalFormData {
  name: string;
  description?: string;
  targetAmount: string;
  deadline: Date;
  token: Address;
  vault?: Address; // optional now
  enableAutomation?: boolean;
  automationAmount?: string;
  automationInterval?: number;
}

export interface GoalCard {
  id: bigint;
  goal: Goal;
  progress: GoalProgress;
  interestEarned: bigint;
  automation?: AutomatedDepositData;
}

export type GoalStatus = 'active' | 'completed' | 'expired' | 'deleted';

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalSaved: bigint;
  totalInterestEarned: bigint;
  automatedGoals?: number;
}