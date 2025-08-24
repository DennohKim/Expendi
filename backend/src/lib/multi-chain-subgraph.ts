import { createSubgraphService, SubgraphService } from './subgraph';
import { ChainConfig, getChainConfig, getAllSupportedChains } from '../types/chains';

// Initialize all chain services
export const initializeChainServices = (): Map<string, SubgraphService> => {
  const services = new Map<string, SubgraphService>();
  const supportedChains = getAllSupportedChains();
  
  for (const chain of supportedChains) {
    if (chain.subgraphUrl) {
      services.set(chain.shortName, createSubgraphService(chain.subgraphUrl));
      console.log(`📡 Initialized subgraph service for ${chain.name}: ${chain.subgraphUrl}`);
    } else {
      console.warn(`⚠️  No subgraph URL configured for ${chain.name}`);
    }
  }
  
  return services;
};

// Get a specific chain service
export const getChainService = (
  services: Map<string, SubgraphService>,
  chainName: string
): SubgraphService | null => {
  const service = services.get(chainName.toLowerCase());
  if (!service) {
    console.error(`❌ No subgraph service found for chain: ${chainName}`);
    return null;
  }
  return service;
};

// Check if chain is available
export const isChainAvailable = (service: SubgraphService) => async (): Promise<boolean> => {
  try {
    await service.getLatestBlockTimestamp();
    return true;
  } catch (error) {
    return false;
  }
};

// Get status of all chains
export const getChainStatus = (services: Map<string, SubgraphService>) => async (): Promise<
  Record<string, { available: boolean; lastBlock?: string; error?: string }>
> => {
  const status: Record<string, { available: boolean; lastBlock?: string; error?: string }> = {};

  const statusPromises = Array.from(services.entries()).map(async ([chainName, service]) => {
    try {
      const lastBlock = await service.getLatestBlockTimestamp();
      return [chainName, { available: true, lastBlock }] as const;
    } catch (error) {
      return [chainName, { 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }] as const;
    }
  });

  const results = await Promise.allSettled(statusPromises);
  
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const [chainName, chainStatus] = result.value;
      status[chainName] = chainStatus;
    }
  });

  return status;
};

// Cross-chain operations
export const getUserFromAllChains = (services: Map<string, SubgraphService>) => async (
  userId: string
): Promise<Map<string, any>> => {
  const results = new Map();
  
  const chainPromises = Array.from(services.entries()).map(async ([chainName, service]) => {
    try {
      const buckets = await service.getUserBuckets(userId);
      if (buckets.length > 0) {
        return [chainName, buckets] as const;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to get user data from ${chainName}:`, error);
      return null;
    }
  });

  const chainResults = await Promise.allSettled(chainPromises);
  
  chainResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      const [chainName, buckets] = result.value;
      results.set(chainName, buckets);
    }
  });
  
  return results;
};

// Utility functions
export const getSupportedChains = (services: Map<string, SubgraphService>): string[] => 
  Array.from(services.keys());

export const isValidChain = (services: Map<string, SubgraphService>) => (chainName: string): boolean =>
  services.has(chainName.toLowerCase());

export const getChainConfigForName = (chainName: string): ChainConfig | null =>
  getChainConfig(chainName);

export const getAllChainConfigs = (services: Map<string, SubgraphService>): ChainConfig[] =>
  getAllSupportedChains().filter(chain => services.has(chain.shortName));

// Create the multi-chain subgraph service
export const createMultiChainSubgraphService = () => {
  const services = initializeChainServices();
  
  return {
    services,
    getChainService: (chainName: string) => getChainService(services, chainName),
    getSupportedChains: () => getSupportedChains(services),
    isChainAvailable: (chainName: string) => {
      const service = getChainService(services, chainName);
      return service ? isChainAvailable(service)() : Promise.resolve(false);
    },
    getChainStatus: getChainStatus(services),
    getUserFromAllChains: getUserFromAllChains(services),
    isValidChain: isValidChain(services),
    getChainConfigForName,
    getAllChainConfigs: () => getAllChainConfigs(services),
    
    // Convenience methods for multi-chain operations
    getUsersFromChain: async (chainName: string, first?: number, skip?: number) => {
      const service = getChainService(services, chainName);
      if (!service) throw new Error(`Chain ${chainName} not supported`);
      return service.getUsers(first, skip);
    },
    
    getUserBucketsFromChain: async (chainName: string, userId: string) => {
      const service = getChainService(services, chainName);
      if (!service) throw new Error(`Chain ${chainName} not supported`);
      return service.getUserBuckets(userId);
    },
    
    getDepositsFromChain: async (
      chainName: string,
      first?: number,
      skip?: number,
      userId?: string,
      bucketId?: string,
      fromTimestamp?: string
    ) => {
      const service = getChainService(services, chainName);
      if (!service) throw new Error(`Chain ${chainName} not supported`);
      return service.getDeposits(first, skip, userId, bucketId, fromTimestamp);
    },
    
    getWithdrawalsFromChain: async (
      chainName: string,
      first?: number,
      skip?: number,
      userId?: string,
      bucketId?: string,
      fromTimestamp?: string
    ) => {
      const service = getChainService(services, chainName);
      if (!service) throw new Error(`Chain ${chainName} not supported`);
      return service.getWithdrawals(first, skip, userId, bucketId, fromTimestamp);
    },
    
    getBucketTransfersFromChain: async (
      chainName: string,
      first?: number,
      skip?: number,
      userId?: string,
      fromTimestamp?: string
    ) => {
      const service = getChainService(services, chainName);
      if (!service) throw new Error(`Chain ${chainName} not supported`);
      return service.getBucketTransfers(first, skip, userId, fromTimestamp);
    },
    
    getLatestBlockTimestampFromChain: async (chainName: string) => {
      const service = getChainService(services, chainName);
      if (!service) throw new Error(`Chain ${chainName} not supported`);
      return service.getLatestBlockTimestamp();
    }
  };
};

export type MultiChainSubgraphService = ReturnType<typeof createMultiChainSubgraphService>;