import dotenv from 'dotenv';

// Load .env.local first, then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // This will only load variables not already set

export const config = {
  // Blockchain Configuration
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  chainId: parseInt(process.env.CHAIN_ID || '84532'),

  // Contract Addresses (Updated July 15, 2025)
  contracts: {
    factory: process.env.FACTORY_CONTRACT_ADDRESS || '0xAf8fb11822deC6Df35e17255B1A6bbF268a6b4e4',
    budgetWalletTemplate: process.env.BUDGET_WALLET_TEMPLATE_ADDRESS || '0x3300416DB028aE9eC43f32835aF652Fa87200874',
    mockUSDC: process.env.MOCK_USDC_ADDRESS || '0x5c6df8de742863d997083097e02a789f6b84bf38',
  },

  // Starting Blocks (Updated for new deployment)
  startBlocks: {
    factory: parseInt(process.env.FACTORY_START_BLOCK || '28388281'),
    mockUSDC: parseInt(process.env.MOCK_USDC_START_BLOCK || '28289876'),
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
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Indexer Configuration
  indexer: {
    batchSize: parseInt(process.env.BATCH_SIZE || '1000'),
    pollingInterval: parseInt(process.env.POLLING_INTERVAL || '5000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  },
};