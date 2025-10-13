import { type WalletClient, type Address } from "viem";
import { SimulationState } from "@morpho-org/simulation-sdk";
import { DEFAULT_SLIPPAGE_TOLERANCE } from "@morpho-org/blue-sdk";
import { setupBundle } from "./helpers";
import type { BundlerOperation } from "@morpho-org/bundler-sdk-viem";

/**
 * Deposit assets into a MetaMorpho vault using the bundler
 * Based on the reference implementation from earn-basic-app
 */
export async function depositUsingBundler(
  client: WalletClient,
  simulationState: SimulationState,
  vaultAddress: Address,
  assets: bigint,
  owner?: Address
): Promise<string> {
  // Validate user address
  const user = client.account?.address;
  if (!user) {
    throw new Error("User address is required");
  }

  // Create MetaMorpho deposit operation
  const operation: BundlerOperation = {
    type: "MetaMorpho_Deposit",
    sender: user,
    address: vaultAddress,
    args: {
      assets,
      owner: owner || user,
      slippage: DEFAULT_SLIPPAGE_TOLERANCE,
    },
  };

  // Execute through bundler
  return setupBundle({
    client,
    simulationState,
    operations: [operation],
  });
}

/**
 * Withdraw shares from a MetaMorpho vault using the bundler
 * Based on the reference implementation from earn-basic-app
 */
export async function withdrawUsingBundler(
  client: WalletClient,
  simulationState: SimulationState,
  vaultAddress: Address,
  shares: bigint,
  owner?: Address,
  receiver?: Address
): Promise<string> {
  // Validate user address
  const user = client.account?.address;
  if (!user) {
    throw new Error("User address is required");
  }

  // Create MetaMorpho withdraw operation
  const operation: BundlerOperation = {
    type: "MetaMorpho_Withdraw",
    sender: user,
    address: vaultAddress,
    args: {
      shares,
      owner: owner || user,
      receiver: receiver || user,
      slippage: DEFAULT_SLIPPAGE_TOLERANCE,
    },
  };

  // Execute through bundler
  return setupBundle({
    client,
    simulationState,
    operations: [operation],
  });
}

/**
 * Batch multiple operations into a single bundled transaction
 */
export async function executeBatchOperations(
  client: WalletClient,
  simulationState: SimulationState,
  operations: BundlerOperation[]
): Promise<string> {
  if (operations.length === 0) {
    throw new Error("At least one operation is required");
  }

  return setupBundle({
    client,
    simulationState,
    operations,
  });
}

/**
 * Supply assets to a Morpho Blue market using the bundler
 * For direct market interactions (not vault)
 */
export async function supplyToMarketUsingBundler(
  client: WalletClient,
  simulationState: SimulationState,
  morphoAddress: Address,
  marketId: string,
  assets: bigint,
  onBehalf?: Address
): Promise<string> {
  // Validate user address
  const user = client.account?.address;
  if (!user) {
    throw new Error("User address is required");
  }

  // Create Blue supply operation
  const operation: BundlerOperation = {
    type: "Blue_Supply",
    sender: user,
    address: morphoAddress,
    args: {
      id: marketId,
      assets,
      onBehalf: onBehalf || user,
      slippage: DEFAULT_SLIPPAGE_TOLERANCE,
    },
  };

  // Execute through bundler
  return setupBundle({
    client,
    simulationState,
    operations: [operation],
  });
}

/**
 * Withdraw assets from a Morpho Blue market using the bundler
 * For direct market interactions (not vault)
 */
export async function withdrawFromMarketUsingBundler(
  client: WalletClient,
  simulationState: SimulationState,
  morphoAddress: Address,
  marketId: string,
  assets: bigint,
  receiver?: Address
): Promise<string> {
  // Validate user address
  const user = client.account?.address;
  if (!user) {
    throw new Error("User address is required");
  }

  // Create Blue withdraw operation
  const operation: BundlerOperation = {
    type: "Blue_Withdraw",
    sender: user,
    address: morphoAddress,
    args: {
      id: marketId,
      assets,
      receiver: receiver || user,
      slippage: DEFAULT_SLIPPAGE_TOLERANCE,
    },
  };

  // Execute through bundler
  return setupBundle({
    client,
    simulationState,
    operations: [operation],
  });
}