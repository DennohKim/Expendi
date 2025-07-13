import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatUnits } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatBalance = (balance: string | bigint) => {
  if (typeof balance === 'bigint') {
    // MockUSDC has 6 decimals
    const formatted = parseFloat(formatUnits(balance, 6)).toFixed(2);
    return Number(formatted).toLocaleString();
  }
  const formatted = parseFloat(balance).toFixed(2);
  return Number(formatted).toLocaleString();
};

export const formatAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};