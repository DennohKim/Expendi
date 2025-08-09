// Chain ID - Base Mainnet only
export const CHAIN_ID = 8453;

// Network configuration
export const NETWORK_CONFIG = {
  CHAIN_ID: CHAIN_ID,
  NETWORK_NAME: 'Base Mainnet',
  RPC_URL: 'https://mainnet.base.org',
  BLOCK_EXPLORER: 'https://basescan.org',
  FACTORY_ADDRESS: '0x82eA29c17EE7eE9176CEb37F728Ab1967C4993a5',
  BUDGET_WALLET_ADDRESS: '0x4B80e374ff1639B748976a7bF519e2A35b43Ca26',
  SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/118246/expendi-base/v1.0.0',
  USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
} as const;

// Get current network config (always returns Base Mainnet)
export function getNetworkConfig() {
  return NETWORK_CONFIG;
}