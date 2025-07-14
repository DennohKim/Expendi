import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from '../config/env';

// Initialize client
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});

// Client utility functions
export const getCurrentBlock = async (): Promise<bigint> => {
  const block = await publicClient.getBlockNumber();
  return block;
};

export const getBlock = async (blockNumber: bigint) => {
  return publicClient.getBlock({ 
    blockNumber, 
    includeTransactions: false 
  });
};

export const getTransaction = async (hash: `0x${string}`) => {
  return publicClient.getTransaction({ hash });
};

export const getTransactionReceipt = async (hash: `0x${string}`) => {
  return publicClient.getTransactionReceipt({ hash });
};

export const isContractAddress = async (address: `0x${string}`): Promise<boolean> => {
  try {
    const code = await publicClient.getBytecode({ address });
    return code !== undefined && code !== '0x';
  } catch {
    return false;
  }
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const blockNumber = await getCurrentBlock();
    console.log('Blockchain connection successful. Current block:', blockNumber);
    return true;
  } catch (error) {
    console.error('Blockchain connection failed:', error);
    return false;
  }
};