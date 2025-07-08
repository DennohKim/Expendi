import { BigInt, Address } from '@graphprotocol/graph-ts'
import {
  WalletCreated,
  WalletRegistered
} from '../generated/SimpleBudgetWalletFactory/SimpleBudgetWalletFactory'
import {
  User,
  WalletCreated as WalletCreatedEntity,
  GlobalStats
} from '../generated/schema'

// Constants
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
  }
  return user
}

// Helper function to update global stats
function updateGlobalStats(): void {
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
  
  stats.totalWalletsCreated = stats.totalWalletsCreated + 1
  stats.save()
}

export function handleWalletCreated(event: WalletCreated): void {
  let user = getOrCreateUser(event.params.user)
  
  // Create wallet created record
  let walletCreatedId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let walletCreated = new WalletCreatedEntity(walletCreatedId)
  walletCreated.user = user.id
  walletCreated.wallet = event.params.wallet
  walletCreated.salt = event.params.salt
  walletCreated.timestamp = event.block.timestamp
  walletCreated.blockNumber = event.block.number
  walletCreated.transactionHash = event.transaction.hash
  walletCreated.save()
  
  // Update user
  user.createdAt = event.block.timestamp
  user.updatedAt = event.block.timestamp
  user.save()
  
  // Update global stats
  updateGlobalStats()
}

export function handleWalletRegistered(event: WalletRegistered): void {
  let user = getOrCreateUser(event.params.user)
  
  // Create wallet created record (for registered wallets)
  let walletCreatedId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let walletCreated = new WalletCreatedEntity(walletCreatedId)
  walletCreated.user = user.id
  walletCreated.wallet = event.params.wallet
  walletCreated.salt = BigInt.fromI32(0) // No salt for registered wallets
  walletCreated.timestamp = event.block.timestamp
  walletCreated.blockNumber = event.block.number
  walletCreated.transactionHash = event.transaction.hash
  walletCreated.save()
  
  // Update user
  user.createdAt = event.block.timestamp
  user.updatedAt = event.block.timestamp
  user.save()
  
  // Update global stats
  updateGlobalStats()
}