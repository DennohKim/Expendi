"use client";

import React from "react";
import { useMorpho } from "@/context/MorphoContext";
import { useBalance } from "wagmi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTokenAmount } from "@/lib/morpho/utils";
import { getTokenAddress } from "@/lib/morpho/config";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { Wallet, ArrowRight } from "lucide-react";
import type { MorphoMarket } from "@/lib/morpho/types";
import { base } from "viem/chains";

export default function QuickBalancesSummary() {
  const { markets } = useMorpho();
  const { isConnected } = useWalletAddress();

  // Get balances for top 3 markets
  const topMarkets = markets.slice(0, 3);

  if (!isConnected || topMarkets.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Available to Deposit
          </h3>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // This would switch to the balances tab
            // In a real implementation, you'd use the tab state from parent
          }}
        >
          View All <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topMarkets.map((market) => (
          <QuickBalanceItem key={market.id} market={market} />
        ))}
      </div>
    </Card>
  );
}

function QuickBalanceItem({ market }: { market: MorphoMarket }) {
  const { walletAddress } = useWalletAddress();
  const tokenAddress = getTokenAddress(base.id, market.symbol);
  
  const { data: balance, isLoading } = useBalance({
    address: walletAddress,
    token: tokenAddress,
    query: {
      enabled: !!tokenAddress && !!walletAddress,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="space-y-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
        </div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
      </div>
    );
  }

  const hasBalance = balance && balance.value > BigInt(0);

  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
      <div>
        <h4 className="font-semibold text-sm">{market.symbol}</h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {market.supplyApy.toFixed(2)}% APY
        </p>
      </div>
      <div className="text-right">
        <p className={`font-semibold text-sm ${hasBalance ? 'text-green-600' : 'text-gray-400'}`}>
          {balance ? formatTokenAmount(balance.value, balance.decimals, 2) : '0.00'}
        </p>
        <p className="text-xs text-gray-500">{market.symbol}</p>
      </div>
    </div>
  );
}