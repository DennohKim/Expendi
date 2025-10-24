import { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { useVaultsList, type Vault } from "./useVaultsList";
import { getApiForChain } from "../constants";

export interface UserPosition {
  vault: Vault;
  vaultBalance: bigint | undefined;
  depositedAssets: bigint | undefined;
  sharePrice: number;
  currentValueUsd: number;
  hasPosition: boolean;
  // Enhanced position data from Morpho API
  pnl: number;
  pnlUsd: number;
  roe: number | null;
  roeUsd: number | null;
  assets: number;
  assetsUsd: number;
  shares: string;
  whitelisted: boolean;
  timestamp: number;
}

export interface PortfolioSummary {
  positions: UserPosition[];
  totalValueUsd: number;
  totalPositions: number;
  totalPnlUsd: number;
  totalRoeUsd: number | null;
  isLoading: boolean;
  error: string | null;
}

interface VaultPositionResponse {
  id: string;
  vault: {
    id: string;
    address: string;
  };
  user: {
    address: string;
    id: string;
    chain: {
      network: string;
      id: number;
      currency?: string;
    };
    marketPositions: unknown[];
    tag: string | null;
  };
  whitelisted: boolean;
  state: {
    id: string;
    timestamp: number;
    pnl: number;
    pnlUsd: number;
    roe: number | null;
    roeUsd: number | null;
    assets: number;
    assetsUsd: number;
    shares: string;
  };
}

export function useUserPortfolio(): PortfolioSummary {
  const { address } = useAccount();
  const chainId = useChainId();
  const { vaults, loading: vaultsLoading, error: vaultsError } = useVaultsList();
  
  const [userPositions, setUserPositions] = useState<VaultPositionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user vault positions from Morpho API
  useEffect(() => {
    async function fetchUserPositions() {
      if (!address || !chainId || vaultsLoading) {
        setLoading(vaultsLoading);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const api = getApiForChain(chainId);
        if (!api?.morphoGraphql) {
          throw new Error("API endpoint not available for this network");
        }

        const res = await fetch(api.morphoGraphql, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query GetAllUserPositions($chainId: Int!, $userAddress: String!) {
              vaultPositions(
                where: {
                  chainId_in: [$chainId]
                  shares_gte: 0
                  userAddress_in: [$userAddress]
                }
              ) {
                items {
                  id
                  vault {
                    id
                    address
                  }
                  user {
                    address
                    id
                    chain {
                      network
                      id
                      currency
                    }
                    marketPositions {
                      market {
                        collateralAsset {
                          address
                          chain {
                            network
                          }
                        }
                      }
                    }
                    tag
                  }
                  whitelisted
                  state {
                    id
                    timestamp
                    pnl
                    pnlUsd
                    roe
                    roeUsd
                    assets
                    assetsUsd
                    shares
                  }
                }
              }
            }`,
            variables: {
              chainId: chainId,
              userAddress: address.toLowerCase(),
            },
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        
        if (json.errors) {
          throw new Error(json.errors[0]?.message || "GraphQL error");
        }

        const positions: VaultPositionResponse[] = json?.data?.vaultPositions?.items || [];
        
        // Filter out positions with zero assets or shares
        const activePositions = positions.filter(pos => {
          const assets = pos.state.assets;
          const shares = parseFloat(pos.state.shares);
          return assets > 0 && shares > 0;
        });

        setUserPositions(activePositions);
      } catch (err) {
        console.error("Error fetching user positions:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch user positions");
      } finally {
        setLoading(false);
      }
    }

    fetchUserPositions();
  }, [address, chainId, vaultsLoading]);

  // Combine user positions with vault data
  const positions = useMemo((): UserPosition[] => {
    if (!userPositions.length || !vaults.length) return [];

    const validPositions: UserPosition[] = [];

    userPositions.forEach((userPos) => {
      // Find matching vault from the vaults list
      const vault = vaults.find(v => 
        v.address.toLowerCase() === userPos.vault.address.toLowerCase()
      );

      if (!vault) {
        console.warn(`Vault not found for position: ${userPos.vault.address}`);
        return;
      }

      // Parse share price from vault data
      const sharePriceStr = vault.sharePrice.replace("$", "");
      const sharePrice = parseFloat(sharePriceStr) || 1;

      // Use enhanced state data from Morpho API
      const { state } = userPos;
      const assetsNum = state.assets;
      const sharesNum = parseFloat(state.shares);
      
      // Convert to BigInt for compatibility with existing code
      const depositedAssets = BigInt(Math.floor(assetsNum * 1e18));
      const vaultBalance = BigInt(Math.floor(sharesNum * 1e18));
      
      // Use the accurate USD value from Morpho API
      const currentValueUsd = state.assetsUsd;

      validPositions.push({
        vault,
        vaultBalance,
        depositedAssets,
        sharePrice,
        currentValueUsd,
        hasPosition: true,
        // Enhanced position data from Morpho API
        pnl: state.pnl,
        pnlUsd: state.pnlUsd,
        roe: state.roe,
        roeUsd: state.roeUsd,
        assets: state.assets,
        assetsUsd: state.assetsUsd,
        shares: state.shares,
        whitelisted: userPos.whitelisted,
        timestamp: state.timestamp,
      });
    });

    return validPositions;
  }, [userPositions, vaults]);

  const summary = useMemo((): PortfolioSummary => {
    const totalValueUsd = positions.reduce((total, position) => {
      return total + position.currentValueUsd;
    }, 0);

    const totalPnlUsd = positions.reduce((total, position) => {
      return total + position.pnlUsd;
    }, 0);

    // Calculate average ROE USD (only from positions that have ROE data)
    const positionsWithRoe = positions.filter(pos => pos.roeUsd !== null);
    const totalRoeUsd = positionsWithRoe.length > 0 
      ? positionsWithRoe.reduce((total, position) => {
          return total + (position.roeUsd || 0);
        }, 0) / positionsWithRoe.length
      : null;

    return {
      positions,
      totalValueUsd,
      totalPositions: positions.length,
      totalPnlUsd,
      totalRoeUsd,
      isLoading: loading || vaultsLoading,
      error: error || vaultsError,
    };
  }, [positions, loading, vaultsLoading, error, vaultsError]);

  return summary;
}
