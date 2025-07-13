"use client"

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseUnits, formatUnits, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useUserBudgetWallet } from "@/hooks/contract-queries/getUserBudgetWallet";
import { useUserBuckets } from "@/hooks/contract-queries/useUserBuckets";
import { useSmartAccount } from "@/context/SmartAccountContext";
import { createBudgetWalletUtils, MOCK_USDC_ADDRESS, ETH_ADDRESS, BUDGET_WALLET_ABI } from "@/lib/contracts/budget-wallet";

interface FundBucketButtonProps {
  bucketName: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
}

export function FundBucketButton({ bucketName, size = "sm", variant = "outline" }: FundBucketButtonProps) {
  const { address } = useAccount();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [tokenType, setTokenType] = useState<'ETH' | 'USDC'>('ETH');
  const [isFunding, setIsFunding] = useState(false);
  const { data: walletData } = useUserBudgetWallet();
  const { refetch: refetchBuckets } = useUserBuckets();
  const { smartAccountClient, smartAccountAddress, smartAccountReady } = useSmartAccount();

  const queryAddress = useMemo(() => 
    smartAccountReady && smartAccountAddress ? smartAccountAddress : address,
    [smartAccountReady, smartAccountAddress, address]
  );

  // Get user's current balances - only when dialog is open
  const { data: ethBalance } = useBalance({
    address: queryAddress,
    query: {
      enabled: isDialogOpen && !!queryAddress,
    }
  });
  
  const { data: usdcBalance } = useBalance({
    address: queryAddress,
    token: MOCK_USDC_ADDRESS,
    query: {
      enabled: isDialogOpen && !!queryAddress,
    }
  });

  const handleFundBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletData?.address) {
      toast.error('Budget wallet not found');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Use smart account client for gas sponsorship
    const clientToUse = smartAccountClient;

    if (!clientToUse?.account) {
      toast.error('Smart account not available');
      return;
    }

    try {
      setIsFunding(true);
      toast.info(`Funding bucket with ${amount} ${tokenType}...`);

      const walletUtils = createBudgetWalletUtils(walletData.address as `0x${string}`);
      
      let parsedAmount: bigint;
      let tokenAddress: `0x${string}`;
      
      if (tokenType === 'ETH') {
        parsedAmount = parseEther(amount);
        tokenAddress = ETH_ADDRESS;
      } else {
        parsedAmount = parseUnits(amount, 6); // USDC has 6 decimals
        tokenAddress = MOCK_USDC_ADDRESS;
      }

      // Use smart account client directly for gas sponsorship
      const txHash = await clientToUse.writeContract({
        address: walletData.address as `0x${string}`,
        abi: BUDGET_WALLET_ABI,
        functionName: 'fundBucket',
        args: [bucketName, parsedAmount, tokenAddress],
        account: clientToUse.account,
        chain: clientToUse.chain
      });

      toast.success(`Successfully funded bucket with ${amount} ${tokenType}!`);
      console.log('Bucket funded with transaction hash:', txHash);

      // Reset form and close dialog
      setAmount('');
      setIsDialogOpen(false);
      
      // Refetch buckets to update the UI
      setTimeout(() => {
        refetchBuckets();
      }, 1000); // Delay refetch to avoid rate limiting

    } catch (error) {
      console.error('Error funding bucket:', error);
      toast.error('Failed to fund bucket');
    } finally {
      setIsFunding(false);
    }
  };

  const currentBalance = tokenType === 'ETH' ? ethBalance : usdcBalance;
  const balanceFormatted = currentBalance 
    ? (tokenType === 'ETH' 
        ? formatUnits(currentBalance.value, 18) 
        : formatUnits(currentBalance.value, 6))
    : '0.00';

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Wallet />
          Fund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fund Bucket: {bucketName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleFundBucket} className="space-y-4">
          <div>
            <Label htmlFor="tokenType" className="pb-2">Token Type</Label>
            <select
              id="tokenType"
              value={tokenType}
              onChange={(e) => setTokenType(e.target.value as 'ETH' | 'USDC')}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="amount" className="pb-2">Amount ({tokenType})</Label>
            <Input
              id="amount"
              type="number"
              step={tokenType === 'ETH' ? '0.000001' : '0.01'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={tokenType === 'ETH' ? '0.001' : '10.00'}
              required
            />
            <div className="text-sm text-muted-foreground mt-1">
              Your current balance: {balanceFormatted} {tokenType}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isFunding || !amount}>
              {isFunding ? 'Funding...' : `Fund with ${tokenType}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}