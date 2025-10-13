import { formatUnits, parseUnits } from "viem";
import type { MorphoMarket } from "./types";

export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  precision: number = 4
): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  
  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";
  
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
}

export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    return parseUnits(amount, decimals);
  } catch {
    return 0n;
  }
}

export function calculateApy(rate: bigint, decimals: number = 18): number {
  const ratePerSecond = Number(formatUnits(rate, decimals));
  const secondsPerYear = 365.25 * 24 * 60 * 60;
  return (Math.pow(1 + ratePerSecond, secondsPerYear) - 1) * 100;
}

export function calculateHealthFactor(
  collateralValue: bigint,
  borrowValue: bigint,
  lltv: bigint
): number {
  if (borrowValue === 0n) return Infinity;
  
  const maxBorrowValue = (collateralValue * lltv) / 10n ** 18n;
  return Number(formatUnits(maxBorrowValue, 18)) / Number(formatUnits(borrowValue, 18));
}

export function isPositionHealthy(healthFactor: number): boolean {
  return healthFactor > 1.2; // 20% buffer above liquidation threshold
}

export function getPositionStatus(healthFactor: number): {
  status: "healthy" | "risky" | "danger";
  color: string;
} {
  if (healthFactor >= 1.5) {
    return { status: "healthy", color: "text-green-500" };
  } else if (healthFactor >= 1.1) {
    return { status: "risky", color: "text-yellow-500" };
  } else {
    return { status: "danger", color: "text-red-500" };
  }
}

export function calculateUtilization(totalSupply: bigint, totalBorrow: bigint): number {
  if (totalSupply === 0n) return 0;
  return Number(formatUnits((totalBorrow * 10000n) / totalSupply, 2));
}

export function formatApy(apy: number): string {
  if (apy === 0) return "0.00%";
  if (apy < 0.01) return "< 0.01%";
  return `${apy.toFixed(2)}%`;
}

export function formatCurrency(
  amount: bigint,
  decimals: number,
  symbol: string = "USD"
): string {
  const formatted = formatTokenAmount(amount, decimals, 2);
  return `${formatted} ${symbol}`;
}

export function getMarketDisplayName(market: MorphoMarket): string {
  return `${market.symbol}/WETH`;
}

export function sortMarketsByTvl(markets: MorphoMarket[]): MorphoMarket[] {
  return [...markets].sort((a, b) => {
    const aTvl = a.totalSupply - a.totalBorrow;
    const bTvl = b.totalSupply - b.totalBorrow;
    return Number(bTvl - aTvl);
  });
}

export function sortMarketsByApy(markets: MorphoMarket[]): MorphoMarket[] {
  return [...markets].sort((a, b) => b.supplyApy - a.supplyApy);
}

export function filterMarketsByToken(
  markets: MorphoMarket[],
  tokenSymbol: string
): MorphoMarket[] {
  return markets.filter(market => 
    market.symbol.toLowerCase().includes(tokenSymbol.toLowerCase())
  );
}

export function validateAmount(
  amount: string,
  balance: bigint,
  decimals: number
): { isValid: boolean; error?: string } {
  if (!amount || amount === "0") {
    return { isValid: false, error: "Amount is required" };
  }

  try {
    const parsedAmount = parseTokenAmount(amount, decimals);
    
    if (parsedAmount <= 0n) {
      return { isValid: false, error: "Amount must be greater than 0" };
    }

    if (parsedAmount > balance) {
      return { isValid: false, error: "Insufficient balance" };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid amount format" };
  }
}