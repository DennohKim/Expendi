import { BigInt, Address, log } from '@graphprotocol/graph-ts'
import {
  BucketCreated,
  BucketUpdated,
  BucketFunded,
  SpentFromBucket,
  BucketTransfer,
  FundsDeposited,
  MonthlyLimitReset,
  DelegateAdded,
  DelegateRemoved,
  UnallocatedWithdraw,
  EmergencyWithdraw
} from '../generated/SimpleBudgetWallet/SimpleBudgetWallet'
import {
  User,
  Bucket,
  Token,
  TokenBalance,
  Deposit,
  Withdrawal,
  BucketTransfer as BucketTransferEntity,
  Delegate,
  MonthlyLimitReset as MonthlyLimitResetEntity,
  GlobalStats
} from '../generated/schema'

// Constants
const ETH_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')
const GLOBAL_STATS_ID = 'global'

// Helper function to get or create user
function getOrCreateUser(address: Address): User {
  let user = User.load(address.toHex())
  if (user == null) {
    user = new User(address.toHex())
    user.address = address
    user.totalBalance = BigInt.fromI32(0)
    user.totalSpent = BigInt.fromI32(0)
    user.bucketsCount = 0
    user.createdAt = BigInt.fromI32(0)
    user.updatedAt = BigInt.fromI32(0)
    user.save()
    
    // Update global stats only when creating a new user
    updateGlobalUserStats()
  }
  return user
}

// Helper function to get or create token
function getOrCreateToken(address: Address): Token {
  let token = Token.load(address.toHex())
  if (token == null) {
    token = new Token(address.toHex())
    token.address = address
    token.totalVolume = BigInt.fromI32(0)
    
    if (address.equals(ETH_ADDRESS)) {
      token.name = 'Ethereum'
      token.symbol = 'ETH'
      token.decimals = 18
    } else {
      token.name = 'Unknown'
      token.symbol = 'UNKNOWN'
      token.decimals = 18
    }
    
    token.save()
  }
  return token
}

// Helper function to get or create bucket
function getOrCreateBucket(userAddress: Address, bucketName: string): Bucket {
  let bucketId = userAddress.toHex() + '-' + bucketName
  let bucket = Bucket.load(bucketId)
  if (bucket == null) {
    bucket = new Bucket(bucketId)
    bucket.user = userAddress.toHex()
    bucket.name = bucketName
    bucket.balance = BigInt.fromI32(0)
    bucket.monthlySpent = BigInt.fromI32(0)
    bucket.monthlyLimit = BigInt.fromI32(0)
    bucket.active = true
    bucket.createdAt = BigInt.fromI32(0)
    bucket.updatedAt = BigInt.fromI32(0)
    bucket.lastResetTimestamp = BigInt.fromI32(0)
    bucket.save()
  }
  return bucket
}

// Helper function to get or create token balance
function getOrCreateTokenBalance(bucket: Bucket, token: Token): TokenBalance {
  let tokenBalanceId = bucket.id + '-' + token.id
  let tokenBalance = TokenBalance.load(tokenBalanceId)
  if (tokenBalance == null) {
    tokenBalance = new TokenBalance(tokenBalanceId)
    tokenBalance.bucket = bucket.id
    tokenBalance.token = token.id
    tokenBalance.balance = BigInt.fromI32(0)
    tokenBalance.updatedAt = BigInt.fromI32(0)
    tokenBalance.save()
  }
  return tokenBalance
}

// Helper function to update global user stats
function updateGlobalUserStats(): void {
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (stats == null) {
    stats = new GlobalStats(GLOBAL_STATS_ID)
    stats.totalUsers = 0
    stats.totalBuckets = 0
    stats.totalWalletsCreated = 0
    stats.totalVolume = BigInt.fromI32(0)
    stats.totalDeposits = BigInt.fromI32(0)
    stats.totalWithdrawals = BigInt.fromI32(0)
    stats.updatedAt = BigInt.fromI32(0)
  }
  
  stats.totalUsers = stats.totalUsers + 1
  stats.save()
}

export function handleBucketCreated(event: BucketCreated): void {
  let user = getOrCreateUser(event.params.user)
  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName)
  
  bucket.monthlyLimit = event.params.monthlyLimit
  bucket.createdAt = event.block.timestamp
  bucket.updatedAt = event.block.timestamp
  bucket.lastResetTimestamp = event.block.timestamp
  bucket.save()
  
  // Update user stats
  user.bucketsCount = user.bucketsCount + 1
  user.updatedAt = event.block.timestamp
  user.save()
  
  // Update global stats
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (stats == null) {
    stats = new GlobalStats(GLOBAL_STATS_ID)
    stats.totalUsers = 0
    stats.totalBuckets = 0
    stats.totalWalletsCreated = 0
    stats.totalVolume = BigInt.fromI32(0)
    stats.totalDeposits = BigInt.fromI32(0)
    stats.totalWithdrawals = BigInt.fromI32(0)
  }
  stats.totalBuckets = stats.totalBuckets + 1
  stats.updatedAt = event.block.timestamp
  stats.save()
}

export function handleBucketUpdated(event: BucketUpdated): void {
  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName)
  
  bucket.monthlyLimit = event.params.newLimit
  bucket.active = event.params.active
  bucket.updatedAt = event.block.timestamp
  bucket.save()
}

export function handleBucketFunded(event: BucketFunded): void {
  let user = getOrCreateUser(event.params.user)
  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName)
  let unallocatedBucket = getOrCreateBucket(event.params.user, 'UNALLOCATED')
  let token = getOrCreateToken(event.params.token)
  
  // Create deposit record
  let depositId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let deposit = new Deposit(depositId)
  deposit.user = user.id
  deposit.bucket = bucket.id
  deposit.amount = event.params.amount
  deposit.token = token.id
  deposit.timestamp = event.block.timestamp
  deposit.blockNumber = event.block.number
  deposit.transactionHash = event.transaction.hash
  deposit.type = 'BUCKET_FUNDING'
  deposit.save()
  
  // Update token balances - move from UNALLOCATED to target bucket
  if (event.params.token.equals(ETH_ADDRESS)) {
    // Reduce UNALLOCATED balance
    unallocatedBucket.balance = unallocatedBucket.balance.minus(event.params.amount)
    // Increase target bucket balance
    bucket.balance = bucket.balance.plus(event.params.amount)
  } else {
    // Reduce UNALLOCATED token balance
    let unallocatedTokenBalance = getOrCreateTokenBalance(unallocatedBucket, token)
    unallocatedTokenBalance.balance = unallocatedTokenBalance.balance.minus(event.params.amount)
    unallocatedTokenBalance.updatedAt = event.block.timestamp
    unallocatedTokenBalance.save()
    
    // Increase target bucket token balance
    let tokenBalance = getOrCreateTokenBalance(bucket, token)
    tokenBalance.balance = tokenBalance.balance.plus(event.params.amount)
    tokenBalance.updatedAt = event.block.timestamp
    tokenBalance.save()
  }
  
  bucket.updatedAt = event.block.timestamp
  bucket.save()
  
  unallocatedBucket.updatedAt = event.block.timestamp
  unallocatedBucket.save()
  
  // Note: Don't update user.totalBalance here as funds are just moving between buckets
  user.updatedAt = event.block.timestamp
  user.save()
  
  // Update token stats
  token.totalVolume = token.totalVolume.plus(event.params.amount)
  token.save()
  
  // Update global stats
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (stats != null) {
    stats.totalDeposits = stats.totalDeposits.plus(event.params.amount)
    stats.totalVolume = stats.totalVolume.plus(event.params.amount)
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}

export function handleSpentFromBucket(event: SpentFromBucket): void {
  let user = getOrCreateUser(event.params.user)
  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName)
  let token = getOrCreateToken(event.params.token)
  
  // Create withdrawal record
  let withdrawalId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let withdrawal = new Withdrawal(withdrawalId)
  withdrawal.user = user.id
  withdrawal.bucket = bucket.id
  withdrawal.amount = event.params.amount
  withdrawal.token = token.id
  withdrawal.timestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.recipient = event.params.recipient
  withdrawal.type = 'BUCKET_SPENDING'
  withdrawal.save()
  
  // Update bucket balance
  if (event.params.token.equals(ETH_ADDRESS)) {
    bucket.balance = bucket.balance.minus(event.params.amount)
  } else {
    let tokenBalance = getOrCreateTokenBalance(bucket, token)
    tokenBalance.balance = tokenBalance.balance.minus(event.params.amount)
    tokenBalance.updatedAt = event.block.timestamp
    tokenBalance.save()
  }
  
  bucket.monthlySpent = bucket.monthlySpent.plus(event.params.amount)
  bucket.updatedAt = event.block.timestamp
  bucket.save()
  
  // Update user stats
  user.totalSpent = user.totalSpent.plus(event.params.amount)
  user.updatedAt = event.block.timestamp
  user.save()
  
  // Update token stats
  token.totalVolume = token.totalVolume.plus(event.params.amount)
  token.save()
  
  // Update global stats
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (stats != null) {
    stats.totalWithdrawals = stats.totalWithdrawals.plus(event.params.amount)
    stats.totalVolume = stats.totalVolume.plus(event.params.amount)
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}

export function handleBucketTransfer(event: BucketTransfer): void {
  let user = getOrCreateUser(event.params.user)
  let fromBucket = getOrCreateBucket(event.params.user, event.params.fromBucket)
  let toBucket = getOrCreateBucket(event.params.user, event.params.toBucket)
  let token = getOrCreateToken(event.params.token)
  
  // Create transfer record
  let transferId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let transfer = new BucketTransferEntity(transferId)
  transfer.user = user.id
  transfer.bucket = fromBucket.id
  transfer.amount = event.params.amount
  transfer.token = token.id
  transfer.timestamp = event.block.timestamp
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash
  transfer.fromBucket = fromBucket.id
  transfer.toBucket = toBucket.id
  transfer.save()
  
  // Update bucket balances
  if (event.params.token.equals(ETH_ADDRESS)) {
    fromBucket.balance = fromBucket.balance.minus(event.params.amount)
    toBucket.balance = toBucket.balance.plus(event.params.amount)
  } else {
    let fromTokenBalance = getOrCreateTokenBalance(fromBucket, token)
    let toTokenBalance = getOrCreateTokenBalance(toBucket, token)
    
    fromTokenBalance.balance = fromTokenBalance.balance.minus(event.params.amount)
    fromTokenBalance.updatedAt = event.block.timestamp
    fromTokenBalance.save()
    
    toTokenBalance.balance = toTokenBalance.balance.plus(event.params.amount)
    toTokenBalance.updatedAt = event.block.timestamp
    toTokenBalance.save()
  }
  
  fromBucket.updatedAt = event.block.timestamp
  toBucket.updatedAt = event.block.timestamp
  fromBucket.save()
  toBucket.save()
  
  // Update user stats
  user.updatedAt = event.block.timestamp
  user.save()
}

export function handleFundsDeposited(event: FundsDeposited): void {
  let user = getOrCreateUser(event.params.user)
  let token = getOrCreateToken(event.params.token)
  
  // Create or get unallocated bucket for this user
  let unallocatedBucket = getOrCreateBucket(event.params.user, 'UNALLOCATED')
  
  // Create deposit record
  let depositId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let deposit = new Deposit(depositId)
  deposit.user = user.id
  deposit.bucket = unallocatedBucket.id
  deposit.amount = event.params.amount
  deposit.token = token.id
  deposit.timestamp = event.block.timestamp
  deposit.blockNumber = event.block.number
  deposit.transactionHash = event.transaction.hash
  deposit.type = 'DIRECT_DEPOSIT'
  deposit.save()
  
  // Update token balance for UNALLOCATED bucket
  if (event.params.token.equals(ETH_ADDRESS)) {
    unallocatedBucket.balance = unallocatedBucket.balance.plus(event.params.amount)
  } else {
    let tokenBalance = getOrCreateTokenBalance(unallocatedBucket, token)
    tokenBalance.balance = tokenBalance.balance.plus(event.params.amount)
    tokenBalance.updatedAt = event.block.timestamp
    tokenBalance.save()
  }
  
  unallocatedBucket.updatedAt = event.block.timestamp
  unallocatedBucket.save()
  
  // Update user stats
  user.totalBalance = user.totalBalance.plus(event.params.amount)
  user.updatedAt = event.block.timestamp
  user.save()
  
  // Update token stats
  token.totalVolume = token.totalVolume.plus(event.params.amount)
  token.save()
  
  // Update global stats
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (stats != null) {
    stats.totalDeposits = stats.totalDeposits.plus(event.params.amount)
    stats.totalVolume = stats.totalVolume.plus(event.params.amount)
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}

export function handleMonthlyLimitReset(event: MonthlyLimitReset): void {
  let user = getOrCreateUser(event.params.user)
  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName)
  
  // Create reset record
  let resetId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let reset = new MonthlyLimitResetEntity(resetId)
  reset.user = user.id
  reset.bucket = bucket.id
  reset.timestamp = event.block.timestamp
  reset.blockNumber = event.block.number
  reset.transactionHash = event.transaction.hash
  reset.save()
  
  // Update bucket
  bucket.monthlySpent = BigInt.fromI32(0)
  bucket.lastResetTimestamp = event.block.timestamp
  bucket.updatedAt = event.block.timestamp
  bucket.save()
}

export function handleDelegateAdded(event: DelegateAdded): void {
  let user = getOrCreateUser(event.params.user)
  let delegate = getOrCreateUser(event.params.delegate)
  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName)
  
  // Create delegate record
  let delegateId = event.params.user.toHex() + '-' + event.params.delegate.toHex() + '-' + event.params.bucketName
  let delegateEntity = new Delegate(delegateId)
  delegateEntity.user = user.id
  delegateEntity.delegate = delegate.id
  delegateEntity.bucket = bucket.id
  delegateEntity.active = true
  delegateEntity.createdAt = event.block.timestamp
  delegateEntity.updatedAt = event.block.timestamp
  delegateEntity.save()
}

export function handleDelegateRemoved(event: DelegateRemoved): void {
  let delegateId = event.params.user.toHex() + '-' + event.params.delegate.toHex() + '-' + event.params.bucketName
  let delegateEntity = Delegate.load(delegateId)
  if (delegateEntity != null) {
    delegateEntity.active = false
    delegateEntity.updatedAt = event.block.timestamp
    delegateEntity.save()
  }
}

export function handleUnallocatedWithdraw(event: UnallocatedWithdraw): void {
  let user = getOrCreateUser(event.params.user)
  let token = getOrCreateToken(event.params.token)
  
  // Create withdrawal record
  let withdrawalId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let withdrawal = new Withdrawal(withdrawalId)
  withdrawal.user = user.id
  withdrawal.bucket = null // No bucket for unallocated withdrawals
  withdrawal.amount = event.params.amount
  withdrawal.token = token.id
  withdrawal.timestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.recipient = event.params.recipient
  withdrawal.type = 'UNALLOCATED_WITHDRAW'
  withdrawal.save()
  
  // Update user stats
  user.totalBalance = user.totalBalance.minus(event.params.amount)
  user.updatedAt = event.block.timestamp
  user.save()
  
  // Update token stats
  token.totalVolume = token.totalVolume.plus(event.params.amount)
  token.save()
  
  // Update global stats
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (stats != null) {
    stats.totalWithdrawals = stats.totalWithdrawals.plus(event.params.amount)
    stats.totalVolume = stats.totalVolume.plus(event.params.amount)
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}

export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
  let user = getOrCreateUser(event.params.user)
  let token = getOrCreateToken(event.params.token)
  
  // Create or get emergency bucket for this user
  let emergencyBucket = getOrCreateBucket(event.params.user, 'EMERGENCY_WITHDRAW')
  
  // Create withdrawal record
  let withdrawalId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let withdrawal = new Withdrawal(withdrawalId)
  withdrawal.user = user.id
  withdrawal.bucket = emergencyBucket.id
  withdrawal.amount = event.params.amount
  withdrawal.token = token.id
  withdrawal.timestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transactionHash = event.transaction.hash
  withdrawal.recipient = event.params.user
  withdrawal.type = 'EMERGENCY_WITHDRAW'
  withdrawal.save()
  
  // Update user stats
  user.totalBalance = user.totalBalance.minus(event.params.amount)
  user.updatedAt = event.block.timestamp
  user.save()
  
  // Update token stats
  token.totalVolume = token.totalVolume.plus(event.params.amount)
  token.save()
  
  // Update global stats
  let stats = GlobalStats.load(GLOBAL_STATS_ID)
  if (stats != null) {
    stats.totalWithdrawals = stats.totalWithdrawals.plus(event.params.amount)
    stats.totalVolume = stats.totalVolume.plus(event.params.amount)
    stats.updatedAt = event.block.timestamp
    stats.save()
  }
}