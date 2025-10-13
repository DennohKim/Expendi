"use client";

import React from "react";
import { useMorpho } from "@/context/MorphoContext";
import { Card } from "@/components/ui/card";
import { formatTokenAmount, formatApy } from "@/lib/morpho/utils";
import { TrendingUp, DollarSign, Percent, Target } from "lucide-react";

export default function PortfolioOverview() {
  const { marketStats, userPositions, isLoading } = useMorpho();

  const totalSupplied = userPositions.reduce(
    (sum, position) => sum + position.supplyAssets,
    BigInt(0)
  );

  const totalBorrowed = userPositions.reduce(
    (sum, position) => sum + position.borrowAssets,
    BigInt(0)
  );

  const netWorth = totalSupplied - totalBorrowed;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Portfolio Overview</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Net Worth
            </span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            ${formatTokenAmount(netWorth, 18, 2)}
          </p>
          <p className="text-xs text-gray-500">
            Total portfolio value
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Total Supplied
            </span>
          </div>
          <p className="text-2xl font-bold">
            ${formatTokenAmount(totalSupplied, 18, 2)}
          </p>
          <p className="text-xs text-gray-500">
            Earning interest
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Total Borrowed
            </span>
          </div>
          <p className="text-2xl font-bold">
            ${formatTokenAmount(totalBorrowed, 18, 2)}
          </p>
          <p className="text-xs text-gray-500">
            Outstanding debt
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Percent className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Avg Earn Rate
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {formatApy(marketStats?.averageSupplyApy || 0)}
          </p>
          <p className="text-xs text-gray-500">
            Across all positions
          </p>
        </div>
      </div>

      {userPositions.length === 0 && (
        <div className="mt-8 text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Start Earning Interest
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Supply your assets to start earning interest on Morpho protocol
          </p>
          <p className="text-sm text-gray-500">
            Available markets offer up to {formatApy(marketStats?.averageSupplyApy || 0)} APY
          </p>
        </div>
      )}
    </Card>
  );
}