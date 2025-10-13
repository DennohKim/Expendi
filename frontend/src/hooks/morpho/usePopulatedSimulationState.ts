import { useSimulationState } from "@morpho-org/simulation-sdk-wagmi";
import { useAccount } from "wagmi";
import { useMemo } from "react";
import { type Address } from "viem";
import { mainnet, base } from "viem/chains";

interface UsePopulatedSimulationStateProps {
  vaultAddress?: Address;
  enabled?: boolean;
}

interface SimulationError {
  global?: {
    feeRecipient?: string;
  };
  markets?: Record<string, string>;
  users?: Record<string, string>;
  positions?: Record<string, string>;
}

function getSimulationErrorMessage(error: SimulationError): string | null {
  if (error.global?.feeRecipient) {
    return `Global error - Fee recipient: ${error.global.feeRecipient}`;
  }
  
  if (error.markets) {
    const marketErrors = Object.entries(error.markets);
    if (marketErrors.length > 0) {
      return `Market errors: ${marketErrors.map(([id, msg]) => `${id}: ${msg}`).join(", ")}`;
    }
  }
  
  if (error.users) {
    const userErrors = Object.entries(error.users);
    if (userErrors.length > 0) {
      return `User errors: ${userErrors.map(([addr, msg]) => `${addr}: ${msg}`).join(", ")}`;
    }
  }
  
  if (error.positions) {
    const positionErrors = Object.entries(error.positions);
    if (positionErrors.length > 0) {
      return `Position errors: ${positionErrors.map(([id, msg]) => `${id}: ${msg}`).join(", ")}`;
    }
  }
  
  return null;
}

export function usePopulatedSimulationState({
  vaultAddress,
  enabled = true,
}: UsePopulatedSimulationStateProps) {
  const { address: account, chainId: targetChainId } = useAccount();

  // Use effective chain ID for SDK compatibility (anvil -> mainnet mapping)
  const effectiveChainId = targetChainId === 31337 ? mainnet.id : targetChainId || base.id;

  // Bundler addresses by chain
  const bundlerAddresses: Record<number, Address> = useMemo(() => ({
    [mainnet.id]: "0x4095F064B8086013F2b6cCF34b4a5b7f79fF0DE8",
    [base.id]: "0x27C2c6A78170314C1e8e5B9E5B1F1DEe4d6f7e64",
  }), []);

  const bundlerAddress = bundlerAddresses[effectiveChainId];

  // Core market IDs for major Morpho Blue markets
  const marketIds = useMemo(() => [
    // wstETH/WETH markets
    "0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc",
    "0x54efdee08e272e929e2d1fc15c9e3b484a9545f8a665854ad5c6e43b58e90b21",
    
    // WBTC/WETH markets  
    "0xb70b09e0f54c1c2e2c33c0e03d6a589cef2f6e8b57b65b4f2c3a8f4a7c6c58b73",
    "0xa921ef34e2fc7a27ccc50ae7e4b154e16c9799d3387076c421423ef52ac4df99",
    
    // rETH/WETH markets
    "0x06f2842602373d247c4934f7656e513955ccc4c377f0febc0d9ca2c3bcc191b1",
    "0xd5211d0e3f4a30d5c98653d988585792bb7812221f04801be73a44ceecb11e89",
    
    // Additional markets
    "0xd0e50cdac92fe2172043f5e0c36532c6369d24947e40968f34a5e8819ca9ec5d",
    "0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f2ac15e6c16c4431",
  ], []);

  const users = useMemo(() => {
    const userList: Address[] = [];
    if (account) userList.push(account);
    if (bundlerAddress) userList.push(bundlerAddress);
    if (vaultAddress) userList.push(vaultAddress);
    return userList;
  }, [account, bundlerAddress, vaultAddress]);

  const tokens = useMemo(() => {
    const tokenList: Address[] = [];
    
    // Only add tokens for the current chain
    if (effectiveChainId === mainnet.id) {
      tokenList.push(
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", // wstETH
        "0xae78736Cd615f374D3085123A210448E74Fc6393", // rETH
        "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
        "0xA0b86a33E6441F8C5b8C1A8f0e1E4F2b7bbF6C4f"  // USDC
      );
    } else if (effectiveChainId === base.id) {
      tokenList.push(
        "0x4200000000000000000000000000000000000006", // WETH on Base
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"  // USDC on Base
      );
    }
    
    if (vaultAddress) tokenList.push(vaultAddress);
    return tokenList;
  }, [vaultAddress, effectiveChainId]);

  // Determine if the hook should be enabled
  const isHookEnabled = useMemo(() => {
    return enabled && 
           !!bundlerAddress && 
           !!account && 
           Array.isArray(users) && 
           users.length > 0 && 
           Array.isArray(tokens) && 
           tokens.length > 0;
  }, [enabled, bundlerAddress, account, users, tokens]);
  
  // Always call the simulation state hook, but control enabling
  const simulationState = useSimulationState({
    chainId: effectiveChainId,
    users: Array.isArray(users) ? users : [],
    tokens: Array.isArray(tokens) ? tokens : [],
    marketIds: Array.isArray(marketIds) ? marketIds : [],
    bundlerAddress,
    enabled: isHookEnabled,
  });

  const errorMessage = useMemo(() => {
    if (!simulationState.data?.errors) return null;
    
    try {
      return getSimulationErrorMessage(simulationState.data.errors as SimulationError);
    } catch (error) {
      console.error("Error parsing simulation errors:", error);
      return "Failed to parse simulation errors";
    }
  }, [simulationState.data?.errors]);

  // Handle disabled states or missing requirements
  if (!account || !bundlerAddress || !enabled) {
    return {
      simulationState: undefined,
      isLoading: false,
      error: !account ? "Wallet not connected" : !bundlerAddress ? "Unsupported chain" : null,
      bundlerAddress,
      refetch: () => Promise.resolve(),
    };
  }

  return {
    simulationState: simulationState?.data,
    isLoading: simulationState?.isLoading || false,
    error: simulationState?.error?.message || errorMessage,
    bundlerAddress,
    refetch: simulationState?.refetch || (() => Promise.resolve()),
  };
}