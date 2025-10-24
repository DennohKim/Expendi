import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import {
  GoalCreated,
  GoalDeleted,
  GoalzTokenCreated,
  DepositMade,
  WithdrawMade,
  AutomatedDepositCreated,
  AutomatedDepositCanceled,
  GoalCompleted
} from "../generated/Goalz/Goalz"
import {
  SavingsGoal,
  GoalzToken,
  Deposit,
  Withdrawal,
  AutomatedDeposit,
  GoalCompletion,
  GlobalStats,
  User
} from "../generated/schema"

// Global constants
const GLOBAL_STATS_ID = "global"

// Helper function to get or create global stats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (!stats) {
    stats = new GlobalStats(GLOBAL_STATS_ID)
    stats.totalGoals = BigInt.fromI32(0)
    stats.totalCompletedGoals = BigInt.fromI32(0)
    stats.totalActiveGoals = BigInt.fromI32(0)
    stats.totalDeposits = BigInt.fromI32(0)
    stats.totalWithdrawals = BigInt.fromI32(0)
    stats.totalValueLocked = BigInt.fromI32(0)
    stats.totalUsers = BigInt.fromI32(0)
  }
  return stats
}

// Helper function to get or create user
function getOrCreateUser(address: Address, timestamp: BigInt): User {
  let user = User.load(address.toHexString())
  if (!user) {
    user = new User(address.toHexString())
    user.address = address
    user.goalsCreated = BigInt.fromI32(0)
    user.goalsCompleted = BigInt.fromI32(0)
    user.totalDeposited = BigInt.fromI32(0)
    user.totalWithdrawn = BigInt.fromI32(0)
    user.firstGoalAt = timestamp
    user.lastActivityAt = timestamp
    
    // Update global user count
    let stats = getOrCreateGlobalStats()
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1))
    stats.save()
  }
  user.lastActivityAt = timestamp
  return user
}

export function handleGoalCreated(event: GoalCreated): void {
  // Update user stats first
  let user = getOrCreateUser(event.params.saver, event.block.timestamp)
  user.goalsCreated = user.goalsCreated.plus(BigInt.fromI32(1))
  user.save()

  let goal = new SavingsGoal(event.params.goalId.toString())
  goal.owner = user.id
  goal.what = event.params.what
  goal.why = event.params.why
  goal.targetAmount = event.params.targetAmount
  goal.currentAmount = BigInt.fromI32(0)
  goal.targetDate = event.params.targetDate
  goal.depositToken = event.params.depositToken
  goal.complete = false
  goal.shareBalance = BigInt.fromI32(0)
  goal.createdAt = event.block.timestamp
  goal.createdTx = event.transaction.hash
  goal.save()

  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalGoals = stats.totalGoals.plus(BigInt.fromI32(1))
  stats.totalActiveGoals = stats.totalActiveGoals.plus(BigInt.fromI32(1))
  stats.save()
}

export function handleGoalDeleted(event: GoalDeleted): void {
  let goal = SavingsGoal.load(event.params.goalId.toString())
  if (goal) {
    // Update global stats
    let stats = getOrCreateGlobalStats()
    stats.totalActiveGoals = stats.totalActiveGoals.minus(BigInt.fromI32(1))
    stats.save()

    // Remove the goal
    // Note: In subgraphs, we typically don't delete entities but mark them as deleted
    // For now, we'll keep it as is but you might want to add a 'deleted' field instead
  }
}

export function handleGoalzTokenCreated(event: GoalzTokenCreated): void {
  let token = new GoalzToken(event.params.depositToken.toHexString())
  token.address = event.params.goalzToken
  token.depositToken = event.params.depositToken
  token.createdAt = event.block.timestamp
  token.createdTx = event.transaction.hash
  token.save()
}

export function handleDepositMade(event: DepositMade): void {
  // Update user stats first
  let user = getOrCreateUser(event.params.saver, event.block.timestamp)
  user.totalDeposited = user.totalDeposited.plus(event.params.amount)
  user.save()

  let depositId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  let deposit = new Deposit(depositId)
  deposit.goal = event.params.goalId.toString()
  deposit.depositor = user.id
  deposit.amount = event.params.amount
  deposit.shares = event.params.shares
  deposit.timestamp = event.block.timestamp
  deposit.transaction = event.transaction.hash
  deposit.blockNumber = event.block.number
  deposit.save()

  // Update goal
  let goal = SavingsGoal.load(event.params.goalId.toString())
  if (goal) {
    goal.currentAmount = goal.currentAmount.plus(event.params.amount)
    goal.shareBalance = goal.shareBalance.plus(event.params.shares)
    goal.save()
  }

  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalDeposits = stats.totalDeposits.plus(BigInt.fromI32(1))
  stats.totalValueLocked = stats.totalValueLocked.plus(event.params.amount)
  stats.save()
}

export function handleWithdrawMade(event: WithdrawMade): void {
  // Update user stats first
  let user = getOrCreateUser(event.params.saver, event.block.timestamp)
  user.totalWithdrawn = user.totalWithdrawn.plus(event.params.amount)
  user.save()

  let withdrawalId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  let withdrawal = new Withdrawal(withdrawalId)
  withdrawal.goal = event.params.goalId.toString()
  withdrawal.withdrawer = user.id
  withdrawal.amount = event.params.amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.transaction = event.transaction.hash
  withdrawal.blockNumber = event.block.number
  withdrawal.save()

  // Update goal - reset amounts as this is a full withdrawal
  let goal = SavingsGoal.load(event.params.goalId.toString())
  if (goal) {
    goal.currentAmount = BigInt.fromI32(0)
    goal.shareBalance = BigInt.fromI32(0)
    goal.save()
  }

  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalWithdrawals = stats.totalWithdrawals.plus(BigInt.fromI32(1))
  stats.totalValueLocked = stats.totalValueLocked.minus(event.params.amount)
  stats.save()
}

export function handleAutomatedDepositCreated(event: AutomatedDepositCreated): void {
  let user = getOrCreateUser(event.params.saver, event.block.timestamp)
  user.save()

  let autoDeposit = new AutomatedDeposit(event.params.goalId.toString())
  autoDeposit.goal = event.params.goalId.toString()
  autoDeposit.amount = event.params.amount
  autoDeposit.frequency = event.params.frequency
  autoDeposit.creator = user.id
  autoDeposit.active = true
  autoDeposit.createdAt = event.block.timestamp
  autoDeposit.createdTx = event.transaction.hash
  autoDeposit.save()
}

export function handleAutomatedDepositCanceled(event: AutomatedDepositCanceled): void {
  let autoDeposit = AutomatedDeposit.load(event.params.goalId.toString())
  if (autoDeposit) {
    autoDeposit.active = false
    autoDeposit.canceledAt = event.block.timestamp
    autoDeposit.canceledTx = event.transaction.hash
    autoDeposit.save()
  }
}

export function handleGoalCompleted(event: GoalCompleted): void {
  // Update user stats first
  let user = getOrCreateUser(event.params.saver, event.block.timestamp)
  user.goalsCompleted = user.goalsCompleted.plus(BigInt.fromI32(1))
  user.save()

  let completionId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  let completion = new GoalCompletion(completionId)
  completion.goal = event.params.goalId.toString()
  completion.owner = user.id
  completion.targetAmount = event.params.targetAmount
  completion.timestamp = event.block.timestamp
  completion.transaction = event.transaction.hash
  completion.blockNumber = event.block.number
  completion.save()

  // Update goal
  let goal = SavingsGoal.load(event.params.goalId.toString())
  if (goal) {
    goal.complete = true
    goal.save()
  }

  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalCompletedGoals = stats.totalCompletedGoals.plus(BigInt.fromI32(1))
  stats.totalActiveGoals = stats.totalActiveGoals.minus(BigInt.fromI32(1))
  stats.save()
}