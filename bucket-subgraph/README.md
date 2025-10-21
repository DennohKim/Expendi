# ExpendiBucketManager Subgraph

A subgraph for indexing data from the ExpendiBucketManager contract deployed on Base Sepolia.

## Overview

This subgraph indexes all events from the ExpendiBucketManager contract, providing queryable data for:

- **Users**: Track user activity, buckets, subscriptions, and security events
- **Buckets**: Monitor bucket creation, funding, deletion, and balance changes
- **Subscriptions**: Track subscription lifecycle, charges, and analytics
- **Payments**: Index one-time payments and transaction history
- **Security Events**: Monitor emergency pauses and security-related activities
- **Analytics**: Comprehensive activity tracking and subscription metrics

## Contract Details

- **Network**: Base Sepolia Testnet
- **Contract Address**: `0x4832FE3192f205F753F1C334916B7cfec7823D64`
- **Start Block**: 32577148

## Quick Start

### Prerequisites

- Node.js v16+ and pnpm
- Graph CLI: `npm install -g @graphprotocol/graph-cli`

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm codegen  # Generate types
pnpm build    # Build subgraph
```

### Deploy

```bash
pnpm deploy   # Deploy to The Graph Studio
```

## Schema Overview

### Core Entities

#### User
```graphql
type User {
  id: ID!                           # User address
  address: Bytes!
  buckets: [Bucket!]!
  subscriptions: [Subscription!]!
  totalBuckets: BigInt!
  totalSubscriptions: BigInt!
  totalPayments: BigInt!
  isEmergencyPaused: Boolean!
  createdAt: BigInt!
  lastActivityAt: BigInt!
}
```

#### Bucket
```graphql
type Bucket {
  id: ID!                           # user_address + bucket_name
  user: User!
  name: String!
  balance: BigInt!                  # ETH balance
  monthlySpent: BigInt!
  monthlyLimit: BigInt!
  isActive: Boolean!
  subscriptionCount: BigInt!
  tokenBalances: [TokenBalance!]!   # ERC20 balances
  subscriptions: [Subscription!]!
}
```

#### Subscription
```graphql
type Subscription {
  id: ID!                           # user_address + subscription_id
  user: User!
  bucket: Bucket!
  subscriptionId: BigInt!
  amount: BigInt!
  periodInDays: BigInt!
  token: Bytes!
  recipient: Bytes!
  isActive: Boolean!
  userConsent: Boolean!
  totalCharged: BigInt!
  chargeCount: BigInt!
  charges: [SubscriptionCharge!]!
}
```

### Event Tracking

The subgraph captures all contract events:

- **Bucket Events**: Creation, funding, deletion, balance changes
- **Subscription Events**: Creation, charges, cancellation, pause/resume
- **Payment Events**: One-time payments and transfers
- **Security Events**: Emergency pauses, rate limiting, security alerts
- **Analytics Events**: User activity tracking and subscription metrics

## Example Queries

### Get all buckets for a user
```graphql
{
  user(id: "0x...") {
    buckets {
      name
      balance
      monthlySpent
      monthlyLimit
      subscriptionCount
      isActive
    }
  }
}
```

### Get active subscriptions
```graphql
{
  subscriptions(where: {isActive: true}) {
    subscriptionId
    amount
    periodInDays
    token
    recipient
    totalCharged
    chargeCount
    bucket {
      name
    }
    user {
      address
    }
  }
}
```

### Get subscription charges for a bucket
```graphql
{
  subscriptionCharges(
    where: {bucket: "0x..._bucketName"}
    orderBy: timestamp
    orderDirection: desc
  ) {
    amount
    timestamp
    subscription {
      subscriptionId
    }
  }
}
```

### Get user activity
```graphql
{
  userActivities(
    where: {user: "0x..."}
    orderBy: timestamp
    orderDirection: desc
  ) {
    activityType
    bucketName
    amount
    token
    timestamp
  }
}
```

### Get bucket balance history
```graphql
{
  bucketBalanceHistories(
    where: {bucket: "0x..._bucketName"}
    orderBy: timestamp
    orderDirection: desc
  ) {
    oldBalance
    newBalance
    changeAmount
    changeType
    token
    timestamp
  }
}
```

## Development

### File Structure
```
├── src/
│   └── mapping.ts              # Event handlers
├── abis/
│   └── ExpendiBucketManager.json # Contract ABI
├── schema.graphql              # GraphQL schema
├── subgraph.yaml              # Subgraph manifest
└── package.json
```

### Event Handlers

The mapping file (`src/mapping.ts`) contains handlers for all contract events:

- `handleBucketCreated`: Index bucket creation
- `handleBucketFunded`: Track funding events
- `handleBucketSubscriptionCreated`: Index new subscriptions
- `handleBucketSubscriptionCharged`: Track subscription payments
- `handleOneTimePaymentMade`: Index direct payments
- `handleSecurityEvent`: Monitor security events
- `handleUserActivity`: Track user interactions

### Helper Functions

- `getOrCreateUser()`: Manages user entities
- `getOrCreateBucket()`: Handles bucket lifecycle
- `getOrCreateTokenBalance()`: Tracks token balances

## Deployment

The subgraph is configured to deploy to The Graph Studio with the deploy key provided.

```bash
# Deploy to studio
pnpm deploy
```

## Contributing

1. Make changes to schema or mappings
2. Run `pnpm codegen` to generate types
3. Run `pnpm build` to compile
4. Test thoroughly before deploying

## Support

For issues or questions:
- Check The Graph documentation
- Review contract events in block explorer
- Verify ABI matches contract deployment