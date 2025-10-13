import type { Address, Hash } from "viem";

export interface MorphoMarket {
  id: string;
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
  supplyApy: number;
  borrowApy: number;
  totalSupply: bigint;
  totalBorrow: bigint;
  utilization: number;
  name: string;
  symbol: string;
  decimals: number;
}

export interface UserPosition {
  marketId: string;
  supplyShares: bigint;
  borrowShares: bigint;
  supplyAssets: bigint;
  borrowAssets: bigint;
  collateralAssets: bigint;
  healthFactor: number;
}

export interface SupplyOperation {
  type: "supply";
  marketId: string;
  amount: bigint;
  onBehalf?: Address;
}

export interface WithdrawOperation {
  type: "withdraw";
  marketId: string;
  amount: bigint;
  receiver?: Address;
}

export interface BorrowOperation {
  type: "borrow";
  marketId: string;
  amount: bigint;
  receiver?: Address;
}

export interface RepayOperation {
  type: "repay";
  marketId: string;
  amount: bigint;
  onBehalf?: Address;
}

export type MorphoOperation = 
  | SupplyOperation 
  | WithdrawOperation 
  | BorrowOperation 
  | RepayOperation;

export interface MorphoVaultOperation {
  type: "deposit" | "withdraw";
  vaultAddress: Address;
  amount: bigint;
  owner?: Address;
  receiver?: Address;
}

export interface BundleResult {
  hash?: Hash;
  success: boolean;
  error?: string;
  gasUsed?: bigint;
}

export interface MorphoConfig {
  morphoAddress: Address;
  bundlerAddress: Address;
  chainId: number;
  defaultSlippage: number;
}

export interface MarketStats {
  totalValueLocked: bigint;
  totalBorrowed: bigint;
  averageSupplyApy: number;
  averageBorrowApy: number;
  marketsCount: number;
}