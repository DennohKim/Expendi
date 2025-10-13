"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useWalletClient } from "wagmi";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { MorphoBundler } from "@/lib/morpho/bundler";
import type { 
  MorphoMarket, 
  UserPosition, 
  MarketStats,
  BundleResult,
  MorphoOperation 
} from "@/lib/morpho/types";
import { base } from "viem/chains";
import { MarketId } from "@morpho-org/blue-sdk";
import { keccak256, encodePacked } from "viem";

// Helper function to generate market ID
function generateMarketId(params: {
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  oracle: `0x${string}`;
  irm: `0x${string}`;
  lltv: bigint;
}): MarketId {
  return keccak256(
    encodePacked(
      ["address", "address", "address", "address", "uint256"],
      [params.loanToken, params.collateralToken, params.oracle, params.irm, params.lltv]
    )
  ) as MarketId;
}

interface MorphoContextType {
  // Core state
  bundler: MorphoBundler | null;
  isLoading: boolean;
  error: string | null;
  
  // Market data
  markets: MorphoMarket[];
  userPositions: UserPosition[];
  marketStats: MarketStats | null;
  
  // User interactions
  supply: (marketId: string, amount: bigint) => Promise<BundleResult>;
  withdraw: (marketId: string, amount: bigint) => Promise<BundleResult>;
  borrow: (marketId: string, amount: bigint) => Promise<BundleResult>;
  repay: (marketId: string, amount: bigint) => Promise<BundleResult>;
  executeBundle: (operations: MorphoOperation[]) => Promise<BundleResult>;
  
  // Data fetching
  refreshMarkets: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const MorphoContext = createContext<MorphoContextType | undefined>(undefined);

interface MorphoProviderProps {
  children: ReactNode;
  chainId?: number;
  rpcUrl?: string;
}

export function MorphoProvider({ 
  children, 
  chainId = base.id, // Base chain by default
  rpcUrl 
}: MorphoProviderProps) {
  const { walletAddress, isConnected } = useWalletAddress();
  const { data: walletClient } = useWalletClient();
  
  // Core state
  const [bundler, setBundler] = useState<MorphoBundler | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Market data
  const [markets, setMarkets] = useState<MorphoMarket[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);

  // Initialize bundler when wallet connects
  useEffect(() => {
    if (isConnected && walletAddress) {
      try {
        const newBundler = new MorphoBundler(chainId, rpcUrl);
        if (walletClient) {
          newBundler.setWalletClient(walletClient);
        }
        setBundler(newBundler);
        setError(null);
      } catch (err) {
        setError(`Failed to initialize Morpho bundler: ${err}`);
        setBundler(null);
      }
    } else {
      setBundler(null);
    }
  }, [isConnected, walletAddress, walletClient, chainId, rpcUrl]);

  // Mock data fetching functions - replace with actual API calls
  const refreshMarkets = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Morpho API calls
      // Generate proper market IDs using Morpho SDK
      const usdcWethMarketParams = {
        loanToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, // USDC on Base
        collateralToken: "0x4200000000000000000000000000000000000006" as `0x${string}`, // WETH on Base
        oracle: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        irm: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        lltv: BigInt("860000000000000000"), // 86%
      };
      
      const mockMarkets: MorphoMarket[] = [
        {
          id: generateMarketId(usdcWethMarketParams),
          ...usdcWethMarketParams,
          supplyApy: 4.5,
          borrowApy: 6.2,
          totalSupply: BigInt("1000000000000000000000"), // 1000 tokens
          totalBorrow: BigInt("600000000000000000000"), // 600 tokens
          utilization: 60,
          name: "USD Coin",
          symbol: "USDC",
          decimals: 6,
        },
        {
          ...((() => {
            const wethUsdcMarketParams = {
              loanToken: "0x4200000000000000000000000000000000000006" as `0x${string}`, // WETH on Base
              collateralToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, // USDC on Base
              oracle: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              irm: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              lltv: BigInt("860000000000000000"), // 86%
            };
            return {
              id: generateMarketId(wethUsdcMarketParams),
              ...wethUsdcMarketParams,
            };
          })()),
          supplyApy: 3.8,
          borrowApy: 5.5,
          totalSupply: BigInt("2000000000000000000000"), // 2000 tokens
          totalBorrow: BigInt("1200000000000000000000"), // 1200 tokens
          utilization: 60,
          name: "Wrapped Ether",
          symbol: "WETH",
          decimals: 18,
        },
        {
          ...((() => {
            const cbethWethMarketParams = {
              loanToken: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as `0x${string}`, // cbETH on Base
              collateralToken: "0x4200000000000000000000000000000000000006" as `0x${string}`, // WETH on Base
              oracle: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              irm: "0x0000000000000000000000000000000000000000" as `0x${string}`,
              lltv: BigInt("860000000000000000"), // 86%
            };
            return {
              id: generateMarketId(cbethWethMarketParams),
              ...cbethWethMarketParams,
            };
          })()),
          supplyApy: 5.2,
          borrowApy: 7.1,
          totalSupply: BigInt("500000000000000000000"), // 500 tokens
          totalBorrow: BigInt("300000000000000000000"), // 300 tokens
          utilization: 60,
          name: "Coinbase Wrapped Staked ETH",
          symbol: "cbETH",
          decimals: 18,
        },
      ];
      
      setMarkets(mockMarkets);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch markets: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPositions = async () => {
    if (!walletAddress) return;
    
    try {
      // TODO: Replace with actual position fetching
      const mockPositions: UserPosition[] = [];
      setUserPositions(mockPositions);
    } catch (err) {
      setError(`Failed to fetch positions: ${err}`);
    }
  };

  const refreshStats = async () => {
    try {
      // TODO: Replace with actual stats calculation
      const mockStats: MarketStats = {
        totalValueLocked: BigInt("3000000000000000000000"),
        totalBorrowed: BigInt("1800000000000000000000"),
        averageSupplyApy: 4.15,
        averageBorrowApy: 5.85,
        marketsCount: markets.length,
      };
      setMarketStats(mockStats);
    } catch (err) {
      setError(`Failed to fetch stats: ${err}`);
    }
  };

  // User interaction functions
  const supply = async (marketId: string, amount: bigint): Promise<BundleResult> => {
    if (!bundler || !walletAddress) {
      return { success: false, error: "Bundler not initialized or wallet not connected" };
    }

    const result = await bundler.supply(marketId, amount, walletAddress);
    if (result.success) {
      // Refresh data after successful transaction
      await Promise.all([refreshPositions(), refreshMarkets()]);
    }
    return result;
  };

  const withdraw = async (marketId: string, amount: bigint): Promise<BundleResult> => {
    if (!bundler || !walletAddress) {
      return { success: false, error: "Bundler not initialized or wallet not connected" };
    }

    const result = await bundler.withdraw(marketId, amount, walletAddress);
    if (result.success) {
      await Promise.all([refreshPositions(), refreshMarkets()]);
    }
    return result;
  };

  const borrow = async (marketId: string, amount: bigint): Promise<BundleResult> => {
    if (!bundler || !walletAddress) {
      return { success: false, error: "Bundler not initialized or wallet not connected" };
    }

    const result = await bundler.borrow(marketId, amount, walletAddress);
    if (result.success) {
      await Promise.all([refreshPositions(), refreshMarkets()]);
    }
    return result;
  };

  const repay = async (marketId: string, amount: bigint): Promise<BundleResult> => {
    if (!bundler || !walletAddress) {
      return { success: false, error: "Bundler not initialized or wallet not connected" };
    }

    const result = await bundler.repay(marketId, amount, walletAddress);
    if (result.success) {
      await Promise.all([refreshPositions(), refreshMarkets()]);
    }
    return result;
  };

  const executeBundle = async (operations: MorphoOperation[]): Promise<BundleResult> => {
    if (!bundler || !walletAddress) {
      return { success: false, error: "Bundler not initialized or wallet not connected" };
    }

    const result = await bundler.executeBundle(operations, walletAddress);
    if (result.success) {
      await Promise.all([refreshPositions(), refreshMarkets()]);
    }
    return result;
  };

  // Initial data fetch
  useEffect(() => {
    if (bundler) {
      Promise.all([
        refreshMarkets(),
        refreshPositions(),
        refreshStats(),
      ]);
    }
  }, [bundler]);

  const value: MorphoContextType = {
    // Core state
    bundler,
    isLoading,
    error,
    
    // Market data
    markets,
    userPositions,
    marketStats,
    
    // User interactions
    supply,
    withdraw,
    borrow,
    repay,
    executeBundle,
    
    // Data fetching
    refreshMarkets,
    refreshPositions,
    refreshStats,
  };

  return (
    <MorphoContext.Provider value={value}>
      {children}
    </MorphoContext.Provider>
  );
}

export function useMorpho() {
  const context = useContext(MorphoContext);
  if (context === undefined) {
    throw new Error("useMorpho must be used within a MorphoProvider");
  }
  return context;
}