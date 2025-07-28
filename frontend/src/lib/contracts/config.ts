// Chain ID - Celo Mainnet only
export const CHAIN_ID = 42220;

// Network configuration
export const NETWORK_CONFIG = {
  CHAIN_ID: CHAIN_ID,
  NETWORK_NAME: 'Celo Mainnet',
  RPC_URL: 'https://rpc.ankr.com/celo',
  BLOCK_EXPLORER: 'https://celoscan.io',
  FACTORY_ADDRESS: '0x82eA29c17EE7eE9176CEb37F728Ab1967C4993a5',
  BUDGET_WALLET_ADDRESS: '0x4B80e374ff1639B748976a7bF519e2A35b43Ca26',
  SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/75392/expendi-celo/v0.0.1',
  CUSD_ADDRESS: '0x765DE816845861e75A25fCA122bb6898B8B1282a' // cUSD on Celo
} as const;

// Get current network config (always returns Celo Mainnet)
export function getNetworkConfig() {
  return NETWORK_CONFIG;
}