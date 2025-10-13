import { useState } from "react";
import { useMorpho } from "@/context/MorphoContext";
import { parseTokenAmount } from "@/lib/morpho/utils";
import type { BundleResult } from "@/lib/morpho/types";

export function useMorphoSupply() {
  const { supply } = useMorpho();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSupply = async (
    marketId: string,
    amount: string,
    decimals: number
  ): Promise<BundleResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const parsedAmount = parseTokenAmount(amount, decimals);
      const result = await supply(marketId, parsedAmount);
      
      if (!result.success) {
        setError(result.error || "Supply failed");
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeSupply,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}