// Export configs from separate file to avoid circular dependencies
export { CHAIN_ID, NETWORK_CONFIG, getNetworkConfig } from './config';

// Legacy exports for backwards compatibility
export const CONTRACT_ADDRESSES = {
  FACTORY: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS || NETWORK_CONFIG.FACTORY_ADDRESS,
  BUDGET_WALLET_TEMPLATE: process.env.NEXT_PUBLIC_BUDGET_WALLET_ADDRESS || NETWORK_CONFIG.BUDGET_WALLET_ADDRESS
} as const;

export const SUBGRAPH_CONFIG = {
  URL: process.env.NEXT_PUBLIC_SUBGRAPH_URL || NETWORK_CONFIG.SUBGRAPH_URL
} as const;

// Contract utilities and configurations
export * from './factory';
export * from './budget-wallet';