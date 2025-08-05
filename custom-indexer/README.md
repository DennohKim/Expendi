# Custom Smart Contract Indexer

A custom indexer built with Viem to capture and index smart contract events from your budget wallet system on Base Mainnet.

## Features

- **Real-time Event Indexing**: Continuously monitors and indexes smart contract events
- **Database Storage**: PostgreSQL database with optimized schema for event storage
- **REST API**: Query indexed data through REST endpoints
- **Smart Account Support**: Handles dynamic wallet deployment through factory pattern
- **Batch Processing**: Efficient batch processing of blockchain events
- **Graceful Shutdown**: Proper cleanup and shutdown procedures

## Architecture

### Contracts Indexed

1. **SimpleBudgetWalletFactory** (`0x82eA29c17EE7eE9176CEb37F728Ab1967C4993a5`)
   - `WalletCreated` events
   - `WalletRegistered` events

2. **Dynamic Budget Wallets** (`0x4B80e374ff1639B748976a7bF519e2A35b43Ca26` template)
   - `BucketCreated` events
   - `BucketUpdated` events
   - `BucketFunded` events
   - `SpentFromBucket` events
   - `BucketTransfer` events
   - `FundsDeposited` events
   - `MonthlyLimitReset` events
   - `DelegateAdded` events
   - `DelegateRemoved` events
   - `UnallocatedWithdraw` events
   - `EmergencyWithdraw` events

3. **Token Contracts** (ERC-20 tokens including USDC, ETH, etc.)
   - `Transfer` events

## Setup

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- pnpm package manager

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Create database and run migrations:
```bash
createdb indexer_db
pnpm run db:migrate
```

### Running

Start the indexer and API server:
```bash
pnpm run dev
```

The indexer will:
- Connect to Base Mainnet network
- Start indexing from block 24070000
- Serve API endpoints on port 8030

## API Endpoints

### Base URL
`http://localhost:8030/api`

### Health & Status Endpoints

#### `GET /health`
**Function**: Health check endpoint
- **Returns**: Server health status and timestamp
- **Response**: `{ status: 'healthy', timestamp: ISO_string }`

#### `GET /status`
**Function**: Get overall indexer status
- **Returns**: Indexer running state, last processed block, and known wallets count
- **Response**: `{ isRunning: boolean, lastProcessedBlock: string, knownWalletsCount: number }`

#### `GET /status/contract/:address`
**Function**: Get indexer status for specific contract
- **Parameters**: `address` - Contract address
- **Returns**: Last processed block for the specific contract

### Event Endpoints

#### `GET /events`
**Function**: Get all events with advanced filtering
- **Query Parameters**:
  - `contractAddress` - Filter by contract address
  - `eventName` - Filter by event name
  - `blockNumber` - Filter by specific block
  - `transactionHash` - Filter by transaction hash
  - `user` - Filter by user address
  - `wallet` - Filter by wallet address
  - `bucketId` - Filter by bucket ID
  - `page` - Page number (default: 1)
  - `limit` - Results per page (default: 100)
  - `startBlock` - Start block for range
  - `endBlock` - End block for range

#### `GET /events/contract/:address`
**Function**: Get events by specific contract address
- **Parameters**: `address` - Contract address
- **Query Parameters**: `page`, `limit`

#### `GET /factory/events`
**Function**: Get factory wallet creation events specifically
- **Returns**: All `WalletCreated` events
- **Supports**: All standard query parameters

#### `GET /wallet/:address/buckets/events`
**Function**: Get bucket creation events for specific wallet
- **Parameters**: `address` - Wallet address
- **Returns**: All `BucketCreated` events for the wallet

#### `GET /wallet/:address/spending/events`
**Function**: Get spending events for specific wallet
- **Parameters**: `address` - Wallet address
- **Returns**: All `Spending` events for the wallet

#### `GET /tokens/transfers`
**Function**: Get token transfer events
- **Returns**: All `Transfer` events
- **Supports**: All standard query parameters

### Wallet & User Endpoints

#### `GET /wallets/user/:address`
**Function**: Get all wallets created by a user
- **Parameters**: `address` - User address
- **Returns**: Array of wallet records for the user

#### `GET /buckets/wallet/:address`
**Function**: Get all buckets for a specific wallet
- **Parameters**: `address` - Wallet address
- **Returns**: Array of bucket records

#### `GET /spending/wallet/:address`
**Function**: Get spending records for a specific wallet
- **Parameters**: `address` - Wallet address
- **Query Parameters**: `limit` (default: 100)
- **Returns**: Array of spending records

### Transfer Endpoints

#### `GET /transfers/wallet/:address`
**Function**: Get classified transfers for a specific wallet
- **Parameters**: `address` - Wallet address
- **Query Parameters**: `limit` (default: 100)
- **Returns**: All transfers (deposits, withdrawals, bucket transfers) for the wallet

#### `GET /transfers/type/:type`
**Function**: Get transfers by classification type
- **Parameters**: `type` - Transfer type (`deposit`, `withdrawal`, `bucket_transfer`, `external`)
- **Query Parameters**: `limit` (default: 100)
- **Returns**: Transfers of the specified type

#### `GET /transfers/token/:address`
**Function**: Get transfers for a specific token
- **Parameters**: `address` - Token contract address
- **Query Parameters**: `limit` (default: 100)
- **Returns**: All transfers of the specified token

#### `GET /wallet/:address/deposits`
**Function**: Get deposits to a specific wallet
- **Parameters**: `address` - Wallet address
- **Query Parameters**: `limit` (default: 100)
- **Returns**: Filtered transfers where type is 'deposit' and wallet is recipient

#### `GET /wallet/:address/withdrawals`
**Function**: Get withdrawals from a specific wallet
- **Parameters**: `address` - Wallet address
- **Query Parameters**: `limit` (default: 100)
- **Returns**: Filtered transfers where type is 'withdrawal' and wallet is sender

### Structured Withdrawal Endpoints

#### `GET /wallet/:address/structured-withdrawals`
**Function**: Get structured withdrawal records for a wallet
- **Parameters**: `address` - Wallet address
- **Query Parameters**: `limit` (default: 100), `offset` (default: 0)
- **Returns**: Structured withdrawal records (UnallocatedWithdraw, EmergencyWithdraw events)

#### `GET /user/:address/withdrawals`
**Function**: Get all withdrawal records for a user
- **Parameters**: `address` - User address
- **Query Parameters**: `limit` (default: 100), `offset` (default: 0)
- **Returns**: All withdrawal records for the user across all their wallets

#### `GET /withdrawals/type/:type`
**Function**: Get withdrawals by type
- **Parameters**: `type` - Withdrawal type (`unallocated`, `emergency`)
- **Query Parameters**: `limit` (default: 100), `offset` (default: 0)
- **Returns**: Withdrawals of the specified type

### Common Response Format

All endpoints return responses in this format:
```json
{
  "success": boolean,
  "data": any,
  "error": string | undefined
}
```

## CLI Commands

### Database Migration
```bash
pnpm run db:migrate
```

### Manual Sync
```bash
# Sync specific block range
pnpm run dev sync <fromBlock> <toBlock>

# Example: sync blocks 28000000 to 28100000
pnpm run dev sync 28000000 28100000
```

### Connection Test
```bash
pnpm run dev test
```

## Database Schema

### Core Tables

- `events` - All indexed blockchain events
- `indexer_status` - Tracks last processed block per contract
- `wallet_registry` - Registry of deployed wallets
- `buckets` - Budget wallet buckets
- `spending_records` - Spending transaction records
- `delegate_permissions` - Delegate permissions for buckets
- `token_transfers` - Token transfer records

### Indexes

Optimized indexes for:
- Contract address lookups
- Event name filtering
- Block number ranges
- User and wallet associations
- Timestamp-based queries

## Supported Events

The indexer tracks these contract events:
- **Factory**: `WalletCreated`, `WalletRegistered`
- **Wallet**: `BucketCreated`, `BucketUpdated`, `BucketFunded`, `SpentFromBucket`, `BucketTransfer`, `FundsDeposited`, `MonthlyLimitReset`, `DelegateAdded`, `DelegateRemoved`, `UnallocatedWithdraw`, `EmergencyWithdraw`
- **Token**: `Transfer`

## Development

### Project Structure

```
src/
├── api/                 # REST API endpoints
├── blockchain/          # Viem client & event listeners
├── config/             # Environment configuration
├── database/           # Database connection & models
├── services/           # Core indexer service
├── types/              # TypeScript type definitions
└── index.ts            # Main application entry
```

### Key Components

- **Viem Client**: Blockchain connection and event decoding
- **Event Listeners**: Parse and structure contract events
- **Database Models**: Functional CRUD operations
- **Indexer Service**: Continuous event processing loop
- **API Server**: Express.js REST API

### Environment Variables

Key configuration options:

```env
# Network
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453

# Contracts
FACTORY_CONTRACT_ADDRESS=0x82eA29c17EE7eE9176CEb37F728Ab1967C4993a5
BUDGET_WALLET_TEMPLATE_ADDRESS=0x4B80e374ff1639B748976a7bF519e2A35b43Ca26

# Start Blocks
FACTORY_START_BLOCK=24070000
BUDGET_WALLET_START_BLOCK=24070000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/indexer_db

# Indexer
BATCH_SIZE=1000
POLLING_INTERVAL=5000
PORT=8030
```

## Frontend Integration

Use the API endpoints in your frontend application:

```javascript
// Get wallets for a user
const wallets = await fetch('http://localhost:8030/api/wallets/user/0x123...').then(r => r.json());

// Get buckets for a wallet
const buckets = await fetch('http://localhost:8030/api/buckets/wallet/0x456...').then(r => r.json());

// Get spending records
const spending = await fetch('http://localhost:8030/api/spending/wallet/0x456...').then(r => r.json());

// Get transfers for a wallet
const transfers = await fetch('http://localhost:8030/api/transfers/wallet/0x456...').then(r => r.json());

// Get withdrawals for a user
const withdrawals = await fetch('http://localhost:8030/api/user/0x123.../withdrawals').then(r => r.json());
```

## Production Deployment

1. Set up PostgreSQL database
2. Configure production environment variables
3. Run database migrations
4. Start with process manager (PM2, systemd)
5. Set up reverse proxy (nginx)
6. Configure monitoring and logging

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License