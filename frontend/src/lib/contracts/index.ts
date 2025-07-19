// Export configs from separate file to avoid circular dependencies
export { CHAIN_IDS, NETWORK_CONFIGS, getNetworkConfig } from './config';

// Import configs for legacy exports
import { CHAIN_IDS, NETWORK_CONFIGS } from './config';

// Legacy exports for backwards compatibility
export const CONTRACT_ADDRESSES = {
  FACTORY: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS || NETWORK_CONFIGS[CHAIN_IDS.BASE_SEPOLIA].FACTORY_ADDRESS,
  BUDGET_WALLET_TEMPLATE: process.env.NEXT_PUBLIC_BUDGET_WALLET_ADDRESS || NETWORK_CONFIGS[CHAIN_IDS.BASE_SEPOLIA].BUDGET_WALLET_ADDRESS
} as const;

export const NETWORK_CONFIG = NETWORK_CONFIGS[CHAIN_IDS.BASE_SEPOLIA];

export const SUBGRAPH_CONFIG = {
  URL: process.env.NEXT_PUBLIC_SUBGRAPH_URL || NETWORK_CONFIGS[CHAIN_IDS.BASE_SEPOLIA].SUBGRAPH_URL
} as const;

// Contract utilities and configurations
export * from './factory';
export * from './budget-wallet';