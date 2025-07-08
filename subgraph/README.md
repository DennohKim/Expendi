# Expendi Budget Wallet Subgraph

This subgraph indexes events from the Expendi budget wallet smart contracts deployed on Base Sepolia.

## Contract Addresses

- **SimpleBudgetWallet**: `0xD729Ed1682Bff761c3808469c6BDd99A7280742d`
- **SimpleBudgetWalletFactory**: `0xf26404Dc9c23241b7b596EdD66a7cD3bcafB948a`
- **Network**: Base Sepolia (Chain ID: 84532)

## Features

The subgraph tracks:

### Core Entities
- **Users**: Wallet owners with their statistics and balances
- **Buckets**: Spending buckets with limits and balances
- **Tokens**: ERC20 tokens and ETH used in the system
- **Token Balances**: Token balances within specific buckets

### Transactions
- **Deposits**: Direct deposits and bucket funding
- **Withdrawals**: Bucket spending and emergency withdrawals
- **Transfers**: Between-bucket transfers
- **Delegates**: Delegation permissions for bucket spending

### Events Tracked
- Bucket creation, updates, and funding
- Spending from buckets
- Fund deposits and withdrawals
- Delegate management
- Monthly limit resets
- Emergency operations
- Wallet creation from factory

## GraphQL Schema

Key queryable entities:

```graphql
type User {
  id: ID!
  address: Bytes!
  buckets: [Bucket!]!
  totalBalance: BigInt!
  totalSpent: BigInt!
  bucketsCount: Int!
  transactions: [Transaction!]!
}

type Bucket {
  id: ID!
  user: User!
  name: String!
  balance: BigInt!
  monthlySpent: BigInt!
  monthlyLimit: BigInt!
  active: Boolean!
  tokenBalances: [TokenBalance!]!
}

type Transaction {
  id: ID!
  user: User!
  bucket: Bucket!
  amount: BigInt!
  token: Token!
  timestamp: BigInt!
  type: TransactionType!
}
```

## Example Queries

### Get User's Buckets
```graphql
{
  user(id: "0x...") {
    id
    address
    totalBalance
    totalSpent
    bucketsCount
    buckets {
      id
      name
      balance
      monthlyLimit
      monthlySpent
      active
      tokenBalances {
        token {
          symbol
          name
        }
        balance
      }
    }
  }
}
```

### Get Recent Transactions
```graphql
{
  transactions(
    first: 10
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    user {
      id
    }
    bucket {
      name
    }
    amount
    token {
      symbol
    }
    timestamp
    ... on Deposit {
      type
    }
    ... on Withdrawal {
      type
      recipient
    }
  }
}
```

### Get Global Statistics
```graphql
{
  globalStats(id: "global") {
    totalUsers
    totalBuckets
    totalWalletsCreated
    totalVolume
    totalDeposits
    totalWithdrawals
  }
}
```

## Deployment

### Prerequisites
1. Graph CLI installed globally: `npm install -g @graphprotocol/graph-cli`
2. Subgraph Studio account at https://thegraph.com/studio

### Steps

1. **Create subgraph in Studio**:
   - Go to https://thegraph.com/studio
   - Create a new subgraph
   - Note the deploy key and subgraph slug

2. **Authenticate**:
   ```bash
   graph auth --studio <DEPLOY_KEY>
   ```

3. **Deploy**:
   ```bash
   npm run deploy -- <SUBGRAPH_SLUG>
   ```

   Or manually:
   ```bash
   graph deploy --studio <SUBGRAPH_SLUG>
   ```

### Local Development

For local development with Graph Node:

1. **Start local Graph Node**:
   ```bash
   git clone https://github.com/graphprotocol/graph-node
   cd graph-node/docker
   docker-compose up
   ```

2. **Create local subgraph**:
   ```bash
   npm run create-local
   ```

3. **Deploy locally**:
   ```bash
   npm run deploy-local
   ```

## Build Commands

- `npm run codegen` - Generate types from GraphQL schema
- `npm run build` - Build the subgraph
- `npm run deploy` - Deploy to Subgraph Studio
- `npm run deploy-local` - Deploy to local Graph Node

## Development Notes

- The subgraph uses a start block of 19500000 for Base Sepolia
- Special buckets are created automatically:
  - `UNALLOCATED` for direct deposits
  - `EMERGENCY_WITHDRAW` for emergency withdrawals
- All transactions are linked to buckets for better organization
- Monthly limits automatically reset based on timestamps

## Support

For issues or questions:
- Check the Graph Protocol documentation: https://thegraph.com/docs/
- Join the Graph Discord: https://discord.gg/graphprotocol
- File issues in the project repository