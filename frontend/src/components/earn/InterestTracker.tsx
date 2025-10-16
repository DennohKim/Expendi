"use client";

import React from 'react';
import { formatUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Calendar, Target } from 'lucide-react';

interface InterestData {
  totalDeposited: bigint;
  currentValue: bigint;
  totalEarned: bigint;
  dailyRate: number;
  projectedMonthly: bigint;
  projectedYearly: bigint;
}

interface InterestTrackerProps {
  interestData: InterestData;
  isLoading?: boolean;
}

export const InterestTracker = React.memo(function InterestTracker({ 
  interestData, 
  isLoading = false 
}: InterestTrackerProps) {
  const calculations = React.useMemo(() => {
    const totalDepositedFormatted = formatUnits(interestData.totalDeposited, 6);
    const currentValueFormatted = formatUnits(interestData.currentValue, 6);
    const totalEarnedFormatted = formatUnits(interestData.totalEarned, 6);
    const projectedMonthlyFormatted = formatUnits(interestData.projectedMonthly, 6);
    const projectedYearlyFormatted = formatUnits(interestData.projectedYearly, 6);
    
    const percentageGain = interestData.totalDeposited > BigInt(0)
      ? (Number(interestData.totalEarned) / Number(formatUnits(interestData.totalDeposited, 6))) * 100
      : 0;

    return {
      totalDepositedFormatted,
      currentValueFormatted,
      totalEarnedFormatted,
      projectedMonthlyFormatted,
      projectedYearlyFormatted,
      percentageGain
    };
  }, [interestData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Interest Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Interest Tracker
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {interestData.dailyRate.toFixed(3)}% Daily
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Earnings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              Total Deposited
            </div>
            <div className="text-lg font-semibold">
              ${parseFloat(calculations.totalDepositedFormatted).toFixed(2)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              Current Value
            </div>
            <div className="text-lg font-semibold">
              ${parseFloat(calculations.currentValueFormatted).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Total Earned */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Interest Earned</span>
            <div className="text-right">
              <div className="font-semibold text-green-600">
                +${parseFloat(calculations.totalEarnedFormatted).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                ({calculations.percentageGain.toFixed(2)}% gain)
              </div>
            </div>
          </div>
        </div>

        {/* Projections */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Monthly Projection
            </span>
            <span className="text-sm font-medium text-blue-600">
              +${parseFloat(calculations.projectedMonthlyFormatted).toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              Yearly Projection
            </span>
            <span className="text-sm font-medium text-blue-600">
              +${parseFloat(calculations.projectedYearlyFormatted).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Visual Progress */}
        <div className="pt-2">
          <div className="text-xs text-muted-foreground mb-1">Interest Progress</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
              style={{ 
                width: `${Math.min(calculations.percentageGain * 10, 100)}%` 
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-right mt-1">
            Growing at {interestData.dailyRate.toFixed(3)}% daily
          </div>
        </div>
      </CardContent>
    </Card>
  );
});