"use client"

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseUnits, decodeErrorResult } from "viem";
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


  const getErrorMessage = (error: unknown): string => {
    // Type guard to check if error has expected properties
    const hasStringProperty = (obj: unknown, prop: string): obj is Record<string, string> => {
      return typeof obj === 'object' && obj !== null && prop in obj && typeof (obj as Record<string, unknown>)[prop] === 'string';
    };

    // Check for insufficient unallocated tokens error
    if (hasStringProperty(error, 'message') && error.message.includes('Insufficient unallocated tokens') || 
        hasStringProperty(error, 'details') && error.details.includes('Insufficient unallocated tokens')) {
      return `Insufficient funds in unallocated budget. You have ${formatBalance(unallocatedBalance)} USDC available, but trying to fund ${amount} USDC.`;
    }

    // Check for hex error in UserOperationExecutionError
    if (hasStringProperty(error, 'details') && error.details.includes('0x08c379a0')) {
      try {
        // Extract hex error from the details
        const hexMatch = error.details.match(/0x08c379a0[a-fA-F0-9]+/);
        if (hexMatch) {
          const decoded = decodeErrorResult({
            abi: BUDGET_WALLET_ABI,
            data: hexMatch[0] as `0x${string}`
          });
          
          if (decoded.errorName === 'Error' && 
              Array.isArray(decoded.args) && 
              decoded.args.length > 0 && 
              typeof decoded.args[0] === 'string' && 
              decoded.args[0].includes('Insufficient unallocated tokens')) {
            return `Insufficient funds in unallocated budget. You have ${formatBalance(unallocatedBalance)} USDC available, but trying to fund ${amount} USDC.`;
          }
        }
      } catch (decodeError) {
        console.error('Error decoding contract error:', decodeError);
      }
    }

    // Generic contract error
    if (hasStringProperty(error, 'message') && 
        (error.message.includes('execution reverted') || error.message.includes('UserOperation reverted'))) {
      return 'Transaction failed. Please check your balance and try again.';
    }

    return 'Failed to fund bucket. Please try again.';
  };

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

    const parsedAmount = parseUnits(amount, 6);
    
    // Check if user has sufficient unallocated balance
    if (parsedAmount > unallocatedBalance) {
      toast.error(`Insufficient funds in unallocated budget. You have ${formatBalance(unallocatedBalance)} USDC available, but trying to fund ${amount} USDC.`);
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
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
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
            <Button variant="primary" type="submit" disabled={isFunding || !amount}>
              {isFunding ? 'Funding...' : 'Fund with USDC'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}