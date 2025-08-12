export enum ChainId {
  BASE_MAINNET = 8453,
  BASE_SEPOLIA = 84532,
  CELO_MAINNET = 42220,
  CELO_ALFAJORES = 44787,
  SCROLL_MAINNET = 534352,
  SCROLL_SEPOLIA = 534351
}

export interface ChainConfig {
  chainId: ChainId;
  name: string;
  shortName: string;
  isMainnet: boolean;
  subgraphUrl: string;
  contracts: {
    simpleBudgetWallet: string;
    factory: string;
    startBlock: number;
  };
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    symbol: string;
    name: string;
    decimals: number;
  };
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  'base': {
    chainId: ChainId.BASE_MAINNET,
    name: 'Base Mainnet',
    shortName: 'base',
    isMainnet: true,
    subgraphUrl: process.env.SUBGRAPH_URL_BASE_MAINNET || '',
    contracts: {
      simpleBudgetWallet: '0x4B80e374ff1639B748976a7bF519e2A35b43Ca26',
      factory: '0x82eA29c17EE7eE9176CEb37F728Ab1967C4993a5',
      startBlock: 24070000
    },
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    }
  },
  'base-sepolia': {
    chainId: ChainId.BASE_SEPOLIA,
    name: 'Base Sepolia Testnet',
    shortName: 'base-sepolia',
    isMainnet: false,
    subgraphUrl: process.env.SUBGRAPH_URL_BASE_SEPOLIA || '',
    contracts: {
      simpleBudgetWallet: '0x3300416DB028aE9eC43f32835aF652Fa87200874',
      factory: '0xAf8fb11822deC6Df35e17255B1A6bbF268a6b4e4',
      startBlock: 28388281
    },
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia-explorer.base.org',
    nativeCurrency: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    }
  },
  'celo': {
    chainId: ChainId.CELO_MAINNET,
    name: 'Celo Mainnet',
    shortName: 'celo',
    isMainnet: true,
    subgraphUrl: process.env.SUBGRAPH_URL_CELO_MAINNET || '',
    contracts: {
      simpleBudgetWallet: process.env.CELO_BUDGET_WALLET_ADDRESS || '',
      factory: process.env.CELO_FACTORY_ADDRESS || '',
      startBlock: parseInt(process.env.CELO_START_BLOCK || '0')
    },
    rpcUrl: 'https://forno.celo.org',
    blockExplorer: 'https://explorer.celo.org',
    nativeCurrency: {
      symbol: 'CELO',
      name: 'Celo',
      decimals: 18
    }
  },
  'celo-alfajores': {
    chainId: ChainId.CELO_ALFAJORES,
    name: 'Celo Alfajores Testnet',
    shortName: 'celo-alfajores',
    isMainnet: false,
    subgraphUrl: process.env.SUBGRAPH_URL_CELO_ALFAJORES || '',
    contracts: {
      simpleBudgetWallet: process.env.CELO_ALFAJORES_BUDGET_WALLET_ADDRESS || '',
      factory: process.env.CELO_ALFAJORES_FACTORY_ADDRESS || '',
      startBlock: parseInt(process.env.CELO_ALFAJORES_START_BLOCK || '0')
    },
    rpcUrl: 'https://alfajores-forno.celo-testnet.org',
    blockExplorer: 'https://alfajores-blockscout.celo-testnet.org',
    nativeCurrency: {
      symbol: 'CELO',
      name: 'Celo',
      decimals: 18
    }
  },
  'scroll': {
    chainId: ChainId.SCROLL_MAINNET,
    name: 'Scroll Mainnet',
    shortName: 'scroll',
    isMainnet: true,
    subgraphUrl: process.env.SUBGRAPH_URL_SCROLL_MAINNET || '',
    contracts: {
      simpleBudgetWallet: process.env.SCROLL_BUDGET_WALLET_ADDRESS || '',
      factory: process.env.SCROLL_FACTORY_ADDRESS || '',
      startBlock: parseInt(process.env.SCROLL_START_BLOCK || '0')
    },
    rpcUrl: 'https://rpc.scroll.io',
    blockExplorer: 'https://scrollscan.com',
    nativeCurrency: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    }
  },
  'scroll-sepolia': {
    chainId: ChainId.SCROLL_SEPOLIA,
    name: 'Scroll Sepolia Testnet',
    shortName: 'scroll-sepolia',
    isMainnet: false,
    subgraphUrl: process.env.SUBGRAPH_URL_SCROLL_SEPOLIA || '',
    contracts: {
      simpleBudgetWallet: process.env.SCROLL_SEPOLIA_BUDGET_WALLET_ADDRESS || '',
      factory: process.env.SCROLL_SEPOLIA_FACTORY_ADDRESS || '',
      startBlock: parseInt(process.env.SCROLL_SEPOLIA_START_BLOCK || '0')
    },
    rpcUrl: 'https://sepolia-rpc.scroll.io',
    blockExplorer: 'https://sepolia-blockscout.scroll.io',
    nativeCurrency: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    }
  }
};

export function getChainConfig(chainName: string): ChainConfig | null {
  return SUPPORTED_CHAINS[chainName.toLowerCase()] || null;
}

export function getAllSupportedChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS);
}

export function getMainnetChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS).filter(chain => chain.isMainnet);
}

export function getTestnetChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS).filter(chain => !chain.isMainnet);
}

export function isValidChain(chainName: string): boolean {
  return chainName.toLowerCase() in SUPPORTED_CHAINS;
}