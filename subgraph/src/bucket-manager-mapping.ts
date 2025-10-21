import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import {
  BucketCreated,
  BucketFunded,
  BucketDeleted,
  OneTimePaymentMade,
  BucketSubscriptionCreated,
  BucketSubscriptionCharged,
  BucketSubscriptionCancelled,
  BucketBalanceChanged,
  BucketMonthlySpendingUpdated,
  UserActivity as UserActivityEvent,
  SecurityEvent as SecurityEventEvent,
  SubscriptionAnalytics
} from "../../generated/ExpendiBucketManager/ExpendiBucketManager"
import {
  UserEntity,
  BucketEntity,
  SubscriptionEntity,
  PaymentEntity,
  DepositEntity,
  SubscriptionCharge,
  BucketBalanceChange,
  BucketMonthlySpendingUpdate,
  UserActivity,
  SecurityEvent,
  SubscriptionAnalytic,
  GlobalStats
} from "../../generated/schema"

// Helper function to get or create user
function getOrCreateUser(address: Address): UserEntity {
  let user = UserEntity.load(address.toHexString())
  if (user == null) {
    user = new UserEntity(address.toHexString())
    user.address = address
    user.totalBuckets = BigInt.fromI32(0)
    user.totalSubscriptions = BigInt.fromI32(0)
    user.isEmergencyPaused = false
    user.createdAt = BigInt.fromI32(0)
    user.lastActivity = BigInt.fromI32(0)
    user.save()
    
    // Update global stats
    let stats = getOrCreateGlobalStats()
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1))
    stats.lastUpdated = BigInt.fromI32(0)
    stats.save()
  }
  return user as UserEntity
}

// Helper function to get or create global stats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global")
  if (stats == null) {
    stats = new GlobalStats("global")
    stats.totalUsers = BigInt.fromI32(0)
    stats.totalBuckets = BigInt.fromI32(0)
    stats.totalSubscriptions = BigInt.fromI32(0)
    stats.totalPayments = BigInt.fromI32(0)
    stats.totalVolume = BigInt.fromI32(0)
    stats.lastUpdated = BigInt.fromI32(0)
  }
  return stats as GlobalStats
}

export function handleBucketCreated(event: BucketCreated): void {
  let user = getOrCreateUser(event.params.user)
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  
  let bucket = new BucketEntity(bucketId)
  bucket.user = user.id
  bucket.name = event.params.bucketName
  bucket.monthlyLimit = event.params.monthlyLimit
  bucket.currentBalance = BigInt.fromI32(0)
  bucket.monthlySpent = BigInt.fromI32(0)
  bucket.lastResetTimestamp = event.params.timestamp
  bucket.isActive = true
  bucket.subscriptionCount = BigInt.fromI32(0)
  bucket.totalFunded = BigInt.fromI32(0)
  bucket.totalSpent = BigInt.fromI32(0)
  bucket.createdAt = event.params.timestamp
  bucket.lastActivity = event.params.timestamp
  bucket.save()
  
  // Update user stats
  user.totalBuckets = user.totalBuckets.plus(BigInt.fromI32(1))
  user.lastActivity = event.params.timestamp
  if (user.createdAt.equals(BigInt.fromI32(0))) {
    user.createdAt = event.params.timestamp
  }
  user.save()
  
  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalBuckets = stats.totalBuckets.plus(BigInt.fromI32(1))
  stats.lastUpdated = event.params.timestamp
  stats.save()
}

export function handleBucketFunded(event: BucketFunded): void {
  let user = getOrCreateUser(event.params.user)
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  let bucket = BucketEntity.load(bucketId)
  
  if (bucket != null) {
    bucket.currentBalance = event.params.newBalance
    bucket.totalFunded = bucket.totalFunded.plus(event.params.amount)
    bucket.lastActivity = event.params.timestamp
    bucket.save()
    
    // Create deposit entity
    let depositId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString()
    let deposit = new DepositEntity(depositId)
    deposit.user = user.id
    deposit.bucket = bucket.id
    deposit.amount = event.params.amount
    deposit.token = event.params.token
    deposit.newBalance = event.params.newBalance
    deposit.transactionHash = event.transaction.hash
    deposit.blockNumber = event.block.number
    deposit.timestamp = event.params.timestamp
    deposit.logIndex = event.logIndex
    deposit.save()
    
    // Update user
    user.lastActivity = event.params.timestamp
    user.save()
  }
}

export function handleBucketDeleted(event: BucketDeleted): void {
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  let bucket = BucketEntity.load(bucketId)
  
  if (bucket != null) {
    bucket.isActive = false
    bucket.lastActivity = event.params.timestamp
    bucket.save()
    
    // Update user stats
    let user = getOrCreateUser(event.params.user)
    user.totalBuckets = user.totalBuckets.minus(BigInt.fromI32(1))
    user.lastActivity = event.params.timestamp
    user.save()
    
    // Update global stats
    let stats = getOrCreateGlobalStats()
    stats.totalBuckets = stats.totalBuckets.minus(BigInt.fromI32(1))
    stats.lastUpdated = event.params.timestamp
    stats.save()
  }
}

export function handleOneTimePaymentMade(event: OneTimePaymentMade): void {
  let user = getOrCreateUser(event.params.user)
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  let bucket = BucketEntity.load(bucketId)
  
  // Create payment entity
  let paymentId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString()
  let payment = new PaymentEntity(paymentId)
  payment.user = user.id
  payment.bucket = bucketId
  payment.amount = event.params.amount
  payment.token = event.params.token
  payment.recipient = event.params.recipient
  payment.description = event.params.description
  payment.newBucketBalance = event.params.newBucketBalance
  payment.monthlySpent = event.params.monthlySpent
  payment.transactionHash = event.transaction.hash
  payment.blockNumber = event.block.number
  payment.timestamp = event.params.timestamp
  payment.logIndex = event.logIndex
  payment.save()
  
  // Update bucket
  if (bucket != null) {
    bucket.currentBalance = event.params.newBucketBalance
    bucket.monthlySpent = event.params.monthlySpent
    bucket.totalSpent = bucket.totalSpent.plus(event.params.amount)
    bucket.lastActivity = event.params.timestamp
    bucket.save()
  }
  
  // Update user
  user.lastActivity = event.params.timestamp
  user.save()
  
  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalPayments = stats.totalPayments.plus(BigInt.fromI32(1))
  stats.totalVolume = stats.totalVolume.plus(event.params.amount)
  stats.lastUpdated = event.params.timestamp
  stats.save()
}

export function handleBucketSubscriptionCreated(event: BucketSubscriptionCreated): void {
  let user = getOrCreateUser(event.params.user)
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  let bucket = BucketEntity.load(bucketId)
  
  // Create subscription entity
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString()
  let subscription = new SubscriptionEntity(subscriptionId)
  subscription.user = user.id
  subscription.bucket = bucketId
  subscription.subscriptionId = event.params.subscriptionId
  subscription.amount = event.params.amount
  subscription.periodInDays = event.params.periodInDays
  subscription.token = event.params.token
  subscription.recipient = event.params.recipient
  subscription.isActive = true
  subscription.userConsent = event.params.userConsent
  subscription.totalCharged = BigInt.fromI32(0)
  subscription.chargeCount = BigInt.fromI32(0)
  subscription.nextChargeTimestamp = event.params.nextChargeTimestamp
  subscription.lastProcessedAt = BigInt.fromI32(0)
  subscription.metadata = event.params.metadata
  subscription.createdAt = event.params.timestamp
  subscription.save()
  
  // Update bucket
  if (bucket != null) {
    bucket.subscriptionCount = bucket.subscriptionCount.plus(BigInt.fromI32(1))
    bucket.lastActivity = event.params.timestamp
    bucket.save()
  }
  
  // Update user
  user.totalSubscriptions = user.totalSubscriptions.plus(BigInt.fromI32(1))
  user.lastActivity = event.params.timestamp
  user.save()
  
  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalSubscriptions = stats.totalSubscriptions.plus(BigInt.fromI32(1))
  stats.lastUpdated = event.params.timestamp
  stats.save()
}

export function handleBucketSubscriptionCharged(event: BucketSubscriptionCharged): void {
  let user = getOrCreateUser(event.params.user)
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString()
  let subscription = SubscriptionEntity.load(subscriptionId)
  let bucket = BucketEntity.load(bucketId)
  
  // Create subscription charge entity
  let chargeId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString()
  let charge = new SubscriptionCharge(chargeId)
  charge.subscription = subscriptionId
  charge.user = user.id
  charge.bucket = bucketId
  charge.amount = event.params.amount
  charge.token = event.params.token
  charge.recipient = event.params.recipient
  charge.newBucketBalance = event.params.newBucketBalance
  charge.totalCharged = event.params.totalCharged
  charge.chargeCount = event.params.chargeCount
  charge.nextChargeTimestamp = event.params.nextChargeTimestamp
  charge.transactionHash = event.transaction.hash
  charge.blockNumber = event.block.number
  charge.timestamp = event.params.timestamp
  charge.logIndex = event.logIndex
  charge.save()
  
  // Update subscription
  if (subscription != null) {
    subscription.totalCharged = event.params.totalCharged
    subscription.chargeCount = event.params.chargeCount
    subscription.nextChargeTimestamp = event.params.nextChargeTimestamp
    subscription.lastProcessedAt = event.params.timestamp
    subscription.save()
  }
  
  // Update bucket
  if (bucket != null) {
    bucket.currentBalance = event.params.newBucketBalance
    bucket.totalSpent = bucket.totalSpent.plus(event.params.amount)
    bucket.lastActivity = event.params.timestamp
    bucket.save()
  }
  
  // Update user
  user.lastActivity = event.params.timestamp
  user.save()
  
  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalVolume = stats.totalVolume.plus(event.params.amount)
  stats.lastUpdated = event.params.timestamp
  stats.save()
}

export function handleBucketSubscriptionCancelled(event: BucketSubscriptionCancelled): void {
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString()
  let subscription = SubscriptionEntity.load(subscriptionId)
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  let bucket = BucketEntity.load(bucketId)
  
  // Update subscription
  if (subscription != null) {
    subscription.isActive = false
    subscription.cancelledAt = event.params.timestamp
    subscription.save()
  }
  
  // Update bucket
  if (bucket != null) {
    bucket.subscriptionCount = bucket.subscriptionCount.minus(BigInt.fromI32(1))
    bucket.lastActivity = event.params.timestamp
    bucket.save()
  }
  
  // Update user
  let user = getOrCreateUser(event.params.user)
  user.totalSubscriptions = user.totalSubscriptions.minus(BigInt.fromI32(1))
  user.lastActivity = event.params.timestamp
  user.save()
  
  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalSubscriptions = stats.totalSubscriptions.minus(BigInt.fromI32(1))
  stats.lastUpdated = event.params.timestamp
  stats.save()
}

export function handleBucketBalanceChanged(event: BucketBalanceChanged): void {
  let user = getOrCreateUser(event.params.user)
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  let bucket = BucketEntity.load(bucketId)
  
  // Create balance change entity
  let changeId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString()
  let balanceChange = new BucketBalanceChange(changeId)
  balanceChange.user = user.id
  balanceChange.bucket = bucketId
  balanceChange.token = event.params.token
  balanceChange.oldBalance = event.params.oldBalance
  balanceChange.newBalance = event.params.newBalance
  balanceChange.amount = event.params.amount
  balanceChange.changeType = event.params.changeType
  balanceChange.transactionHash = event.transaction.hash
  balanceChange.blockNumber = event.block.number
  balanceChange.timestamp = event.params.timestamp
  balanceChange.logIndex = event.logIndex
  balanceChange.save()
  
  // Update bucket
  if (bucket != null) {
    bucket.currentBalance = event.params.newBalance
    bucket.lastActivity = event.params.timestamp
    bucket.save()
  }
  
  // Update user
  user.lastActivity = event.params.timestamp
  user.save()
}

export function handleBucketMonthlySpendingUpdated(event: BucketMonthlySpendingUpdated): void {
  let user = getOrCreateUser(event.params.user)
  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName
  let bucket = BucketEntity.load(bucketId)
  
  // Create monthly spending update entity
  let updateId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString()
  let spendingUpdate = new BucketMonthlySpendingUpdate(updateId)
  spendingUpdate.user = user.id
  spendingUpdate.bucket = bucketId
  spendingUpdate.oldMonthlySpent = event.params.oldMonthlySpent
  spendingUpdate.newMonthlySpent = event.params.newMonthlySpent
  spendingUpdate.monthlyLimit = event.params.monthlyLimit
  spendingUpdate.utilizationPercentage = event.params.utilizationPercentage
  spendingUpdate.transactionHash = event.transaction.hash
  spendingUpdate.blockNumber = event.block.number
  spendingUpdate.timestamp = event.params.timestamp
  spendingUpdate.logIndex = event.logIndex
  spendingUpdate.save()
  
  // Update bucket
  if (bucket != null) {
    bucket.monthlySpent = event.params.newMonthlySpent
    bucket.lastActivity = event.params.timestamp
    bucket.save()
  }
  
  // Update user
  user.lastActivity = event.params.timestamp
  user.save()
}

export function handleUserActivity(event: UserActivityEvent): void {
  let user = getOrCreateUser(event.params.user)
  
  // Create user activity entity
  let activityId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString()
  let activity = new UserActivity(activityId)
  activity.user = user.id
  activity.activityType = event.params.activityType
  activity.bucketName = event.params.bucketName
  activity.amount = event.params.amount
  activity.token = event.params.token
  activity.transactionHash = event.transaction.hash
  activity.blockNumber = event.block.number
  activity.timestamp = event.params.timestamp
  activity.logIndex = event.logIndex
  activity.save()
  
  // Update user
  user.lastActivity = event.params.timestamp
  user.save()
}

export function handleSecurityEvent(event: SecurityEventEvent): void {
  let user = getOrCreateUser(event.params.user)
  
  // Create security event entity
  let eventId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString()
  let securityEvent = new SecurityEvent(eventId)
  securityEvent.user = user.id
  securityEvent.eventType = event.params.eventType
  securityEvent.description = event.params.description
  securityEvent.transactionHash = event.transaction.hash
  securityEvent.blockNumber = event.block.number
  securityEvent.timestamp = event.params.timestamp
  securityEvent.logIndex = event.logIndex
  securityEvent.save()
  
  // Update user
  user.lastActivity = event.params.timestamp
  user.save()
}

export function handleSubscriptionAnalytics(event: SubscriptionAnalytics): void {
  let user = getOrCreateUser(event.params.user)
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString()
  
  // Create subscription analytics entity
  let analyticsId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString()
  let analytics = new SubscriptionAnalytic(analyticsId)
  analytics.subscription = subscriptionId
  analytics.user = user.id
  analytics.bucketName = event.params.bucketName
  analytics.totalCharged = event.params.totalCharged
  analytics.chargeCount = event.params.chargeCount
  analytics.periodInDays = event.params.periodInDays
  analytics.recipient = event.params.recipient
  analytics.transactionHash = event.transaction.hash
  analytics.blockNumber = event.block.number
  analytics.timestamp = event.params.timestamp
  analytics.logIndex = event.logIndex
  analytics.save()
  
  // Update user
  user.lastActivity = event.params.timestamp
  user.save()
}