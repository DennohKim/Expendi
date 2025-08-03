// Export configs from separate file to avoid circular dependencies
export { CHAIN_ID, NETWORK_CONFIG, getNetworkConfig } from './config';
import { getNetworkConfig } from './config';

// Legacy exports for backwards compatibility
const networkConfig = getNetworkConfig();
export const CONTRACT_ADDRESSES = {
  FACTORY: networkConfig.FACTORY_ADDRESS,
  BUDGET_WALLET_TEMPLATE: networkConfig.BUDGET_WALLET_ADDRESS
} as const;

export const SUBGRAPH_CONFIG = {
  URL: networkConfig.SUBGRAPH_URL
} as const;

// Contract utilities and configurations
export * from './factory';
export * from './budget-wallet';