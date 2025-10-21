import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  BucketCreated,
  BucketFunded,
  BucketDeleted,
  OneTimePaymentMade,
  BucketSubscriptionCreated,
  BucketSubscriptionCharged,
  BucketSubscriptionCancelled,
  BucketSubscriptionPaused,
  BucketSubscriptionResumed,
  MonthlyLimitReset,
  MonthlyLimitUpdated,
  BucketBalanceChanged,
  BucketMonthlySpendingUpdated,
  EmergencyPause,
  SecurityEvent,
  UserActivity,
  SubscriptionAnalytics
} from "../generated/ExpendiBucketManager/ExpendiBucketManager";

import {
  User,
  Bucket,
  BucketSubscription,
  SubscriptionCharge,
  Payment,
  Deposit,
  Withdrawal,
  BucketBalanceHistory,
  MonthlySpending,
  UserActivity as UserActivityEntity,
  SecurityEvent as SecurityEventEntity,
  SubscriptionAnalytics as SubscriptionAnalyticsEntity,
  EmergencyPause as EmergencyPauseEntity,
  MonthlyLimitReset as MonthlyLimitResetEntity,
  MonthlyLimitUpdate,
  TokenBalance
} from "../generated/schema";

// Helper function to get or create user
function getOrCreateUser(address: Address): User {
  let user = User.load(address.toHexString());
  if (user == null) {
    user = new User(address.toHexString());
    user.address = address;
    user.totalBuckets = BigInt.fromI32(0);
    user.totalSubscriptions = BigInt.fromI32(0);
    user.totalPayments = BigInt.fromI32(0);
    user.isEmergencyPaused = false;
    user.createdAt = BigInt.fromI32(0);
    user.lastActivityAt = BigInt.fromI32(0);
  }
  return user;
}

// Helper function to get or create bucket
function getOrCreateBucket(userAddress: Address, bucketName: string): Bucket {
  let bucketId = userAddress.toHexString() + "_" + bucketName;
  let bucket = Bucket.load(bucketId);
  if (bucket == null) {
    bucket = new Bucket(bucketId);
    bucket.user = userAddress.toHexString();
    bucket.name = bucketName;
    bucket.balance = BigInt.fromI32(0);
    bucket.monthlySpent = BigInt.fromI32(0);
    bucket.monthlyLimit = BigInt.fromI32(0);
    bucket.lastResetTimestamp = BigInt.fromI32(0);
    bucket.isActive = true;
    bucket.exists = true;
    bucket.subscriptionCount = BigInt.fromI32(0);
    bucket.createdAt = BigInt.fromI32(0);
    bucket.updatedAt = BigInt.fromI32(0);
    bucket.blockNumber = BigInt.fromI32(0);
    bucket.transactionHash = Bytes.empty();
  }
  return bucket;
}

// Helper function to get or create token balance
function getOrCreateTokenBalance(bucket: Bucket, token: Address): TokenBalance {
  let tokenBalanceId = bucket.id + "_" + token.toHexString();
  let tokenBalance = TokenBalance.load(tokenBalanceId);
  if (tokenBalance == null) {
    tokenBalance = new TokenBalance(tokenBalanceId);
    tokenBalance.bucket = bucket.id;
    tokenBalance.token = token;
    tokenBalance.balance = BigInt.fromI32(0);
    tokenBalance.updatedAt = BigInt.fromI32(0);
    tokenBalance.blockNumber = BigInt.fromI32(0);
  }
  return tokenBalance;
}

export function handleBucketCreated(event: BucketCreated): void {
  let user = getOrCreateUser(event.params.user);
  user.totalBuckets = user.totalBuckets.plus(BigInt.fromI32(1));
  user.createdAt = event.block.timestamp;
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.monthlyLimit = event.params.monthlyLimit;
  bucket.createdAt = event.block.timestamp;
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();
}

export function handleBucketFunded(event: BucketFunded): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;

  // Update token balance
  let tokenBalance = getOrCreateTokenBalance(bucket, event.params.token);
  tokenBalance.balance = tokenBalance.balance.plus(event.params.amount);
  tokenBalance.updatedAt = event.block.timestamp;
  tokenBalance.blockNumber = event.block.number;
  tokenBalance.save();

  // Update ETH balance if it's ETH (address(0))
  if (event.params.token == Address.zero()) {
    bucket.balance = event.params.newBalance;
  }
  
  bucket.save();
}

export function handleBucketDeleted(event: BucketDeleted): void {
  let user = getOrCreateUser(event.params.user);
  user.totalBuckets = user.totalBuckets.minus(BigInt.fromI32(1));
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucketId = event.params.user.toHexString() + "_" + event.params.bucketName.toString();
  let bucket = Bucket.load(bucketId);
  if (bucket != null) {
    bucket.exists = false;
    bucket.isActive = false;
    bucket.updatedAt = event.block.timestamp;
    bucket.blockNumber = event.block.number;
    bucket.transactionHash = event.transaction.hash;
    bucket.save();
  }
}

export function handleOneTimePaymentMade(event: OneTimePaymentMade): void {
  let user = getOrCreateUser(event.params.user);
  user.totalPayments = user.totalPayments.plus(BigInt.fromI32(1));
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();

  // Create payment entity
  let paymentId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString();
  let payment = new Payment(paymentId);
  payment.user = user.id;
  payment.bucket = bucket.id;
  payment.amount = event.params.amount;
  payment.token = event.params.token;
  payment.recipient = event.params.recipient;
  payment.description = event.params.description;
  payment.newBucketBalance = event.params.newBucketBalance;
  payment.monthlySpent = event.params.monthlySpent;
  payment.timestamp = event.block.timestamp;
  payment.blockNumber = event.block.number;
  payment.transactionHash = event.transaction.hash;
  payment.save();
}

export function handleBucketSubscriptionCreated(event: BucketSubscriptionCreated): void {
  let user = getOrCreateUser(event.params.user);
  user.totalSubscriptions = user.totalSubscriptions.plus(BigInt.fromI32(1));
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.subscriptionCount = bucket.subscriptionCount.plus(BigInt.fromI32(1));
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();

  // Create subscription entity
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString();
  let subscription = new BucketSubscription(subscriptionId);
  subscription.user = user.id;
  subscription.bucket = bucket.id;
  subscription.subscriptionId = event.params.subscriptionId;
  subscription.amount = event.params.amount;
  subscription.periodInDays = event.params.periodInDays;
  subscription.token = event.params.token;
  subscription.recipient = event.params.recipient;
  subscription.isActive = true;
  subscription.nextChargeTimestamp = event.params.nextChargeTimestamp;
  subscription.totalCharged = BigInt.fromI32(0);
  subscription.chargeCount = BigInt.fromI32(0);
  subscription.userConsent = event.params.userConsent;
  subscription.metadata = event.params.metadata;
  subscription.createdAt = event.block.timestamp;
  subscription.lastProcessedAt = BigInt.fromI32(0);
  subscription.blockNumber = event.block.number;
  subscription.transactionHash = event.transaction.hash;
  subscription.save();
}

export function handleBucketSubscriptionCharged(event: BucketSubscriptionCharged): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();

  // Update subscription
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString();
  let subscription = BucketSubscription.load(subscriptionId);
  if (subscription != null) {
    subscription.totalCharged = event.params.totalCharged;
    subscription.chargeCount = event.params.chargeCount;
    subscription.nextChargeTimestamp = event.params.nextChargeTimestamp;
    subscription.lastProcessedAt = event.block.timestamp;
    subscription.save();
  }

  // Create subscription charge entity
  let chargeId = subscriptionId + "_" + event.params.chargeCount.toString();
  let charge = new SubscriptionCharge(chargeId);
  charge.subscription = subscriptionId;
  charge.user = user.id;
  charge.bucket = bucket.id;
  charge.amount = event.params.amount;
  charge.token = event.params.token;
  charge.recipient = event.params.recipient;
  charge.newBucketBalance = event.params.newBucketBalance;
  charge.totalCharged = event.params.totalCharged;
  charge.chargeCount = event.params.chargeCount;
  charge.nextChargeTimestamp = event.params.nextChargeTimestamp;
  charge.timestamp = event.block.timestamp;
  charge.blockNumber = event.block.number;
  charge.transactionHash = event.transaction.hash;
  charge.save();
}

export function handleBucketSubscriptionCancelled(event: BucketSubscriptionCancelled): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.subscriptionCount = bucket.subscriptionCount.minus(BigInt.fromI32(1));
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();

  // Update subscription
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString();
  let subscription = BucketSubscription.load(subscriptionId);
  if (subscription != null) {
    subscription.isActive = false;
    subscription.cancelledAt = event.block.timestamp;
    subscription.save();
  }
}

export function handleBucketSubscriptionPaused(event: BucketSubscriptionPaused): void {
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString();
  let subscription = BucketSubscription.load(subscriptionId);
  if (subscription != null) {
    subscription.isActive = false;
    subscription.save();
  }
}

export function handleBucketSubscriptionResumed(event: BucketSubscriptionResumed): void {
  let subscriptionId = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString();
  let subscription = BucketSubscription.load(subscriptionId);
  if (subscription != null) {
    subscription.isActive = true;
    subscription.save();
  }
}

export function handleMonthlyLimitReset(event: MonthlyLimitReset): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.monthlySpent = BigInt.fromI32(0);
  bucket.monthlyLimit = event.params.newLimit;
  bucket.lastResetTimestamp = event.params.resetTimestamp;
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();

  // Create monthly limit reset entity
  let resetId = bucket.id + "_" + event.params.resetTimestamp.toString();
  let reset = new MonthlyLimitResetEntity(resetId);
  reset.bucket = bucket.id;
  reset.user = user.id;
  reset.oldSpent = event.params.oldSpent;
  reset.newLimit = event.params.newLimit;
  reset.resetTimestamp = event.params.resetTimestamp;
  reset.timestamp = event.block.timestamp;
  reset.blockNumber = event.block.number;
  reset.transactionHash = event.transaction.hash;
  reset.save();
}

export function handleMonthlyLimitUpdated(event: MonthlyLimitUpdated): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.monthlyLimit = event.params.newLimit;
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();

  // Create monthly limit update entity
  let updateId = bucket.id + "_" + event.block.timestamp.toString();
  let update = new MonthlyLimitUpdate(updateId);
  update.bucket = bucket.id;
  update.user = user.id;
  update.oldLimit = event.params.oldLimit;
  update.newLimit = event.params.newLimit;
  update.timestamp = event.block.timestamp;
  update.blockNumber = event.block.number;
  update.transactionHash = event.transaction.hash;
  update.save();
}

export function handleBucketBalanceChanged(event: BucketBalanceChanged): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();

  // Create balance history entity
  let historyId = bucket.id + "_" + event.block.timestamp.toString() + "_" + event.params.token.toHexString();
  let history = new BucketBalanceHistory(historyId);
  history.bucket = bucket.id;
  history.user = user.id;
  history.token = event.params.token;
  history.oldBalance = event.params.oldBalance;
  history.newBalance = event.params.newBalance;
  history.changeAmount = event.params.changeAmount;
  history.changeType = event.params.changeType;
  history.timestamp = event.block.timestamp;
  history.blockNumber = event.block.number;
  history.transactionHash = event.transaction.hash;
  history.save();
}

export function handleBucketMonthlySpendingUpdated(event: BucketMonthlySpendingUpdated): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());
  bucket.monthlySpent = event.params.newMonthlySpent;
  bucket.monthlyLimit = event.params.monthlyLimit;
  bucket.updatedAt = event.block.timestamp;
  bucket.blockNumber = event.block.number;
  bucket.transactionHash = event.transaction.hash;
  bucket.save();

  // Create monthly spending entity
  let spendingId = bucket.id + "_" + event.block.timestamp.toString();
  let spending = new MonthlySpending(spendingId);
  spending.bucket = bucket.id;
  spending.user = user.id;
  spending.oldMonthlySpent = event.params.oldMonthlySpent;
  spending.newMonthlySpent = event.params.newMonthlySpent;
  spending.monthlyLimit = event.params.monthlyLimit;
  spending.spendingPercentage = event.params.spendingPercentage;
  spending.isReset = false;
  spending.timestamp = event.block.timestamp;
  spending.blockNumber = event.block.number;
  spending.transactionHash = event.transaction.hash;
  spending.save();
}

export function handleEmergencyPause(event: EmergencyPause): void {
  let user = getOrCreateUser(event.params.user);
  user.isEmergencyPaused = event.params.paused;
  user.lastActivityAt = event.block.timestamp;
  user.save();

  // Create emergency pause entity
  let pauseId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString();
  let pause = new EmergencyPauseEntity(pauseId);
  pause.user = user.id;
  pause.paused = event.params.paused;
  pause.timestamp = event.block.timestamp;
  pause.blockNumber = event.block.number;
  pause.transactionHash = event.transaction.hash;
  pause.save();
}

export function handleSecurityEvent(event: SecurityEvent): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  // Create security event entity
  let eventId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString();
  let securityEvent = new SecurityEventEntity(eventId);
  securityEvent.user = user.id;
  securityEvent.eventType = event.params.eventType.toString();
  securityEvent.details = event.params.details;
  securityEvent.timestamp = event.block.timestamp;
  securityEvent.blockNumber = event.block.number;
  securityEvent.transactionHash = event.transaction.hash;
  securityEvent.save();
}

export function handleUserActivity(event: UserActivity): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  // Create user activity entity
  let activityId = event.transaction.hash.toHexString() + "_" + event.logIndex.toString();
  let activity = new UserActivityEntity(activityId);
  activity.user = user.id;
  activity.activityType = event.params.activityType.toString();
  activity.bucketName = event.params.bucketName;
  activity.amount = event.params.amount;
  activity.token = event.params.token;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.transactionHash = event.transaction.hash;
  activity.save();
}

export function handleSubscriptionAnalytics(event: SubscriptionAnalytics): void {
  let user = getOrCreateUser(event.params.user);
  user.lastActivityAt = event.block.timestamp;
  user.save();

  let bucket = getOrCreateBucket(event.params.user, event.params.bucketName.toString());

  // Create subscription analytics entity
  let analyticsId = event.params.subscriptionId.toString() + "_" + event.block.timestamp.toString();
  let analytics = new SubscriptionAnalyticsEntity(analyticsId);
  analytics.subscription = event.params.user.toHexString() + "_" + event.params.subscriptionId.toString();
  analytics.user = user.id;
  analytics.bucket = bucket.id;
  analytics.totalCharged = event.params.totalCharged;
  analytics.chargeCount = event.params.chargeCount;
  analytics.periodInDays = event.params.periodInDays;
  analytics.recipient = event.params.recipient;
  analytics.timestamp = event.block.timestamp;
  analytics.blockNumber = event.block.number;
  analytics.transactionHash = event.transaction.hash;
  analytics.save();
}