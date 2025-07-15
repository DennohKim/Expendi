// Contract utilities and configurations
export * from './factory';
export * from './budget-wallet';

// Contract addresses (can be overridden by environment variables)
export const CONTRACT_ADDRESSES = {
  FACTORY: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS || '0xAf8fb11822deC6Df35e17255B1A6bbF268a6b4e4',
  BUDGET_WALLET_TEMPLATE: process.env.NEXT_PUBLIC_BUDGET_WALLET_ADDRESS || '0x3300416DB028aE9eC43f32835aF652Fa87200874'
} as const;

// Network configuration
export const NETWORK_CONFIG = {
  CHAIN_ID: 84532, // Base Sepolia
  NETWORK_NAME: 'Base Sepolia',
  RPC_URL: 'https://sepolia.base.org',
  BLOCK_EXPLORER: 'https://sepolia.basescan.org'
} as const;

// Subgraph configuration
export const SUBGRAPH_CONFIG = {
  URL: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/75392/expendiv-2/v1.0.0'
} as const;