import { type Address, type WalletClient } from "viem";
import { type SimulationState } from "@morpho-org/simulation-sdk";
import { depositUsingBundler, withdrawUsingBundler, executeBatchOperations } from "./actions";
import type { BundleResult, MorphoVaultOperation } from "./types";

/**
 * Simplified Morpho Bundler class using the correct reference implementation patterns
 * Based on the earn-basic-app architecture
 */
export class MorphoBundler {
  private walletClient?: WalletClient;
  private simulationState?: SimulationState;

  constructor() {
    // Simplified constructor - configuration now handled by hooks and context
  }

  setWalletClient(walletClient: WalletClient) {
    this.walletClient = walletClient;
  }

  setSimulationState(simulationState: SimulationState) {
    this.simulationState = simulationState;
  }

  private validateSetup(): void {
    if (!this.walletClient) {
      throw new Error("Wallet client not set. Call setWalletClient first.");
    }
    if (!this.simulationState) {
      throw new Error("Simulation state not set. Call setSimulationState first.");
    }
  }

  async depositToVault(
    vaultAddress: Address,
    assets: bigint,
    owner?: Address
  ): Promise<BundleResult> {
    try {
      this.validateSetup();

      const hash = await depositUsingBundler(
        this.walletClient!,
        this.simulationState!,
        vaultAddress,
        assets,
        owner
      );

      return {
        hash,
        success: true,
      };

    } catch (error: unknown) {
      console.error("Vault deposit failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async withdrawFromVault(
    vaultAddress: Address,
    shares: bigint,
    owner?: Address,
    receiver?: Address
  ): Promise<BundleResult> {
    try {
      this.validateSetup();

      const hash = await withdrawUsingBundler(
        this.walletClient!,
        this.simulationState!,
        vaultAddress,
        shares,
        owner,
        receiver
      );

      return {
        hash,
        success: true,
      };

    } catch (error: unknown) {
      console.error("Vault withdrawal failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async executeBatch(operations: MorphoVaultOperation[]): Promise<BundleResult> {
    try {
      this.validateSetup();

      // Convert to bundler operations format
      const bundlerOps = operations.map(op => {
        if (op.type === "deposit") {
          return {
            type: "MetaMorpho_Deposit" as const,
            sender: this.walletClient!.account!.address,
            address: op.vaultAddress,
            args: {
              assets: op.amount,
              owner: op.owner || this.walletClient!.account!.address,
              slippage: "100", // 1% default slippage
            },
          };
        } else {
          return {
            type: "MetaMorpho_Withdraw" as const,
            sender: this.walletClient!.account!.address,
            address: op.vaultAddress,
            args: {
              shares: op.amount,
              owner: op.owner || this.walletClient!.account!.address,
              receiver: op.receiver || this.walletClient!.account!.address,
              slippage: "100", // 1% default slippage
            },
          };
        }
      });

      const hash = await executeBatchOperations(
        this.walletClient!,
        this.simulationState!,
        bundlerOps
      );

      return {
        hash,
        success: true,
      };

    } catch (error: unknown) {
      console.error("Batch execution failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

}