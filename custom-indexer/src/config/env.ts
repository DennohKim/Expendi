import dotenv from 'dotenv';

// Load .env.local first, then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // This will only load variables not already set

export const config = {
  // Blockchain Configuration
  rpcUrl: process.env.RPC_URL || 'https://mainnet.base.org',
  chainId: parseInt(process.env.CHAIN_ID || '8453'),

  // Contract Addresses (Base Mainnet - August 2025)
  contracts: {
    factory: process.env.FACTORY_CONTRACT_ADDRESS || '0x82eA29c17EE7eE9176CEb37F728Ab1967C4993a5',
    budgetWalletTemplate: process.env.BUDGET_WALLET_TEMPLATE_ADDRESS || '0x4B80e374ff1639B748976a7bF519e2A35b43Ca26',
    mockUSDC: process.env.MOCK_USDC_ADDRESS || '',
  },

  // Starting Blocks (Base Mainnet)
  startBlocks: {
    factory: parseInt(process.env.FACTORY_START_BLOCK || '24070000'),
    mockUSDC: parseInt(process.env.MOCK_USDC_START_BLOCK || '24070000'),
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'indexer_db',
    user: process.env.DB_USER || 'username',
    password: process.env.DB_PASSWORD || 'password',
  },

  // Application Configuration
  app: {
    port: parseInt(process.env.PORT || '8030'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Indexer Configuration
  indexer: {
    batchSize: parseInt(process.env.BATCH_SIZE || '1000'),
    pollingInterval: parseInt(process.env.POLLING_INTERVAL || '5000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  },
};