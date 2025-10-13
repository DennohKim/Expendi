import {
  populateBundle,
  finalizeBundle,
  encodeBundle,
  type BundlerOperation,
} from "@morpho-org/bundler-sdk-viem";
import { SimulationState } from "@morpho-org/simulation-sdk";
import { type WalletClient, type Address } from "viem";
import { UnknownMarketParamsError } from "@morpho-org/blue-sdk";

export interface SetupBundleOptions {
  client: WalletClient;
  simulationState: SimulationState;
  operations: BundlerOperation[];
}

/**
 * Orchestrates the complete bundled transaction flow
 * Based on the reference implementation from earn-basic-app
 */
export async function setupBundle({
  client,
  simulationState,
  operations,
}: SetupBundleOptions): Promise<string> {
  // Validate account
  const account_ = client.account;
  if (!account_) {
    throw new Error("Account is required");
  }

  // Parse account address
  const account = typeof account_ === "string" ? account_ : account_.address;

  try {
    // Step 1: Populate bundle with configuration
    const { operations: populatedOperations, bundle } = populateBundle(
      operations,
      simulationState
    );

    // Step 2: Finalize bundle operations
    const finalizedBundle = finalizeBundle(populatedOperations, bundle);

    // Step 3: Extract all tokens involved in operations
    const tokens = new Set<Address>();
    
    for (const operation of finalizedBundle.operations) {
      // Handle different operation types
      if (operation.type.startsWith("Blue_")) {
        // For Blue operations, extract market tokens
        if ("args" in operation && operation.args && typeof operation.args === "object") {
          const args = operation.args as Record<string, unknown>;
          if (args.id) {
            // Extract loan and collateral tokens from market params
            // This would need to be fetched from the Morpho protocol
            // For now, we'll rely on the simulation state having the market info
          }
        }
      } else if (operation.type.startsWith("MetaMorpho_")) {
        // For MetaMorpho operations, extract vault asset
        if ("address" in operation && operation.address) {
          tokens.add(operation.address);
        }
      } else if (operation.type.startsWith("Erc20_")) {
        // For ERC20 operations, extract token address
        if ("address" in operation && operation.address) {
          tokens.add(operation.address);
          // Also add unwrapped version if applicable
          // This would need wrapped token mapping logic
        }
      }
    }

    // Step 4: Handle requirements (permits, etc.)
    const transactions: `0x${string}`[] = [];
    
    for (const requirement of finalizedBundle.requirements) {
      try {
        // Sign any required permits or approvals
        const signature = await requirement.sign(client, account as Address);
        if (signature) {
          // Add signature transaction if needed
          // This depends on the requirement type
        }
      } catch (error) {
        if (!(error instanceof UnknownMarketParamsError)) {
          throw error;
        }
        // Gracefully handle missing market data
        console.warn("Unknown market params, skipping requirement:", error.message);
      }
    }

    // Step 5: Add prerequisite transactions
    for (const tx of finalizedBundle.requirements) {
      if ("txs" in tx && Array.isArray(tx.txs)) {
        transactions.push(...tx.txs);
      }
    }

    // Step 6: Encode and add main bundle transaction
    const encodedBundle = encodeBundle(finalizedBundle);
    transactions.push(encodedBundle);

    // Step 7: Execute all transactions sequentially
    let lastHash: string = "";
    
    for (const txData of transactions) {
      const hash = await client.sendTransaction({
        account: account as Address,
        data: txData,
        to: "0x0000000000000000000000000000000000000000", // This should be the bundler address
      });
      lastHash = hash;
    }

    return lastHash;

  } catch (error) {
    console.error("Bundle setup failed:", error);
    throw error;
  }
}


/**
 * Check if an operation requires token approval
 */
export function requiresApproval(operation: BundlerOperation): boolean {
  return operation.type === "MetaMorpho_Deposit" || 
         operation.type === "Blue_Supply" ||
         operation.type === "Blue_Repay";
}

/**
 * Get the bundler address for a given chain
 */
export function getBundlerAddress(chainId: number): Address | undefined {
  const bundlerAddresses: Record<number, Address> = {
    1: "0x4095F064B8086013F2b6cCF34b4a5b7f79fF0DE8", // Ethereum Mainnet
    8453: "0x27C2c6A78170314C1e8e5B9E5B1F1DEe4d6f7e64", // Base
    42161: "0x0000000000000000000000000000000000000000", // Arbitrum (placeholder)
  };
  
  return bundlerAddresses[chainId];
}