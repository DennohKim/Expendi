"use client";

import React from "react";
import { useMorpho } from "@/context/MorphoContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  formatTokenAmount, 
  getPositionStatus
} from "@/lib/morpho/utils";
import { TrendingUp, AlertTriangle, CheckCircle, Minus, Plus } from "lucide-react";

interface PositionsCardProps {
  limit?: number;
}

export default function PositionsCard({ limit }: PositionsCardProps) {
  const { userPositions, markets, isLoading } = useMorpho();

  const displayPositions = limit 
    ? userPositions.slice(0, limit) 
    : userPositions;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit || 3)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (displayPositions.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Active Positions
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don&apos;t have any active lending or borrowing positions
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Start Investing
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {displayPositions.map((position) => {
        const market = markets.find(m => m.id === position.marketId);
        if (!market) return null;

        const { status, color } = getPositionStatus(position.healthFactor);
        const hasSupply = position.supplyAssets > BigInt(0);
        const hasBorrow = position.borrowAssets > BigInt(0);

        return (
          <Card key={position.marketId} className="p-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{market.symbol}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {market.name}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {status === "healthy" && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {status === "risky" && (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  {status === "danger" && (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                  
                  <Badge variant={status === "healthy" ? "default" : "destructive"}>
                    {status}
                  </Badge>
                </div>
              </div>

              {/* Position Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasSupply && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">
                        Supplied
                      </span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatTokenAmount(position.supplyAssets, market.decimals)} {market.symbol}
                    </p>
                    <p className="text-xs text-gray-500">
                      Earning {market.supplyApy.toFixed(2)}% APY
                    </p>
                  </div>
                )}

                {hasBorrow && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Minus className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600">
                        Borrowed
                      </span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatTokenAmount(position.borrowAssets, market.decimals)} {market.symbol}
                    </p>
                    <p className="text-xs text-gray-500">
                      Paying {market.borrowApy.toFixed(2)}% APY
                    </p>
                  </div>
                )}
              </div>

              {/* Health Factor */}
              {hasBorrow && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Health Factor
                    </span>
                    <span className={`font-semibold ${color}`}>
                      {position.healthFactor === Infinity 
                        ? "∞" 
                        : position.healthFactor.toFixed(2)
                      }
                    </span>
                  </div>
                  
                  {position.healthFactor < 1.5 && position.healthFactor !== Infinity && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          position.healthFactor >= 1.5 ? "bg-green-500" :
                          position.healthFactor >= 1.1 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ 
                          width: `${Math.min((position.healthFactor / 2) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {hasSupply && (
                  <>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Plus className="w-4 h-4 mr-1" />
                      Supply More
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Minus className="w-4 h-4 mr-1" />
                      Withdraw
                    </Button>
                  </>
                )}
                
                {hasBorrow && (
                  <Button size="sm" variant="outline" className="flex-1">
                    <Minus className="w-4 h-4 mr-1" />
                    Repay
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      
      {limit && userPositions.length > limit && (
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {userPositions.length - limit} more positions
            </p>
            <Button variant="outline" size="sm">
              View All Positions
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}