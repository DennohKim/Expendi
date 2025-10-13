"use client";

import React, { useState } from "react";
import { useMorpho } from "@/context/MorphoContext";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  formatTokenAmount, 
  parseTokenAmount, 
  validateAmount 
} from "@/lib/morpho/utils";
import { Minus, AlertCircle, CheckCircle, Loader2, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useTransactionEmail } from "@/hooks/useTransactionEmail";

export default function WithdrawForm() {
  const { markets, userPositions, withdraw, isLoading: morphoLoading } = useMorpho();
  const { address, isConnected } = useAccount();
  const { sendTransactionEmail } = useTransactionEmail();
  
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Get positions with supply assets
  const supplyPositions = userPositions.filter(p => p.supplyAssets > BigInt(0));
  const selectedPosition = supplyPositions.find(p => p.marketId === selectedPositionId);
  const selectedMarket = selectedPosition 
    ? markets.find(m => m.id === selectedPosition.marketId) 
    : undefined;

  const validation = selectedPosition && selectedMarket
    ? validateAmount(amount, selectedPosition.supplyAssets, selectedMarket.decimals)
    : { isValid: false, error: "Select a position and enter amount" };

  const handleMaxClick = () => {
    if (selectedPosition && selectedMarket) {
      const maxAmount = formatTokenAmount(selectedPosition.supplyAssets, selectedMarket.decimals);
      setAmount(maxAmount);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedPosition || !selectedMarket || !validation.isValid || !address) return;

    setIsWithdrawing(true);
    try {
      const parsedAmount = parseTokenAmount(amount, selectedMarket.decimals);
      const result = await withdraw(selectedPositionId, parsedAmount);
      
      if (result.success) {
        toast.success("Successfully withdrew assets!");
        
        // Send email notification for successful withdrawal
        sendTransactionEmail({
          transactionType: 'withdrawal',
          amount: amount,
          currency: selectedMarket.symbol,
          status: 'success',
          transactionHash: result.transactionHash,
        }).catch(error => {
          console.error('Failed to send withdrawal email:', error);
        });
        
        setAmount("");
      } else {
        toast.error(result.error || "Failed to withdraw assets");
      }
    } catch (error) {
      toast.error("Transaction failed");
      console.error("Withdraw error:", error);
    } finally {
      setIsWithdrawing(false);
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
            Connect your wallet to withdraw assets
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

  if (supplyPositions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Positions to Withdraw
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don&apos;t have any supplied assets to withdraw
          </p>
          <p className="text-sm text-gray-500">
            Supply assets first to start earning interest
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Position Selection */}
      <div className="space-y-2">
        <Label htmlFor="position">Select Position</Label>
        <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a position" />
          </SelectTrigger>
          <SelectContent>
            {supplyPositions.map((position) => {
              const market = markets.find(m => m.id === position.marketId);
              if (!market) return null;
              
              return (
                <SelectItem key={position.marketId} value={position.marketId}>
                  <div className="flex items-center justify-between w-full">
                    <span>{market.symbol}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {formatTokenAmount(position.supplyAssets, market.decimals)}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Position Info */}
      {selectedPosition && selectedMarket && (
        <Card className="p-4 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-orange-900 dark:text-orange-100">
                  {selectedMarket.name}
                </span>
              </div>
              <Badge variant="outline">
                {selectedMarket.supplyApy.toFixed(2)}% APY
              </Badge>
            </div>
            
            <div className="text-sm text-orange-700 dark:text-orange-300">
              <p>Supplied: {formatTokenAmount(selectedPosition.supplyAssets, selectedMarket.decimals)} {selectedMarket.symbol}</p>
              <p>Health Factor: {selectedPosition.healthFactor === Infinity ? "∞" : selectedPosition.healthFactor.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Amount Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="amount">Amount to Withdraw</Label>
          {selectedPosition && selectedMarket && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Available: {formatTokenAmount(selectedPosition.supplyAssets, selectedMarket.decimals)} {selectedMarket.symbol}
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
          {selectedPosition && selectedMarket && (
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

      {/* Impact Preview */}
      {selectedMarket && selectedPosition && amount && validation.isValid && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Withdrawal Preview
              </span>
            </div>
            
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>
                • You&apos;ll receive: {amount} {selectedMarket.symbol}
              </p>
              <p>
                • Remaining supplied: {
                  formatTokenAmount(
                    selectedPosition.supplyAssets - parseTokenAmount(amount, selectedMarket.decimals),
                    selectedMarket.decimals
                  )
                } {selectedMarket.symbol}
              </p>
              <p>
                • Future earnings will be reduced proportionally
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Health Factor Warning */}
      {selectedPosition && selectedPosition.borrowAssets > BigInt(0) && amount && validation.isValid && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              Health Factor Impact
            </span>
          </div>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            Withdrawing collateral may affect your borrowing position. Monitor your health factor.
          </p>
        </Card>
      )}

      {/* Withdraw Button */}
      <Button
        onClick={handleWithdraw}
        disabled={!validation.isValid || isWithdrawing}
        className="w-full"
        size="lg"
        variant="outline"
      >
        {isWithdrawing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Withdrawing...
          </>
        ) : (
          <>
            <Minus className="w-4 h-4 mr-2" />
            Withdraw {selectedMarket?.symbol || "Assets"}
          </>
        )}
      </Button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Withdrawals are processed immediately</p>
        <p>• You&apos;ll stop earning interest on withdrawn amounts</p>
        <p>• Ensure sufficient collateral for any borrowing positions</p>
      </div>
    </div>
  );
}