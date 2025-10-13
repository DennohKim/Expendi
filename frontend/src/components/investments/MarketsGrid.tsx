"use client";

import React from "react";
import { useMorpho } from "@/context/MorphoContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  formatTokenAmount, 
  formatApy, 
  calculateUtilization,
  sortMarketsByApy,
  sortMarketsByTvl 
} from "@/lib/morpho/utils";
import { TrendingUp, Users, Zap } from "lucide-react";
import MarketBalance from "./MarketBalance";
import { base } from "viem/chains";

interface MarketsGridProps {
  limit?: number;
  sortBy?: "apy" | "tvl";
}

export default function MarketsGrid({ limit, sortBy = "tvl" }: MarketsGridProps) {
  const { markets, isLoading } = useMorpho();

  const sortedMarkets = React.useMemo(() => {
    const sorted = sortBy === "apy" ? sortMarketsByApy(markets) : sortMarketsByTvl(markets);
    return limit ? sorted.slice(0, limit) : sorted;
  }, [markets, sortBy, limit]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(limit || 6)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (sortedMarkets.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Markets Available
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Markets are currently loading or unavailable
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedMarkets.map((market) => {
        const tvl = market.totalSupply - market.totalBorrow;
        const utilization = calculateUtilization(market.totalSupply, market.totalBorrow);

        return (
          <Card key={market.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-lg">{market.symbol}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {market.name}
                  </p>
                </div>
                <Badge variant="outline" className="text-green-600">
                  {formatApy(market.supplyApy)}
                </Badge>
              </div>

              {/* Wallet Balance */}
              <MarketBalance market={market} chainId={base.id} />

              {/* Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Supply APY
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatApy(market.supplyApy)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Borrow APY
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatApy(market.borrowApy)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    TVL
                  </span>
                  <span className="font-semibold">
                    ${formatTokenAmount(tvl, market.decimals, 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Utilization
                  </span>
                  <span className="font-semibold">
                    {utilization.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  variant="outline"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Supply
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  variant="outline"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Borrow
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}