# Expendi Analytics Backend (Functional Programming Architecture)

A robust Node.js backend service built with **functional programming principles** that provides comprehensive financial behavior analytics for the Expendi DApp by analyzing subgraph data across multiple blockchain networks.

## 🏗️ Architecture Philosophy

This backend is designed using **pure functional programming** principles:
- **Pure functions** for all business logic
- **Higher-order functions** for composable operations  
- **Immutable data structures** throughout
- **Function composition** over class inheritance
- **Declarative** over imperative programming

## Features

### Bucket Usage Analytics
- **Most Used Bucket**: Count transactions per bucket from withdrawals and deposits
- **Highest Spending Bucket**: Sum withdrawal amounts per bucket  
- **Most Funded Bucket**: Sum deposit amounts per bucket
- **Bucket Activity Frequency**: Transaction count over time periods

### Calculated Insights
- **Budget Efficiency**: Actual spending vs monthly limits per bucket
- **Bucket Lifecycle**: Creation date to last activity tracking
- **Seasonal Usage**: Monthly spending patterns per bucket
- **Bucket Abandonment**: Buckets with funds but no recent activity

### Multi-Chain Support
- **Base**: Mainnet & Sepolia testnet
- **Celo**: Mainnet & Alfajores testnet  
- **Scroll**: Mainnet & Sepolia testnet
- **Cross-chain aggregation** and comparison analytics

## 📁 Functional Architecture

```
src/
├── lib/                          # Pure functional libraries
│   ├── subgraph.ts              # Subgraph query functions
│   ├── multi-chain-subgraph.ts  # Multi-chain orchestration
│   ├── sync.ts                  # Data synchronization functions  
│   └── analytics.ts             # Analytics calculation functions
├── routes/                      # HTTP route handlers (thin layer)
│   ├── functional-analytics.ts
│   └── functional-multi-chain-analytics.ts
├── types/                       # Type definitions
│   ├── chains.ts               # Chain configurations
│   └── subgraph.ts            # GraphQL response types
├── app.ts                      # Application composition
└── index.ts                    # Entry point
```

### Key Functional Patterns

**Higher-Order Functions**:
```typescript
// Create specialized functions from generic ones
const getUsers = (subgraphUrl: string) => async (first: number, skip: number) => { ... }
const syncChain = (prisma: PrismaClient, multiChainService: MultiChainSubgraphService) => 
  async (chainName: string) => { ... }
```

**Function Composition**:
```typescript
// Compose complex operations from simple functions  
const syncAllChains = (prisma, multiChainService) => async () => {
  const supportedChains = multiChainService.getSupportedChains();
  const syncChainFn = syncChain(prisma, multiChainService);
  await Promise.allSettled(supportedChains.map(syncChainFn));
};
```

**Service Creation Functions**:
```typescript
// Factory functions instead of classes
export const createSubgraphService = (subgraphUrl: string) => ({
  getUsers: getUsers(subgraphUrl),
  getUserBuckets: getUserBuckets(subgraphUrl),
  // ... other methods
});
```

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with functional middleware composition
- **Database**: PostgreSQL with Prisma ORM
- **Architecture**: Pure functional programming (no classes)
- **Containerization**: Docker with docker-compose

## 🚀 Quick Start

### 📋 Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- Node.js 18+ (optional, for local development)
- [pnpm](https://pnpm.io/installation) (if running locally)

### ⚡ Start in 30 seconds
```bash
# 1. Navigate to the analytics backend directory
cd analytics-backend

# 2. Copy environment file
cp .env.example .env

# 3. Start all services with Docker
docker compose up -d

# 4. Run database migrations
docker compose exec analytics-backend pnpm prisma migrate dev --name init

# 5. Test the API
curl http://localhost:3001/health
```

That's it! Your analytics backend is now running at `http://localhost:3001`

### 🔧 What's Running?
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache**: `localhost:6379` 
- **Analytics API**: `localhost:3001`

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (if running without Docker)

### Installation

1. **Navigate to analytics backend**:
```bash
cd analytics-backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Environment setup**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Database setup**:
```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push
```

### Development

**Option 1: Docker (Recommended)**
```bash
# Start all services (database, redis, and backend)
docker compose up -d

# View logs for all services
docker compose logs -f

# View logs for specific service
docker compose logs -f analytics-backend
docker compose logs -f postgres
docker compose logs -f redis

# Check container status
docker compose ps

# Stop all services
docker compose down

# Rebuild and restart (after code changes)
docker compose up -d --build

# Stop and remove containers with volumes (fresh start)
docker compose down -v
```

**Option 2: Local Development**
```bash
# Start database and redis only
docker compose up postgres redis -d

# Run migrations (required for first setup)
pnpm prisma migrate dev --name init

# Generate Prisma client
pnpm prisma generate

# Start backend in development mode
pnpm run dev
```

## 🐳 Docker Commands Reference

### Container Management
```bash
# Start all services
docker compose up -d

# Start specific services
docker compose up -d postgres redis
docker compose up -d analytics-backend

# Stop all services
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v --remove-orphans

# Rebuild containers after code changes
docker compose build
docker compose up -d --build

# Pull latest images
docker compose pull
```

### Monitoring & Debugging
```bash
# Check service status and health
docker compose ps

# View logs (real-time)
docker compose logs -f
docker compose logs -f analytics-backend

# View logs (last 100 lines)
docker compose logs --tail=100 analytics-backend

# Execute commands inside containers
docker compose exec postgres psql -U postgres -d expendi_analytics
docker compose exec analytics-backend sh
docker compose exec redis redis-cli

# Check container resource usage
docker stats
```

### Database Management
```bash
# Run Prisma migrations (inside container or locally)
docker compose exec analytics-backend pnpm prisma migrate dev
# OR locally if you have pnpm installed:
pnpm prisma migrate dev

# Reset database (WARNING: destroys all data)
docker compose exec analytics-backend pnpm prisma migrate reset

# Generate Prisma client
docker compose exec analytics-backend pnpm prisma generate

# View database schema
docker compose exec analytics-backend pnpm prisma db pull

# Seed database (if seed script exists)
docker compose exec analytics-backend pnpm prisma db seed

# Access PostgreSQL directly
docker compose exec postgres psql -U postgres -d expendi_analytics

# Create database backup
docker compose exec postgres pg_dump -U postgres expendi_analytics > backup.sql

# Restore from backup
docker compose exec -T postgres psql -U postgres -d expendi_analytics < backup.sql
```

### Health Checks & Testing
```bash
# Test API health endpoint
curl http://localhost:3001/health

# Test database connectivity
docker compose exec postgres pg_isready -U postgres

# Test Redis connectivity
docker compose exec redis redis-cli ping

# Run application tests (if available)
docker compose exec analytics-backend pnpm test
```

### Environment & Configuration
```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env  # or your preferred editor

# Restart services after config changes
docker compose down
docker compose up -d

# View current environment variables
docker compose exec analytics-backend env | grep -E "(DATABASE|NODE|PORT)"
```

### Production Commands
```bash
# Start in production mode
NODE_ENV=production docker compose up -d

# Check production health
docker compose exec analytics-backend node -e "console.log(process.env.NODE_ENV)"

# View production logs
docker compose logs -f --tail=1000 analytics-backend
```

### Troubleshooting Commands
```bash
# Remove all stopped containers and networks
docker system prune

# Remove all unused images
docker image prune -a

# Free up space (remove everything not currently used)
docker system prune -a --volumes

# Inspect container configuration
docker compose config

# Debug container startup issues
docker compose up analytics-backend  # (without -d to see output)

# Check disk usage
docker system df
```

## API Endpoints

### Health & Status
```
GET /health          # Health check
GET /ready           # Readiness check
```

### Multi-Chain Analytics (v2 API) - Functional
```
GET /api/v2/analytics/chains                                    # Get supported chains
GET /api/v2/analytics/chains/{chainName}/users/{userId}/insights
GET /api/v2/analytics/chains/{chainName}/users/{userId}/bucket-usage
GET /api/v2/analytics/chains/{chainName}/users/{userId}/most-used-bucket
GET /api/v2/analytics/chains/{chainName}/users/{userId}/highest-spending-bucket
GET /api/v2/analytics/chains/{chainName}/users/{userId}/bucket-activity
GET /api/v2/analytics/users/{userId}/cross-chain-insights       # Aggregated across all chains
GET /api/v2/analytics/users/{userId}/cross-chain-buckets        # Cross-chain bucket comparison
```

### Single-Chain Analytics (v1 API) - Functional
```
GET /api/analytics/users/{userId}/insights
GET /api/analytics/users/{userId}/bucket-usage
GET /api/analytics/users/{userId}/most-used-bucket
GET /api/analytics/users/{userId}/highest-spending-bucket
GET /api/analytics/users/{userId}/bucket-activity
GET /api/analytics/users/{userId}/budget-efficiency
GET /api/analytics/users/{userId}/seasonal-patterns
GET /api/analytics/users/{userId}/abandoned-buckets
```

### Development Utilities (Development Mode Only)
```
# Multi-chain functional sync endpoints
POST /api/v2/sync/all-chains                    # Sync all supported chains
POST /api/v2/sync/chain/{chainName}             # Sync specific chain
POST /api/v2/sync/user/{walletAddress}          # Sync user across all chains
GET /api/v2/chains/status                       # Check status of all chains

# Legacy sync endpoints
POST /api/sync/full                             # Manual full sync (single chain)
POST /api/analytics/calculate/{userId}          # Calculate analytics for specific user
```

## Environment Variables

Create a `.env` file with these required variables:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/expendi_analytics"

# Server
PORT=3001
NODE_ENV=development

# Base Network Subgraphs - Replace [query-id] with your actual The Graph Studio query ID
SUBGRAPH_URL_BASE_SEPOLIA="https://api.studio.thegraph.com/query/[query-id]/expendiv-1-base-sepolia/version/latest"
SUBGRAPH_URL_BASE_MAINNET="https://api.studio.thegraph.com/query/[query-id]/expendiv-1-base-mainnet/version/latest"

# Celo Network Subgraphs
SUBGRAPH_URL_CELO_MAINNET="https://api.studio.thegraph.com/query/[query-id]/expendiv-1-celo-mainnet/version/latest"
SUBGRAPH_URL_CELO_ALFAJORES="https://api.studio.thegraph.com/query/[query-id]/expendiv-1-celo-alfajores/version/latest"

# Scroll Network Subgraphs
SUBGRAPH_URL_SCROLL_MAINNET="https://api.studio.thegraph.com/query/[query-id]/expendiv-1-scroll-mainnet/version/latest"
SUBGRAPH_URL_SCROLL_SEPOLIA="https://api.studio.thegraph.com/query/[query-id]/expendiv-1-scroll-sepolia/version/latest"

# Celo Contract Addresses (update when deployed)
CELO_BUDGET_WALLET_ADDRESS=""
CELO_FACTORY_ADDRESS=""
CELO_START_BLOCK="0"
CELO_ALFAJORES_BUDGET_WALLET_ADDRESS=""
CELO_ALFAJORES_FACTORY_ADDRESS=""
CELO_ALFAJORES_START_BLOCK="0"

# Scroll Contract Addresses (update when deployed)
SCROLL_BUDGET_WALLET_ADDRESS=""
SCROLL_FACTORY_ADDRESS=""
SCROLL_START_BLOCK="0"
SCROLL_SEPOLIA_BUDGET_WALLET_ADDRESS=""
SCROLL_SEPOLIA_FACTORY_ADDRESS=""
SCROLL_SEPOLIA_START_BLOCK="0"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Scheduled Jobs
SYNC_INTERVAL="*/5 * * * *"  # Every 5 minutes
ANALYTICS_INTERVAL="0 0 * * *"  # Daily at midnight
```

## Example Usage

**Get Chain-Specific User Insights**:
```bash
curl http://localhost:3001/api/v2/analytics/chains/base/users/0x742d35cc...945DD66D/insights
```

**Get Cross-Chain User Insights**:
```bash
curl http://localhost:3001/api/v2/analytics/users/0x742d35cc...945DD66D/cross-chain-insights
```

**Sync Specific User Across All Chains**:
```bash
curl -X POST http://localhost:3001/api/v2/sync/user/0x742d35cc...945DD66D
```

## Functional Programming Benefits

### ✅ Advantages in This Architecture

- **Testability**: Pure functions are easy to unit test
- **Composability**: Small functions combine into complex operations
- **Reusability**: Generic functions work across different chains
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy to add new chains or analytics
- **Debugging**: Predictable data flow without side effects

### 📊 Example: Multi-Chain Sync

```typescript
// Functional composition for multi-chain operations
const syncAllChains = (prisma, multiChainService) => async () => {
  const supportedChains = multiChainService.getSupportedChains();
  const syncChainFn = syncChain(prisma, multiChainService);  // Partial application
  await Promise.allSettled(supportedChains.map(syncChainFn)); // Map over function
};

// Usage - Clean and predictable
await syncAllChains(prisma, multiChainService)();
```

### 🔗 Function Composition Pattern

```typescript
// Build complex analytics from simple functions
const getUserInsights = pipe(
  getUserFromDatabase,
  calculateBucketStats,
  findMostUsedBucket,
  calculateBudgetAdherence,
  findAbandonedBuckets,
  formatInsightsResponse
);
```

## Data Flow

All data flows through **pure functions** with no side effects:

```
Subgraph → Query Functions → Transform Functions → Store Functions → API Response Functions
```

Each step is a pure function that can be tested and reasoned about independently.

## Deployment

### Docker Production Deployment
```bash
# Build and start production containers
docker-compose -f docker-compose.yml up -d

# Check container health
docker-compose ps

 Development Commands Used:

  # Start dev containers
  docker compose -f docker-compose.dev.yml --env-file .env.dev up -d

  # Run migration in dev
  docker exec expendi-analytics-backend-dev npx prisma migrate dev

  # Check dev database tables
  docker exec expendi-analytics-db-dev psql -U postgres -d expendi_analytics_dev -c "\dt"

  # Check data counts in dev
  docker exec expendi-analytics-db-dev psql -U postgres -d expendi_analytics_dev -c "SELECT COUNT(*) FROM 
  users;"

  Production Commands (equivalent):

  # Start prod containers
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

  # Run migration in prod
  docker exec expendi-analytics-backend-prod npx prisma migrate deploy

  # Check prod database tables
  docker exec expendi-analytics-db-prod psql -U postgres -d expendi_analytics_prod -c "\dt"

  # Check data counts in prod
  docker exec expendi-analytics-db-prod psql -U postgres -d expendi_analytics_prod -c "SELECT COUNT(*) FROM
   users;"

  # Sync data to prod (from host machine)
  npm run sync:base  # or sync:all
```

## Contributing

When adding new features:

1. **Write pure functions** in the `lib/` directory
2. **Compose functions** rather than creating classes
3. **Use higher-order functions** for reusable patterns
4. **Keep side effects** in the outermost layer (routes/app)
5. **Test individual functions** easily due to purity

## License

MIT License - see LICENSE file for details.