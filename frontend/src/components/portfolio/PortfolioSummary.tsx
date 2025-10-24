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
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="h-5 w-5" />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Total Portfolio Value */}
            <div className="space-y-2 p-3 sm:p-0 rounded-lg bg-muted/30 sm:bg-transparent">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Portfolio Value
                </p>
              </div>
              <p className="text-xl sm:text-2xl font-bold break-all">
                ${totalValueUsd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {/* Total PnL */}
            <div className="space-y-2 p-3 sm:p-0 rounded-lg bg-muted/30 sm:bg-transparent">
              <div className="flex items-center gap-2">
                {isPositivePnl ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total P&L
                </p>
              </div>
              <div className="space-y-1">
                <p className={`text-xl sm:text-2xl font-bold break-all ${
                  isPositivePnl ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                }`}>
                  {isPositivePnl ? '+' : ''}${totalPnlUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                </p>
                {totalRoeUsd !== null && (
                  <p className={`text-xs sm:text-sm font-medium ${
                    totalRoeUsd >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                  }`}>
                    ROE: {totalRoeUsd >= 0 ? '+' : ''}{(totalRoeUsd * 100).toFixed(4)}%
                  </p>
                )}
              </div>
            </div>

            {/* Daily Earnings */}
            <div className="space-y-2 p-3 sm:p-0 rounded-lg bg-muted/30 sm:bg-transparent">
              <div className="flex items-center gap-2">
                {isPositiveEarnings ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Daily Earnings (Est.)
                </p>
              </div>
              <div className="space-y-1">
                <p className={`text-xl sm:text-2xl font-bold break-all ${
                  isPositiveEarnings ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                }`}>
                  {isPositiveEarnings ? '+' : ''}${totalDailyEarnings.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className={`text-xs sm:text-sm font-medium ${
                  isPositiveEarnings ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                }`}>
                  {isPositiveEarnings ? '+' : ''}{dailyEarningsPercentage.toFixed(3)}%
                </p>
              </div>
            </div>

            {/* Active Positions */}
            <div className="space-y-2 p-3 sm:p-0 rounded-lg bg-muted/30 sm:bg-transparent">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Active Positions
                </p>
              </div>
              <p className="text-xl sm:text-2xl font-bold">
                {totalPositions}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
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
            <CardTitle className="text-lg sm:text-xl">Your Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
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
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                  >
                    {/* Left Section: Vault Info */}
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <VaultImage 
                        imageUrl={position.vault.metadata?.image} 
                        vaultName={position.vault.name}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        {/* Title and Badge Row */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-sm sm:text-base truncate max-w-[180px] sm:max-w-none">
                            {position.vault.name}
                          </h4>
                          {position.whitelisted && (
                            <Badge variant="default" className="text-xs bg-blue-600 text-white flex-shrink-0">
                              Whitelisted
                            </Badge>
                          )}
                        </div>
                        {/* Metrics Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {position.vault.asset}
                          </Badge>
                          <span className="text-xs sm:text-sm text-green-600 dark:text-green-500 font-medium">
                            {position.vault.netApy}
                          </span>
                          {position.roeUsd !== null && (
                            <span className={`text-xs sm:text-sm font-medium ${
                              position.roeUsd >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                            }`}>
                              ROE: {position.roeUsd >= 0 ? '+' : ''}{(position.roeUsd * 100).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Value and P&L */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 text-right sm:ml-4 flex-shrink-0">
                      <p className="font-bold text-base sm:text-lg order-1 sm:order-none">
                        ${position.currentValueUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <div className="flex sm:flex-col gap-2 sm:gap-0.5 order-2 sm:order-none">
                        <p className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                          isPnlPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                        }`}>
                          P&L: {isPnlPositive ? '+' : ''}${position.pnlUsd.toFixed(6)}
                        </p>
                        <p className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
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