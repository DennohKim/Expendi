import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { mainnet, base } from "viem/chains";
import { SimulationState } from "@morpho-org/simulation-sdk";

interface UseSimpleSimulationStateProps {
  vaultAddress?: Address;
  enabled?: boolean;
}

/**
 * Simplified simulation state hook that doesn't rely on the problematic wagmi hook
 * This creates a basic simulation state for bundler operations
 */
export function useSimpleSimulationState({
  vaultAddress,
  enabled = true,
}: UseSimpleSimulationStateProps) {
  const { address: account, chainId: targetChainId } = useAccount();
  const [simulationState, setSimulationState] = useState<SimulationState | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use effective chain ID for SDK compatibility (anvil -> mainnet mapping)
  const effectiveChainId = targetChainId === 31337 ? mainnet.id : targetChainId || base.id;

  // Bundler addresses by chain
  const bundlerAddresses: Record<number, Address> = {
    [mainnet.id]: "0x4095F064B8086013F2b6cCF34b4a5b7f79fF0DE8",
    [base.id]: "0x27C2c6A78170314C1e8e5B9E5B1F1DEe4d6f7e64",
  };

  const bundlerAddress = bundlerAddresses[effectiveChainId];

  useEffect(() => {
    if (!enabled || !account || !bundlerAddress) {
      setSimulationState(undefined);
      setError(!account ? "Wallet not connected" : !bundlerAddress ? "Unsupported chain" : null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create a basic simulation state with minimal configuration
      const users: Address[] = [account, bundlerAddress];
      if (vaultAddress) users.push(vaultAddress);

      const tokens: Address[] = [];
      
      // Add chain-specific tokens
      if (effectiveChainId === mainnet.id) {
        tokens.push(
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
          "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
          "0xA0b86a33E6441F8C5b8C1A8f0e1E4F2b7bbF6C4f"  // USDC
        );
      } else if (effectiveChainId === base.id) {
        tokens.push(
          "0x4200000000000000000000000000000000000006", // WETH on Base
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  // USDC on Base
        );
      }

      if (vaultAddress) tokens.push(vaultAddress);

      // Create a basic simulation state
      const state = new SimulationState({
        chainId: effectiveChainId,
        users,
        tokens,
        marketIds: [], // Start with empty markets, they'll be populated as needed
        bundlerAddress,
      });

      setSimulationState(state);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to create simulation state:", err);
      setError(err instanceof Error ? err.message : "Failed to create simulation state");
      setIsLoading(false);
    }
  }, [account, bundlerAddress, vaultAddress, enabled, effectiveChainId]);

  return {
    simulationState,
    isLoading,
    error,
    bundlerAddress,
    refetch: () => {
      // Simple refetch by re-triggering the effect
      setSimulationState(undefined);
      return Promise.resolve();
    },
  };
}