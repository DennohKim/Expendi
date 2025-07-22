import { useAccount } from 'wagmi';
import { useSmartAccount } from '@/context/SmartAccountContext';

/**
 * Hook that provides the correct wallet address for both creation and checking.
 * This ensures consistency between wallet creation and wallet verification.
 */
export function useWalletAddress() {
  const { address: eoaAddress, isConnected } = useAccount();
  const { smartAccountClient, smartAccountReady } = useSmartAccount();

  // Use smart account address if available, fallback to EOA address
  // This logic MUST be consistent across all wallet operations
  const walletAddress = smartAccountClient?.account?.address || eoaAddress;

  // For polling, we want to be more specific about readiness
  const isReady = isConnected && (smartAccountReady || !smartAccountClient);

  console.log('🎯 Wallet address resolution:', {
    eoaAddress,
    smartAccountAddress: smartAccountClient?.account?.address,
    smartAccountReady,
    finalAddress: walletAddress,
    isReady
  });

  return {
    walletAddress,
    eoaAddress,
    smartAccountAddress: smartAccountClient?.account?.address,
    isConnected,
    smartAccountReady,
    isReady
  };
}