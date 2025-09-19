// Supported Chain IDs
export const CHAIN_IDS = {
  BASE_MAINNET: 8453,
  SCROLL_MAINNET: 534352,
  CELO_MAINNET: 42220,
  BASE_SEPOLIA: 84532
} as const;

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];

// Network configurations
export const NETWORK_CONFIGS = {
  [CHAIN_IDS.BASE_MAINNET]: {
    CHAIN_ID: CHAIN_IDS.BASE_MAINNET,
    NETWORK_NAME: 'Base Mainnet',
    RPC_URL: 'https://mainnet.base.org',
    BLOCK_EXPLORER: 'https://basescan.org',
    FACTORY_ADDRESS: '0x82eA29c17EE7eE9176CEb37F728Ab1967C4993a5',
    BUDGET_WALLET_ADDRESS: '0x4B80e374ff1639B748976a7bF519e2A35b43Ca26',
    SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/118246/expendi-base/version/latest',
    USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    NATIVE_TOKEN: 'ETH'
  },
  [CHAIN_IDS.SCROLL_MAINNET]: {
    CHAIN_ID: CHAIN_IDS.SCROLL_MAINNET,
    NETWORK_NAME: 'Scroll Mainnet',
    RPC_URL: 'https://rpc.scroll.io',
    BLOCK_EXPLORER: 'https://scrollscan.com',
    FACTORY_ADDRESS: '0x06cb6b1b6dd6b16df66f50a597ef7902c80f937f',
    BUDGET_WALLET_ADDRESS: '0x30c72e2b14ee982fe3587e366c9093845e84aa1f',
    SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/118246/expendi-scroll/v0.1.0',
    USDC_ADDRESS: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
    NATIVE_TOKEN: 'ETH'
  },
  [CHAIN_IDS.CELO_MAINNET]: {
    CHAIN_ID: CHAIN_IDS.CELO_MAINNET,
    NETWORK_NAME: 'Celo Mainnet',
    RPC_URL: 'https://forno.celo.org',
    BLOCK_EXPLORER: 'https://celoscan.io',
    FACTORY_ADDRESS: '0x0726E7052DAadD09548aBA2D5e72AD12BE8E787e',
    BUDGET_WALLET_ADDRESS: '0xCdFfB2611428DC4A3EE628abC26EcFB65Dcc0FFF',
    SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/118246/expendi-celo/v0.1.0',
    USDC_ADDRESS: '0x765DE816845861e75A25fCA122bb6898B8B1282a', // cUSD
    NATIVE_TOKEN: 'CELO'
  },
  [CHAIN_IDS.BASE_SEPOLIA]: {
    CHAIN_ID: CHAIN_IDS.BASE_SEPOLIA,
    NETWORK_NAME: 'Base Sepolia',
    RPC_URL: 'https://sepolia.base.org',
    BLOCK_EXPLORER: 'https://sepolia.basescan.org',
    FACTORY_ADDRESS: '0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a',
    BUDGET_WALLET_ADDRESS: '0xA2f565Db75B32Dac366666621633b2259bF332D6',
    SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/118246/expendi-base-sepolia/version/latest',
    USDC_ADDRESS: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    NATIVE_TOKEN: 'ETH'
  }
} as const;

// Default chain (Scroll Mainnet)
export const DEFAULT_CHAIN_ID = CHAIN_IDS.SCROLL_MAINNET;

// Legacy export for backward compatibility
export const CHAIN_ID = DEFAULT_CHAIN_ID;
export const NETWORK_CONFIG = NETWORK_CONFIGS[DEFAULT_CHAIN_ID];

// Get network config by chain ID
export function getNetworkConfig(chainId?: ChainId) {
  const targetChainId = chainId || DEFAULT_CHAIN_ID;
  return NETWORK_CONFIGS[targetChainId] || NETWORK_CONFIG;
}

// Get all supported networks
export function getSupportedNetworks() {
  return Object.values(NETWORK_CONFIGS);
}

// Check if chain is supported
export function isSupportedChain(chainId: number): chainId is ChainId {
  return Object.values(CHAIN_IDS).includes(chainId as ChainId);
}

// Get network name by chain ID
export function getNetworkName(chainId: ChainId) {
  return NETWORK_CONFIGS[chainId]?.NETWORK_NAME || 'Unknown Network';
}