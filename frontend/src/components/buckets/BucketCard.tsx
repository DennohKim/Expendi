"use client";

import React from 'react';
import { formatUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FundBucketButton } from './FundBucketButton';
import { SpendBucketButton } from './SpendBucketButton';

interface TokenBalance {
  id: string;
  balance: string;
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface Bucket {
  id: string;
  name: string;
  balance: string;
  monthlyLimit: string;
  monthlySpent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tokenBalances: TokenBalance[];
}

interface BucketCardProps {
  bucket: Bucket;
}

export const BucketCard = React.memo(function BucketCard({ bucket }: BucketCardProps) {
  // Memoize calculations to prevent unnecessary recalculations
  const calculations = React.useMemo(() => {
    // Convert string values to numbers for display
    // USDC has 6 decimals, ETH has 18 decimals
    const limitInTokens = parseFloat(bucket.monthlyLimit) / 1e6; // USDC has 6 decimals
    const spentInTokens = parseFloat(bucket.monthlySpent) / 1e6; // USDC has 6 decimals
    
    const spentPercentage = limitInTokens > 0 ? (spentInTokens / limitInTokens) * 100 : 0;
    
    // Calculate total token balances (keep as raw BigInt for accuracy)
    const totalTokenBalanceRaw = bucket.tokenBalances.reduce((total, tokenBalance) => {
      const balance = BigInt(tokenBalance.balance);
      return total + balance;
    }, BigInt(0));

    const availableBalance = formatUnits(totalTokenBalanceRaw, 6);

    return {
      limitInTokens,
      spentInTokens,
      spentPercentage,
      totalTokenBalanceRaw,
      availableBalance
    };
  }, [bucket.monthlyLimit, bucket.monthlySpent, bucket.tokenBalances]);

  const formatTokenAmount = React.useCallback((amount: number, isUSDC = true) => {
    // USDC: show 2 decimal places (like currency)
    // Other tokens: show up to 6 decimal places
    const decimals = isUSDC ? 2 : 6;
    return amount.toFixed(decimals).replace(/\.?0+$/, '');
  }, []);

  return (
    <Card className={`${!bucket.active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{bucket.name}</CardTitle>
          <Badge variant={bucket.active ? "success" : "secondary"}>
            {bucket.active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Monthly Limit Progress */}
        <div data-tour="bucket-analytics" className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly Spending</span>
            <span>
              {formatTokenAmount(calculations.spentInTokens)} / {formatTokenAmount(calculations.limitInTokens)} 
              {' USDC'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                calculations.spentPercentage > 90 ? "bg-red-500" : 
                calculations.spentPercentage > 70 ? "bg-yellow-500" : 
                "bg-green-500"
              }`}
              style={{ width: `${Math.min(calculations.spentPercentage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {calculations.spentPercentage.toFixed(1)}% used
          </div>
        </div>

      

        {/* Remaining Budget */}
        {/* <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Remaining Budget</span>
            <span className="text-sm font-medium text-green-600">
              {formatTokenAmount(Math.max(0, limitInTokens - spentInTokens))}
              {primaryToken?.token.symbol === 'UNKNOWN' ? ' USDC' : ` ${primaryToken?.token.symbol || 'USDC'}`}
            </span>
          </div>
        </div> */}

        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <p className="font-medium">{calculations.availableBalance} USDC</p>

          </div>
        </div>

       

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <FundBucketButton bucketName={bucket.name} />
          <SpendBucketButton 
            bucketName={bucket.name}
            currentSpent={BigInt(bucket.monthlySpent)}
            monthlyLimit={BigInt(bucket.monthlyLimit)}
            usdcBalance={calculations.totalTokenBalanceRaw} // Use raw BigInt value directly
          />
        </div>
      </CardContent>
    </Card>
  );
});