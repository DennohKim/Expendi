"use client";

import React from "react";
import { useMorpho } from "@/context/MorphoContext";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseTokenAmount } from "@/lib/morpho/utils";
import { toast } from "sonner";

export default function TestSupply() {
  const { supply, markets } = useMorpho();
  const { walletAddress, isConnected } = useWalletAddress();

  const handleTestSupply = async () => {
    if (!isConnected || !walletAddress || markets.length === 0) {
      toast.error("Wallet not connected or no markets available");
      return;
    }

    const testMarket = markets[0]; // Use first available market
    const testAmount = parseTokenAmount("1.0", testMarket.decimals); // Test with 1 token

    try {
      console.log("Testing supply with:", {
        marketId: testMarket.id,
        amount: testAmount.toString(),
        decimals: testMarket.decimals,
        symbol: testMarket.symbol,
      });

      const result = await supply(testMarket.id, testAmount);
      
      if (result.success) {
        toast.success("Test supply successful!");
        console.log("Supply result:", result);
      } else {
        toast.error(`Test supply failed: ${result.error}`);
        console.error("Supply error:", result.error);
      }
    } catch (error) {
      toast.error("Test supply threw an error");
      console.error("Supply exception:", error);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-500">Connect wallet to test supply</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h4 className="font-semibold">Bundler Test</h4>
        <p className="text-sm text-gray-600">
          Test the Morpho bundler integration with a small amount
        </p>
        <Button onClick={handleTestSupply} size="sm">
          Test Supply (1 {markets[0]?.symbol || "token"})
        </Button>
      </div>
    </Card>
  );
}