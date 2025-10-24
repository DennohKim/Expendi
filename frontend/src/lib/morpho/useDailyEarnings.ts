import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useUserPortfolio, type UserPosition } from "./useUserPortfolio";

export interface DailyEarnings {
  totalDailyEarnings: number;
  dailyEarningsPercentage: number;
  positionEarnings: PositionEarnings[];
  isLoading: boolean;
  error: string | null;
}

export interface PositionEarnings {
  vaultAddress: string;
  vaultName: string;
  dailyEarnings: number;
  dailyEarningsPercentage: number;
  currentValue: number;
}

// Store for tracking previous day's portfolio values
const portfolioHistoryStore = new Map<string, { timestamp: number; totalValue: number; positions: Record<string, number> }>();

export function useDailyEarnings(): DailyEarnings {
  const { address } = useAccount();
  const { positions, totalValueUsd, isLoading: portfolioLoading } = useUserPortfolio();
  const [previousDayValue, setPreviousDayValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate daily earnings based on share price changes
  const calculateEarningsFromSharePrices = (positions: UserPosition[]): PositionEarnings[] => {
    return positions.map(position => {
      const { vault, currentValueUsd } = position;
      
      // Extract APY to estimate daily earnings
      const apyStr = vault.netApy.replace("%", "");
      const apy = parseFloat(apyStr) || 0;
      
      // Simple daily earnings calculation: (APY / 365) * current_value
      const dailyEarningsPercentage = apy / 365 / 100;
      const dailyEarnings = currentValueUsd * dailyEarningsPercentage;

      return {
        vaultAddress: vault.address,
        vaultName: vault.name,
        dailyEarnings,
        dailyEarningsPercentage: dailyEarningsPercentage * 100,
        currentValue: currentValueUsd,
      };
    });
  };

  // Load and save portfolio snapshots for more accurate tracking
  useEffect(() => {
    if (!address || portfolioLoading) return;

    const userKey = address.toLowerCase();
    const stored = portfolioHistoryStore.get(userKey);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // If we have data from yesterday, use it
    if (stored && (now - stored.timestamp) >= oneDayMs) {
      setPreviousDayValue(stored.totalValue);
    }

    // Update current snapshot (save for tomorrow's comparison)
    if (totalValueUsd > 0) {
      const currentPositionValues: Record<string, number> = {};
      positions.forEach(pos => {
        currentPositionValues[pos.vault.address] = pos.currentValueUsd;
      });

      portfolioHistoryStore.set(userKey, {
        timestamp: now,
        totalValue: totalValueUsd,
        positions: currentPositionValues,
      });
    }

    setIsLoading(false);
  }, [address, totalValueUsd, positions, portfolioLoading]);

  const dailyEarnings = useMemo((): DailyEarnings => {
    if (portfolioLoading || isLoading) {
      return {
        totalDailyEarnings: 0,
        dailyEarningsPercentage: 0,
        positionEarnings: [],
        isLoading: true,
        error: null,
      };
    }

    // Calculate position-level earnings
    const positionEarnings = calculateEarningsFromSharePrices(positions);
    
    // Calculate total daily earnings
    let totalDailyEarnings = 0;
    
    if (previousDayValue > 0 && totalValueUsd > 0) {
      // Use actual value difference if we have historical data
      totalDailyEarnings = totalValueUsd - previousDayValue;
    } else {
      // Fall back to APY-based estimation
      totalDailyEarnings = positionEarnings.reduce((total, pos) => total + pos.dailyEarnings, 0);
    }

    const dailyEarningsPercentage = totalValueUsd > 0 
      ? (totalDailyEarnings / totalValueUsd) * 100 
      : 0;

    return {
      totalDailyEarnings,
      dailyEarningsPercentage,
      positionEarnings,
      isLoading: false,
      error: null,
    };
  }, [positions, totalValueUsd, previousDayValue, portfolioLoading, isLoading]);

  return dailyEarnings;
}

// Helper hook for getting earnings over different timeframes
export function useEarningsOverTime(days: number = 1) {
  const { positions } = useUserPortfolio();
  
  const earnings = useMemo(() => {
    const totalEarnings = positions.reduce((total, position) => {
      const apyStr = position.vault.netApy.replace("%", "");
      const apy = parseFloat(apyStr) || 0;
      
      // Calculate earnings over specified period
      const periodEarnings = position.currentValueUsd * (apy / 365 / 100) * days;
      return total + periodEarnings;
    }, 0);

    const totalValue = positions.reduce((total, pos) => total + pos.currentValueUsd, 0);
    const earningsPercentage = totalValue > 0 ? (totalEarnings / totalValue) * 100 : 0;

    return {
      totalEarnings,
      earningsPercentage,
      period: days,
    };
  }, [positions, days]);

  return earnings;
}