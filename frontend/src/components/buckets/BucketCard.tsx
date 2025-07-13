"use client";

import { formatEther, formatUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FundBucketButton } from './FundBucketButton';
import { SpendBucketButton } from './SpendBucketButton';

interface BucketCardProps {
  name: string;
  monthlyLimit: bigint;
  currentSpent: bigint;
  isActive: boolean;
  ethBalance: bigint;
  usdcBalance: bigint;
}

export function BucketCard({
  name,
  monthlyLimit,
  currentSpent,
  isActive,
  ethBalance,
  usdcBalance
}: BucketCardProps) {
  const limitInUsdc = parseFloat(formatUnits(monthlyLimit, 6));
  const spentInUsdc = parseFloat(formatUnits(currentSpent, 6));
  const spentPercentage = limitInUsdc > 0 ? (spentInUsdc / limitInUsdc) * 100 : 0;
  
  const ethBalanceFormatted = parseFloat(formatEther(ethBalance));
  
  const usdcBalanceFormatted = parseFloat(formatUnits(usdcBalance, 6));

  return (
    <Card className={`${!isActive ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{name}</CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Monthly Limit Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly Spending</span>
            <span>{spentInUsdc.toFixed(2)} / {limitInUsdc.toFixed(2)} USDC</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                spentPercentage > 90 ? "bg-red-500" : 
                spentPercentage > 70 ? "bg-yellow-500" : 
                "bg-green-500"
              }`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {spentPercentage.toFixed(1)}% used
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-3 gap-4">
        
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-sm font-medium">{usdcBalanceFormatted.toFixed(2)} USDC</p>

          </div>
        </div>

        {/* Remaining Budget */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Remaining Budget</span>
            <span className="text-sm font-medium text-green-600">
              {Math.max(0, limitInUsdc - spentInUsdc).toFixed(2)} USDC
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <FundBucketButton bucketName={name} />
          <SpendBucketButton 
            bucketName={name}
            currentSpent={currentSpent}
            monthlyLimit={monthlyLimit}
            usdcBalance={usdcBalance}
          />
        </div>
      </CardContent>
    </Card>
  );
}