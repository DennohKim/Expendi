"use client";

import React from "react";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Shield, Info } from "lucide-react";

export default function SmartAccountInfo() {
  const { walletAddress, eoaAddress, smartAccountAddress, smartAccountReady } = useWalletAddress();

  if (!walletAddress) {
    return null;
  }

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <div className="flex items-start space-x-3">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              Smart Account Active
            </h4>
            <Badge variant={smartAccountReady ? "default" : "secondary"}>
              {smartAccountReady ? "Ready" : "Initializing"}
            </Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 dark:text-blue-300">
                Active Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
            </div>
            
            {smartAccountAddress && (
              <div className="text-blue-600 dark:text-blue-400 text-xs">
                Smart Account: {smartAccountAddress.slice(0, 6)}...{smartAccountAddress.slice(-4)}
              </div>
            )}
            
            {eoaAddress && (
              <div className="text-blue-600 dark:text-blue-400 text-xs">
                EOA: {eoaAddress.slice(0, 6)}...{eoaAddress.slice(-4)}
              </div>
            )}
          </div>
          
          <div className="flex items-start space-x-2 mt-3 p-2 bg-blue-100 dark:bg-blue-900 rounded">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Balances shown are from your {smartAccountAddress ? 'smart account (budget wallet)' : 'connected wallet'}. 
              All investments will be made using this wallet.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}