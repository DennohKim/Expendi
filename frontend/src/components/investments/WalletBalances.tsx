"use client";

import React from "react";
import { useMorpho } from "@/context/MorphoContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatApy } from "@/lib/morpho/utils";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { Wallet, TrendingUp, ExternalLink } from "lucide-react";
import MarketBalance from "./MarketBalance";
import type { MorphoMarket } from "@/lib/morpho/types";
import { base } from "viem/chains";

export default function WalletBalances() {
  const { markets, isLoading } = useMorpho();
  const { isConnected } = useWalletAddress();

  // Group markets by token symbol to avoid duplicates
  const uniqueMarkets = React.useMemo(() => {
    const marketMap = new Map<string, MorphoMarket>();
    
    markets.forEach(market => {
      if (!marketMap.has(market.symbol) || 
          market.supplyApy > marketMap.get(market.symbol)!.supplyApy) {
        marketMap.set(market.symbol, market);
      }
    });
    
    return Array.from(marketMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [markets]);

  if (!isConnected) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to view your token balances and start earning interest
          </p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (uniqueMarkets.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
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
    <div className="space-y-6">
      {/* <SmartAccountInfo /> */}
      
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Your Token Balances</h3>
          </div>
          <Badge variant="outline">
            {uniqueMarkets.length} Assets
          </Badge>
        </div>

      <div className="space-y-4">
        {uniqueMarkets.map((market) => (
          <div
            key={market.symbol}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {market.symbol.slice(0, 2)}
                </span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold">{market.symbol}</h4>
                  <Badge variant="outline" className="text-green-600">
                    {formatApy(market.supplyApy)} APY
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {market.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <MarketBalance market={market} chainId={base.id} />
              
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Supply
                </Button>
                <Button size="sm" variant="ghost">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Start Earning Interest
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Supply your assets to any of these pools to start earning interest. 
              Higher APY means more earnings on your deposits.
            </p>
          </div>
        </div>
      </div>
      </Card>
    </div>
  );
}