# Custom Smart Contract Indexer

A custom indexer built with Viem to capture and index smart contract events from your budget wallet system on Base Sepolia.

## Features

- **Real-time Event Indexing**: Continuously monitors and indexes smart contract events
- **Database Storage**: PostgreSQL database with optimized schema for event storage
- **REST API**: Query indexed data through REST endpoints
- **Smart Account Support**: Handles dynamic wallet deployment through factory pattern
- **Batch Processing**: Efficient batch processing of blockchain events
- **Graceful Shutdown**: Proper cleanup and shutdown procedures

## Architecture

### Contracts Indexed

1. **SimpleBudgetWalletFactory** (`0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a`)
   - `WalletCreated` events

2. **Dynamic Budget Wallets** (deployed through factory)
   - `BucketCreated` events
   - `Spending` events  
   - `BucketLimitUpdated` events
   - `DelegatePermissionChanged` events

3. **MockUSDC** (`0x5c6df8de742863d997083097e02a789f6b84bf38`)
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
- Connect to Base Sepolia network
- Start indexing from configured start blocks
- Serve API endpoints on port 3000

## API Endpoints

### Health & Status
- `GET /api/health` - Health check
- `GET /api/status` - Indexer status
- `GET /api/status/contract/:address` - Contract-specific status

### Events
- `GET /api/events` - Get all events with filtering
- `GET /api/events/contract/:address` - Get events by contract
- `GET /api/factory/events` - Get factory wallet creation events
- `GET /api/tokens/transfers` - Get token transfer events

### Wallets & Buckets
- `GET /api/wallets/user/:address` - Get wallets by user
- `GET /api/buckets/wallet/:address` - Get buckets by wallet
- `GET /api/wallet/:address/buckets/events` - Get bucket events
- `GET /api/wallet/:address/spending/events` - Get spending events
- `GET /api/spending/wallet/:address` - Get spending records

### Query Parameters

Most endpoints support filtering:
- `contractAddress` - Filter by contract address
- `eventName` - Filter by event name
- `blockNumber` - Filter by specific block
- `startBlock` / `endBlock` - Filter by block range
- `user` - Filter by user address
- `wallet` - Filter by wallet address
- `bucketId` - Filter by bucket ID
- `page` / `limit` - Pagination

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
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# Contracts
FACTORY_CONTRACT_ADDRESS=0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a
BUDGET_WALLET_TEMPLATE_ADDRESS=0xA2f565Db75B32Dac366666621633b2259bF332D6
MOCK_USDC_ADDRESS=0x5c6df8de742863d997083097e02a789f6b84bf38

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/indexer_db

# Indexer
BATCH_SIZE=1000
POLLING_INTERVAL=5000
```

## Frontend Integration

Use the API endpoints in your frontend application:

```javascript
// Get wallets for a user
const wallets = await fetch('/api/wallets/user/0x123...').then(r => r.json());

// Get buckets for a wallet
const buckets = await fetch('/api/buckets/wallet/0x456...').then(r => r.json());

// Get spending records
const spending = await fetch('/api/spending/wallet/0x456...').then(r => r.json());
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