// Chain ID - Celo Mainnet only
export const CHAIN_ID = 42220;

// Network configuration
export const NETWORK_CONFIG = {
  CHAIN_ID: CHAIN_ID,
  NETWORK_NAME: 'Celo Mainnet',
  RPC_URL: 'https://rpc.ankr.com/celo',
  BLOCK_EXPLORER: 'https://celoscan.io',
  FACTORY_ADDRESS: '0x06CB6b1B6DD6B16DF66f50a597ef7902c80F937f',
  BUDGET_WALLET_ADDRESS: '0x30C72e2b14eE982fE3587e366C9093845e84aa1f',
  SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/75392/expendi-celo/version/latest',
  CUSD_ADDRESS: '0x765DE816845861e75A25fCA122bb6898B8B1282a' // cUSD on Celo
} as const;

// Get current network config (always returns Celo Mainnet)
export function getNetworkConfig() {
  return NETWORK_CONFIG;
}