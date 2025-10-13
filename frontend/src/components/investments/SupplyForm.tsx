"use client";

import React, { useState, useEffect } from "react";
import { useMorpho } from "@/context/MorphoContext";
import { useBalance, useAccount } from "wagmi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  formatTokenAmount, 
  parseTokenAmount, 
  validateAmount,
  formatApy 
} from "@/lib/morpho/utils";
import { getTokenAddress } from "@/lib/morpho/config";
import { useSimpleSimulationState } from "@/hooks/morpho/useSimpleSimulationState";
import { TrendingUp, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base } from "viem/chains";
import { useTransactionEmail } from "@/hooks/useTransactionEmail";

export default function SupplyForm() {
  const { markets, bundler: morphoBundler, isLoading: morphoLoading } = useMorpho();
  const { address: walletAddress, isConnected } = useAccount();
  const { sendTransactionEmail } = useTransactionEmail();
  
  const [selectedMarketId, setSelectedMarketId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSupplying, setIsSupplying] = useState(false);

  const selectedMarket = markets.find(m => m.id === selectedMarketId);
  
  // Get simulation state for the selected vault/market
  const { simulationState, error: simulationError } = useSimpleSimulationState({
    vaultAddress: selectedMarketId && selectedMarketId.startsWith('0x') ? selectedMarketId as `0x${string}` : undefined,
    enabled: !!selectedMarketId && !!walletAddress,
  });
  
  // Get token balance
  const tokenAddress = selectedMarket 
    ? getTokenAddress(base.id, selectedMarket.symbol) // Base chain
    : undefined;
    
  const { data: balance } = useBalance({
    address: walletAddress,
    token: tokenAddress,
    query: {
      enabled: !!walletAddress && !!tokenAddress,
    },
  });

  // Auto-select first market if none selected
  useEffect(() => {
    if (markets.length > 0 && !selectedMarketId) {
      setSelectedMarketId(markets[0].id);
    }
  }, [markets, selectedMarketId]);

  const validation = selectedMarket && balance
    ? validateAmount(amount, balance.value, selectedMarket.decimals)
    : { isValid: false, error: "Select a market and enter amount" };

  const handleMaxClick = () => {
    if (balance && selectedMarket) {
      const maxAmount = formatTokenAmount(balance.value, selectedMarket.decimals);
      setAmount(maxAmount);
    }
  };

  const handleSupply = async () => {
    if (!selectedMarket || !validation.isValid || !walletAddress || !morphoBundler || !simulationState) {
      toast.error("Please complete all fields and connect wallet");
      return;
    }

    if (simulationError) {
      toast.error(`Simulation error: ${simulationError}`);
      return;
    }

    setIsSupplying(true);
    try {
      const parsedAmount = parseTokenAmount(amount, selectedMarket.decimals);
      
      // Set simulation state on bundler
      morphoBundler.setSimulationState(simulationState);
      
      // Use the new vault deposit method
      const result = await morphoBundler.depositToVault(
        selectedMarketId as `0x${string}`,
        parsedAmount,
        walletAddress
      );
      
      if (result.success) {
        toast.success("Successfully deposited to vault!");
        
        // Send email notification for successful investment
        sendTransactionEmail({
          transactionType: 'investment',
          amount: amount,
          currency: selectedMarket.symbol,
          status: 'success',
          transactionHash: result.transactionHash,
        }).catch(error => {
          console.error('Failed to send investment email:', error);
        });
        
        setAmount("");
      } else {
        toast.error(result.error || "Failed to deposit to vault");
      }
    } catch (error) {
      toast.error("Transaction failed");
      console.error("Supply error:", error);
    } finally {
      setIsSupplying(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Wallet Not Connected
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to start supplying assets
          </p>
        </div>
      </Card>
    );
  }

  if (morphoLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  if (markets.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Markets Available
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Markets are currently loading or unavailable
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Selection */}
      <div className="space-y-2">
        <Label htmlFor="market">Select Market</Label>
        <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a market" />
          </SelectTrigger>
          <SelectContent>
            {markets.map((market) => (
              <SelectItem key={market.id} value={market.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{market.symbol}</span>
                  <Badge variant="outline" className="ml-2">
                    {formatApy(market.supplyApy)}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Simulation Error Warning */}
      {simulationError && (
        <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Simulation Error: {simulationError}
            </span>
          </div>
        </Card>
      )}

      {/* Selected Market Info */}
      {selectedMarket && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {selectedMarket.name}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Earn {formatApy(selectedMarket.supplyApy)} APY
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Amount Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="amount">Amount</Label>
          {balance && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Balance: {formatTokenAmount(balance.value, balance.decimals)} {balance.symbol}
            </span>
          )}
        </div>
        
        <div className="relative">
          <Input
            id="amount"
            type="text"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={validation.isValid ? "" : amount ? "border-red-500" : ""}
          />
          {balance && selectedMarket && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs"
              onClick={handleMaxClick}
            >
              MAX
            </Button>
          )}
        </div>
        
        {amount && !validation.isValid && (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{validation.error}</span>
          </div>
        )}
      </div>

      {/* Expected Earnings */}
      {selectedMarket && amount && validation.isValid && (
        <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Expected Earnings
              </span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              ~{((parseFloat(amount) * selectedMarket.supplyApy) / 100).toFixed(4)} {selectedMarket.symbol} per year
            </p>
          </div>
        </Card>
      )}

      {/* Supply Button */}
      <Button
        onClick={handleSupply}
        disabled={!validation.isValid || isSupplying || !!simulationError}
        className="w-full"
        size="lg"
      >
        {isSupplying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Depositing...
          </>
        ) : (
          <>
            <TrendingUp className="w-4 h-4 mr-2" />
            Deposit to Vault
          </>
        )}
      </Button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• You&apos;ll start earning interest immediately after depositing</p>
        <p>• You can withdraw your vault shares at any time</p>
        <p>• Interest is compounded automatically through vault strategies</p>
        <p>• Transactions are bundled for gas efficiency</p>
      </div>
    </div>
  );
}