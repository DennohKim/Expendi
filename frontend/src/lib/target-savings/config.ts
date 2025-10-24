import { Address } from 'viem';
import { base } from 'viem/chains';
import { TokenInfo, VaultInfo } from './types';

// Contract addresses on Base mainnet
export const CONTRACTS = {
  GOALZ: '0x7cb746234f93726D5A70Bb21AA5a39A97D1Ce88f' as Address,
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  SPARK_USDC_VAULT: '0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A' as Address,
  GELATO_AUTOMATE: '0x2A6C106ae13B558BB9E2Ec64Bd2f1f7BEFF3A5E0' as Address,
} as const;

// Supported tokens
export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    address: CONTRACTS.USDC,
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
  },
];

// Supported vaults
export const SUPPORTED_VAULTS: VaultInfo[] = [
  {
    address: CONTRACTS.SPARK_USDC_VAULT,
    name: 'Spark USDC Vault',
    asset: CONTRACTS.USDC,
  },
];

// Chain configuration
export const CHAIN_CONFIG = {
  chainId: base.id,
  name: base.name,
  nativeCurrency: base.nativeCurrency,
  rpcUrls: base.rpcUrls,
  blockExplorers: base.blockExplorers,
};

// Default automation intervals (in seconds)
export const AUTOMATION_INTERVALS = {
  DAILY: 86400,
  WEEKLY: 604800,
  BIWEEKLY: 1209600,
  MONTHLY: 2592000,
  CUSTOM: 0, // User defined
} as const;

// Automation labels for UI
export const AUTOMATION_LABELS: Record<number, string> = {
  [AUTOMATION_INTERVALS.DAILY]: 'Daily',
  [AUTOMATION_INTERVALS.WEEKLY]: 'Weekly',
  [AUTOMATION_INTERVALS.BIWEEKLY]: 'Bi-Weekly',
  [AUTOMATION_INTERVALS.MONTHLY]: 'Monthly',
};

// Automation configuration
export const AUTOMATION_CONFIG = {
  MIN_INTERVAL: 86400, // 1 day minimum
  MAX_INTERVAL: 31536000, // 1 year maximum
  MIN_DEPOSIT_AMOUNT: BigInt('1000000'), // 1 USDC
  GELATO_CHECK_INTERVAL: 600000, // 10 minutes in milliseconds
  APPROVAL_BUFFER: 1.1, // Add 10% buffer to approval calculations
  MIN_DEPOSITS_FOR_WARNING: 5, // Show warning if less than 5 deposits possible
} as const;

// UI constants
export const UI_CONFIG = {
  MAX_GOALS_PER_USER: 20,
  MIN_DEPOSIT_AMOUNT: BigInt('1000000'), // 1 USDC (6 decimals)
  MIN_TARGET_AMOUNT: BigInt('10000000'), // 10 USDC
  MAX_TARGET_AMOUNT: BigInt('1000000000000'), // 1M USDC
  DEADLINE_MIN_DAYS: 1,
  DEADLINE_MAX_DAYS: 365 * 5, // 5 years
} as const;

// Format helpers
export const FORMATTING = {
  CURRENCY_DISPLAY: 'USD',
  DECIMAL_PLACES: 2,
  COMPACT_THRESHOLD: 1000000, // 1M - show as 1.2M instead of 1,200,000
} as const;