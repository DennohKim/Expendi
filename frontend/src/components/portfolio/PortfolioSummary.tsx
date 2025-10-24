"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserPortfolio } from "@/lib/morpho/useUserPortfolio";
import { useDailyEarnings } from "@/lib/morpho/useDailyEarnings";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PieChart } from "lucide-react";
import { VaultImage } from "@/components/vault";

export function PortfolioSummary() {
  const { positions, totalValueUsd, totalPositions, totalPnlUsd, totalRoeUsd, isLoading } = useUserPortfolio();
  const { totalDailyEarnings, dailyEarningsPercentage, positionEarnings } = useDailyEarnings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalPositions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <PieChart className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                No Active Positions
              </h3>
              <p className="text-sm text-muted-foreground">
                Start investing in vaults below to see your portfolio summary
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositiveEarnings = totalDailyEarnings >= 0;
  const isPositivePnl = totalPnlUsd >= 0;

  return (
    <div className="space-y-4">
      {/* Main Portfolio Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Portfolio Value */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Total Portfolio Value
                </p>
              </div>
              <p className="text-2xl font-bold">
                ${totalValueUsd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {/* Total PnL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isPositivePnl ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <p className="text-sm font-medium text-muted-foreground">
                  Total P&L
                </p>
              </div>
              <div className="space-y-1">
                <p className={`text-2xl font-bold ${
                  isPositivePnl ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                }`}>
                  {isPositivePnl ? '+' : ''}${totalPnlUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                </p>
                {totalRoeUsd !== null && (
                  <p className={`text-sm ${
                    totalRoeUsd >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                  }`}>
                    ROE: {totalRoeUsd >= 0 ? '+' : ''}{(totalRoeUsd * 100).toFixed(4)}%
                  </p>
                )}
              </div>
            </div>

            {/* Daily Earnings */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isPositiveEarnings ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <p className="text-sm font-medium text-muted-foreground">
                  Daily Earnings (Est.)
                </p>
              </div>
              <div className="space-y-1">
                <p className={`text-2xl font-bold ${
                  isPositiveEarnings ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                }`}>
                  {isPositiveEarnings ? '+' : ''}${totalDailyEarnings.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className={`text-sm ${
                  isPositiveEarnings ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                }`}>
                  {isPositiveEarnings ? '+' : ''}{dailyEarningsPercentage.toFixed(3)}%
                </p>
              </div>
            </div>

            {/* Active Positions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Active Positions
                </p>
              </div>
              <p className="text-2xl font-bold">
                {totalPositions}
              </p>
              <p className="text-sm text-muted-foreground">
                {totalPositions === 1 ? 'vault' : 'vaults'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Positions */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {positions.map((position) => {
                const positionEarning = positionEarnings.find(
                  pe => pe.vaultAddress === position.vault.address
                );
                const dailyEarning = positionEarning?.dailyEarnings || 0;
                const isDailyPositive = dailyEarning >= 0;
                const isPnlPositive = position.pnlUsd >= 0;

                return (
                  <div
                    key={position.vault.address}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <VaultImage 
                        imageUrl={position.vault.metadata?.image} 
                        vaultName={position.vault.name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm truncate">
                            {position.vault.name}
                          </h4>
                          {position.whitelisted && (
                            <Badge variant="default" className="text-xs bg-blue-600 text-white">
                              Whitelisted
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {position.vault.asset}
                          </Badge>
                          <span className="text-xs text-green-600 dark:text-green-500">
                            {position.vault.netApy}
                          </span>
                          {position.roeUsd !== null && (
                            <span className={`text-xs ${
                              position.roeUsd >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                            }`}>
                              ROE: {position.roeUsd >= 0 ? '+' : ''}{(position.roeUsd * 100).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <p className="font-semibold text-sm">
                        ${position.currentValueUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        <p className={`text-xs ${
                          isPnlPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                        }`}>
                          P&L: {isPnlPositive ? '+' : ''}${position.pnlUsd.toFixed(6)}
                        </p>
                        <p className={`text-xs ${
                          isDailyPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                        }`}>
                          Est: {isDailyPositive ? '+' : ''}${dailyEarning.toFixed(2)}/day
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}