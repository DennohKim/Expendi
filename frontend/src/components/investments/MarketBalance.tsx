"use client";

import React from "react";
import { useBalance } from "wagmi";
import { formatTokenAmount } from "@/lib/morpho/utils";
import { getTokenAddress } from "@/lib/morpho/config";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { Wallet } from "lucide-react";
import type { MorphoMarket } from "@/lib/morpho/types";
import { base } from "viem/chains";

interface MarketBalanceProps {
  market: MorphoMarket;
  chainId?: number;
}

export default function MarketBalance({ market, chainId = base.id }: MarketBalanceProps) {
  const { walletAddress, isConnected } = useWalletAddress();
  
  // Get token address for the market's loan token
  const tokenAddress = getTokenAddress(chainId, market.symbol);
  
  const { data: balance, isLoading } = useBalance({
    address: walletAddress,
    token: tokenAddress,
    query: {
      enabled: isConnected && !!tokenAddress && !!walletAddress,
    },
  });

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <Wallet className="w-4 h-4" />
        <span className="text-sm">Connect wallet</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Wallet className="w-4 h-4 text-gray-400" />
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <Wallet className="w-4 h-4" />
        <span className="text-sm">0.00 {market.symbol}</span>
      </div>
    );
  }

  const hasBalance = balance.value > BigInt(0);

  return (
    <div className={`flex items-center space-x-2 ${hasBalance ? 'text-green-600' : 'text-gray-400'}`}>
      <Wallet className="w-4 h-4" />
      <span className="text-sm font-medium">
        {formatTokenAmount(balance.value, balance.decimals)} {balance.symbol}
      </span>
    </div>
  );
}