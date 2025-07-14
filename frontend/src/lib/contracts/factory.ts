// Factory contract interaction utilities using wagmi with Privy
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import FactoryABI from './SimpleBudgetWalletFactory.json';
import type { SmartAccountClient } from 'permissionless';
import type { Abi } from 'viem';

interface WriteContractArgs {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: unknown[];
  value?: bigint;
}

// Factory contract details
export const FACTORY_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS as `0x${string}`) || ('0xeD21D5C3f8E7Cad297BB528C2d5Bda5d69BA305a' as const);

// Factory contract ABI (complete from compiled contract)
export const FACTORY_ABI = FactoryABI.abi as Abi;

// Create clients for Base Sepolia
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

// Contract configuration for wagmi
export const FACTORY_CONTRACT_CONFIG = {
  address: FACTORY_CONTRACT_ADDRESS,
  abi: FACTORY_ABI,
  functionName: 'createWallet',
} as const;

// No creation fee needed anymore
// Keeping this function for backward compatibility, but it returns 0
export function getCreationFee(): bigint {
  return BigInt(0);
}

// Create or get budget wallet for user using their connected wallet address
export async function createOrGetBudgetWallet(
  writeContractAsync: (args: WriteContractArgs) => Promise<`0x${string}`>,
  connectedWalletAddress: `0x${string}`,
  smartAccountClient?: SmartAccountClient // Optional smart account client for gas sponsorship
): Promise<{
  txHash?: `0x${string}`;
  budgetWalletAddress: `0x${string}`;
  alreadyExists: boolean;
}> {
  try {
    console.log('Creating/getting budget wallet for connected wallet:', connectedWalletAddress);
    
    // Always check EOA first, then smart account if we're using one
    console.log('Checking if EOA already has a budget wallet...');
    const eoaHasWallet = await publicClient.readContract({
      address: FACTORY_CONTRACT_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'hasWallet',
      args: [connectedWalletAddress]
    }) as boolean;
    
    if (eoaHasWallet) {
      console.log('EOA already has a budget wallet - returning existing wallet');
      const budgetWalletAddress = await publicClient.readContract({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getUserWallet',
        args: [connectedWalletAddress]
      }) as `0x${string}`;
      
      console.log('Existing EOA budget wallet address:', budgetWalletAddress);
      return {
        budgetWalletAddress,
        alreadyExists: true
      };
    }
    
    // If using smart account, check if smart account has a wallet
    if (smartAccountClient?.account?.address) {
      console.log('Checking if smart account already has a budget wallet...');
      const smartAccountHasWallet = await publicClient.readContract({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'hasWallet',
        args: [smartAccountClient.account.address]
      }) as boolean;
      
      if (smartAccountHasWallet) {
        console.log('Smart account already has a budget wallet');
        const budgetWalletAddress = await publicClient.readContract({
          address: FACTORY_CONTRACT_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'getUserWallet',
          args: [smartAccountClient.account.address]
        }) as `0x${string}`;
        
        console.log('Existing smart account budget wallet address:', budgetWalletAddress);
        return {
          budgetWalletAddress,
          alreadyExists: true
        };
      }
    }
    
    console.log('✅ No existing budget wallet found for either EOA or smart account, creating new one...');
    if (smartAccountClient) {
      console.log('Will create wallet using smart account:', smartAccountClient.account?.address);
    } else {
      console.log('Will create wallet using EOA:', connectedWalletAddress);
    }
    
    let txHash: `0x${string}`;
    
    // Use smart account client for gas sponsorship if available
    if (smartAccountClient) {
      console.log('🚀 Factory: Using smart account client for sponsored transaction');
      console.log('Smart account details:', {
        address: smartAccountClient.account?.address,
        chain: smartAccountClient.chain?.name,
        hasPaymaster: !!smartAccountClient.paymaster
      });
      
      if (!smartAccountClient.account) {
        throw new Error('Smart account not properly initialized');
      }
      
      txHash = await smartAccountClient.writeContract({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createWallet',
        args: [smartAccountClient.account.address], // Pass smart account address as user parameter
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });
      
      console.log('✅ Sponsored transaction successful:', txHash);
    } else {
      // Fallback to regular wagmi call
      console.log('⚠️ Factory: Using regular wagmi writeContract (user pays gas)');
      txHash = await writeContractAsync({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createWallet',
        args: [connectedWalletAddress],
        // No value parameter - wallet creation is free
      });
    }

    console.log('Transaction hash:', txHash);
    
    // Wait for the transaction and get the budget wallet address from the event
    const budgetWalletAddress = await waitForWalletCreation(txHash);
    
    if (!budgetWalletAddress) {
      throw new Error('Failed to get budget wallet address from transaction. Please check the transaction manually.');
    }
    
    console.log('Budget wallet created successfully:', budgetWalletAddress);
    
    return { 
      txHash, 
      budgetWalletAddress,
      alreadyExists: false 
    };
  } catch (error) {
    console.error('Error in createBudgetWallet:', error);
    
    // Enhanced error handling
    if (error instanceof Error) {
      // Check for user cancellation
      if (error.message.includes('User rejected') || 
          error.message.includes('rejected') ||
          error.message.includes('User exited') ||
          error.message.includes('user rejected')) {
        throw new Error('Transaction was cancelled by user. Please try again and approve the transaction.');
      }
      
      // Check for insufficient funds
      if (error.message.includes('insufficient funds') || 
          error.message.includes('insufficient balance')) {
        throw new Error('Insufficient funds to create wallet. Please add ETH to your wallet for gas fees.');
      }
      
      // Check for network issues
      if (error.message.includes('network') || 
          error.message.includes('chain') ||
          error.message.includes('unsupported network')) {
        throw new Error('Network error. Please ensure you are connected to Base Sepolia network.');
      }
      
      // Check for contract issues
      if (error.message.includes('contract') || 
          error.message.includes('execution reverted')) {
        throw new Error('Contract execution failed. Please try again or contact support.');
      }
    }
    
    throw error;
  }
}

// Create deterministic budget wallet for user using wagmi
export async function createDeterministicBudgetWallet(
  writeContractAsync: (args: WriteContractArgs) => Promise<`0x${string}`>,
  userAddress: `0x${string}`, 
  salt: bigint,
  smartAccountClient?: SmartAccountClient // Optional smart account client
): Promise<{
  txHash: `0x${string}`;
  walletAddress?: `0x${string}`;
}> {
  let txHash: `0x${string}`;
  
  // Use smart account client for gas sponsorship if available
  if (smartAccountClient?.account) {
    txHash = await smartAccountClient.writeContract({
      address: FACTORY_CONTRACT_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'createWalletDeterministic',
      args: [smartAccountClient.account.address, salt], // Pass smart account address and salt
      chain: smartAccountClient.chain,
      account: smartAccountClient.account,
    });
  } else {
    // Use wagmi's writeContractAsync (no fee required)
    txHash = await writeContractAsync({
      address: FACTORY_CONTRACT_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'createWalletDeterministic',
      args: [userAddress, salt], // Pass user address and salt
      // No value parameter - wallet creation is free
    });
  }

  return { txHash };
}

// Get current chain ID from wagmi (to be used in hook)
export function getCurrentChainIdFromWagmi(chainId: number | undefined): number {
  return chainId || 1; // Default to mainnet if not available
}

// Switch to Base Sepolia network using wagmi
export async function switchToBaseSepolia(switchChain: (args: { chainId: number }) => void): Promise<void> {
  try {
    switchChain({ chainId: baseSepolia.id });
  } catch (error: unknown) {
    console.error('Error switching to Base Sepolia:', error);
    throw new Error('Failed to switch to Base Sepolia network. Please switch manually in your wallet.');
  }
}

// Wait for transaction and get wallet address from event
export async function waitForWalletCreation(txHash: `0x${string}`): Promise<`0x${string}` | null> {
  try {
    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000 // 60 seconds timeout
    });

    // Parse logs for WalletCreated event
    const logs = receipt.logs;
    
    for (const log of logs) {
      try {
        if (log.address.toLowerCase() === FACTORY_CONTRACT_ADDRESS.toLowerCase()) {
          // Try to decode as WalletCreated event
          const decodedLog = {
            eventName: 'WalletCreated',
            args: {
              user: `0x${log.topics[1]?.slice(26)}` as `0x${string}`,
              wallet: `0x${log.topics[2]?.slice(26)}` as `0x${string}`,
              salt: log.data ? BigInt(log.data) : BigInt(0)
            }
          };
          
          if (decodedLog.eventName === 'WalletCreated') {
            return decodedLog.args.wallet;
          }
        }
      } catch (decodeError) {
        console.warn('Failed to decode log:', decodeError);
        continue;
      }
    }
    
    console.warn('WalletCreated event not found in transaction logs');
    return null;
  } catch (error) {
    console.error('Error waiting for wallet creation:', error);
    throw error;
  }
}

// Check if connected wallet has a budget wallet using the hasWallet contract function
export async function checkUserHasWallet(connectedWalletAddress: `0x${string}`): Promise<boolean> {
  try {
    console.log('Checking if connected wallet has budget wallet:', connectedWalletAddress);

    const hasWallet = await publicClient.readContract({
      address: FACTORY_CONTRACT_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'hasWallet',
      args: [connectedWalletAddress]
    }) as boolean;

    console.log('Connected wallet has budget wallet:', hasWallet);
    return hasWallet;

  } catch (error) {
    console.error('Error checking if connected wallet has budget wallet:', error);
    return false;
  }
}

// Get user's existing budget wallet address from their connected wallet (returns null if no budget wallet)
export async function getUserBudgetWalletAddress(connectedWalletAddress: `0x${string}`): Promise<`0x${string}` | null> {
  try {
    // First check if connected wallet has a budget wallet
    const hasWallet = await checkUserHasWallet(connectedWalletAddress);
    
    if (!hasWallet) {
      return null;
    }

    // Get the budget wallet address
    const budgetWalletAddress = await publicClient.readContract({
      address: FACTORY_CONTRACT_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getUserWallet',
      args: [connectedWalletAddress]
    }) as `0x${string}`;

    console.log('Budget wallet address:', budgetWalletAddress);
    return budgetWalletAddress;

  } catch (error) {
    console.error('Error getting budget wallet address:', error);
    return null;
  }
}

// Legacy functions - keeping for backward compatibility
export async function getUserWalletAddress(userAddress: `0x${string}`): Promise<`0x${string}` | null> {
  return await getUserBudgetWalletAddress(userAddress);
}

export async function checkExistingBudgetWallet(userAddress: string): Promise<string | null> {
  return await getUserBudgetWalletAddress(userAddress as `0x${string}`);
}

// Legacy alias for the main function
export async function createBudgetWallet(
  writeContractAsync: (args: WriteContractArgs) => Promise<`0x${string}`>,
  connectedWalletAddress: `0x${string}`,
  smartAccountClient?: SmartAccountClient
) {
  console.log('🏭 createBudgetWallet called with:', {
    connectedWalletAddress,
    hasSmartAccount: !!smartAccountClient,
    smartAccountAddress: smartAccountClient?.account?.address
  });
  
  const result = await createOrGetBudgetWallet(writeContractAsync, connectedWalletAddress, smartAccountClient);
  
  console.log('🏭 createBudgetWallet result:', {
    txHash: result.txHash,
    walletAddress: result.budgetWalletAddress,
    alreadyExists: result.alreadyExists
  });
  
  return {
    txHash: result.txHash,
    walletAddress: result.budgetWalletAddress,
    alreadyExists: result.alreadyExists
  };
}

// Legacy subgraph check function (keeping for reference/fallback)
export async function checkExistingBudgetWalletSubgraph(userAddress: string): Promise<string | null> {
  try {
    const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
    if (!subgraphUrl) {
      console.warn('Subgraph URL not configured');
      return null;
    }

    const response = await fetch(subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetUserWallets($userAddress: ID!) {
            user(id: $userAddress) {
              id
              walletsCreated {
                wallet
                timestamp
              }
            }
          }
        `,
        variables: { userAddress: userAddress.toLowerCase() }
      })
    });

    // Check if the response is ok before trying to parse JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Subgraph API error:', response.status, errorText);
      
      // Common error handling
      if (response.status === 429) {
        console.warn('Rate limited by subgraph API. Will skip existing wallet check.');
      } else if (response.status >= 500) {
        console.warn('Subgraph API server error. Will skip existing wallet check.');
      } else {
        console.warn('Subgraph API client error. Will skip existing wallet check.');
      }
      
      return null;
    }

    // Check if the response content type is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Expected JSON response but got:', contentType, responseText);
      return null;
    }

    const data = await response.json();
    
    // Check for GraphQL errors
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return null;
    }
    
    if (data.data?.user?.walletsCreated?.length > 0) {
      // Return the most recent wallet
      const wallets = data.data.user.walletsCreated;
      const latestWallet = wallets.sort((a: { timestamp: string }, b: { timestamp: string }) => 
        parseInt(b.timestamp) - parseInt(a.timestamp)
      )[0];
      
      return latestWallet.wallet;
    }

    return null;
  } catch (error) {
    console.error('Error checking existing budget wallet:', error);
    
    // Log specific error details for debugging
    if (error instanceof TypeError && error.message.includes('JSON')) {
      console.error('JSON parsing error - likely received non-JSON response from subgraph');
    } else if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    
    return null;
  }
}