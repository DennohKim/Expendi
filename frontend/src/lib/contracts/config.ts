// Chain IDs
export const CHAIN_IDS = {
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453
} as const;

// Network configurations
export const NETWORK_CONFIGS = {
  [CHAIN_IDS.BASE_SEPOLIA]: {
    CHAIN_ID: CHAIN_IDS.BASE_SEPOLIA,
    NETWORK_NAME: 'Base Sepolia',
    RPC_URL: 'https://sepolia.base.org',
    BLOCK_EXPLORER: 'https://sepolia.basescan.org',
    FACTORY_ADDRESS: '0xAf8fb11822deC6Df35e17255B1A6bbF268a6b4e4',
    BUDGET_WALLET_ADDRESS: '0x3300416DB028aE9eC43f32835aF652Fa87200874',
    SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/75392/expendiv-3/v0.0.2',
    USDC_ADDRESS: '0x5c6df8de742863d997083097e02a789f6b84bF38' // Mock USDC on testnet
  },
  [CHAIN_IDS.BASE_MAINNET]: {
    CHAIN_ID: CHAIN_IDS.BASE_MAINNET,
    NETWORK_NAME: 'Base Mainnet',
    RPC_URL: 'https://mainnet.base.org',
    BLOCK_EXPLORER: 'https://basescan.org',
    FACTORY_ADDRESS: '0x82eA29c17EE7eE9176CEb37F728Ab1967C4993a5',
    BUDGET_WALLET_ADDRESS: '0x4B80e374ff1639B748976a7bF519e2A35b43Ca26',
    SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/75392/expendiv-1-base-mainnet/v1.0.0',
    USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  }
} as const;

// Get current network config based on chain ID
export function getNetworkConfig(chainId: number) {
  return NETWORK_CONFIGS[chainId as keyof typeof NETWORK_CONFIGS] || NETWORK_CONFIGS[CHAIN_IDS.BASE_SEPOLIA];
}