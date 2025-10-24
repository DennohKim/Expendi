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

export function formatErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return (error as { message?: string }).message || String(error);
  }
  return String(error);
}

export function isValidNumber(value: string): boolean {
  if (!value || value.trim() === "") return false;
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

export function createTxStatusMessage(
  action: string,
  success: boolean,
  error?: string
): string {
  if (success) {
    return `${action} transaction sent!`;
  }
  return `${action} failed: ${error || "Unknown error"}`;
}
