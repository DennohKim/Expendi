"use client"

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useUserBudgetWallet } from "@/hooks/subgraph-queries/useUserBudgetWallet";
import { useUserBuckets } from "@/hooks/subgraph-queries/getUserBuckets";
import { useSmartAccount } from "@/context/SmartAccountContext";
import { BUDGET_WALLET_ABI } from "@/lib/contracts/budget-wallet";
import { getNetworkConfig } from "@/lib/contracts/config";
import { formatBalance } from "@/lib/utils";
import { useAllTransactions } from "@/hooks/subgraph-queries/getAllTransactions";

interface TokenBalance {
  balance: string;
}


interface FundBucketButtonProps {
  bucketName: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
}

export function FundBucketButton({ bucketName, size = "sm", variant = "outline" }: FundBucketButtonProps) {
  const { address } = useAccount();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [tokenType] = useState<'USDC'>('USDC');
  const [isFunding, setIsFunding] = useState(false);

  const { smartAccountClient, smartAccountAddress, smartAccountReady } = useSmartAccount();

  // Get network configuration for current chain
  const networkConfig = getNetworkConfig();
  const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;

  const queryAddress = useMemo(() => 
    smartAccountReady && smartAccountAddress ? smartAccountAddress : address,
    [smartAccountReady, smartAccountAddress, address]
  );
  const { data: walletData, refetch: refetchWalletData } = useUserBudgetWallet(queryAddress);
  const { refetch: refetchBuckets } = useUserBuckets(queryAddress);
  const { refetch: refetchTransactions } = useAllTransactions(queryAddress);

   // Calculate unallocated balance directly from UNALLOCATED bucket
   const userData = walletData?.user;
   console.log("User data:", userData)
   
   // Calculate unallocated balance from UNALLOCATED bucket
   const unallocatedBalance = userData?.buckets?.find((bucket: { name: string }) => bucket.name === 'UNALLOCATED')?.tokenBalances?.reduce((sum: bigint, tokenBalance: TokenBalance) => {
     return sum + BigInt(tokenBalance.balance || '0');
   }, BigInt(0)) || BigInt(0);


  const handleFundBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletData?.user?.walletsCreated[0].wallet) {
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

      const parsedAmount = parseUnits(amount, 6); // USDC has 6 decimals
      const tokenAddress = usdcAddress;

      // Use smart account client directly for gas sponsorship
      const txHash = await clientToUse.writeContract({
        address: walletData.user.walletsCreated[0].wallet as `0x${string}`,
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
        refetchWalletData();
        refetchTransactions();
      }, 1000); // Delay refetch to avoid rate limiting

    } catch (error) {
      console.error('Error funding bucket:', error);
      toast.error('Failed to fund bucket');
    } finally {
      setIsFunding(false);
    }
  };


  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button data-tour="fund-bucket" variant={variant} size={size}>
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
            <Label htmlFor="amount" className="pb-2">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              required
            />
            <div className="text-sm text-muted-foreground mt-1">
              Unallocated Budget wallet balance: {formatBalance(unallocatedBalance)} USDC
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isFunding || !amount}>
              {isFunding ? 'Funding...' : 'Fund with USDC'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}