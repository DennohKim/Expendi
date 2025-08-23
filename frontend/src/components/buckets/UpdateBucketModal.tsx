"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { parseUnits, formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useUserBudgetWallet } from "@/hooks/subgraph-queries/useUserBudgetWallet";
import { useUserBuckets } from "@/hooks/subgraph-queries/getUserBuckets";
import { useSmartAccount } from "@/context/SmartAccountContext";
import { useAnalytics } from "@/hooks/useAnalytics";

interface Bucket {
  id: string;
  name: string;
  balance: string;
  monthlyLimit: string;
  monthlySpent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UpdateBucketModalProps {
  bucket: Bucket;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function UpdateBucketModal({ bucket, isOpen, onOpenChange, trigger }: UpdateBucketModalProps) {
  const { address } = useAccount();
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { smartAccountClient, smartAccountAddress, smartAccountReady } = useSmartAccount();
  const { track } = useAnalytics();
  
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : address;
  const { refetch: refetchBuckets } = useUserBuckets(queryAddress);
  const { data: walletData, refetch } = useUserBudgetWallet(queryAddress);

  // Initialize form with current bucket values
  useEffect(() => {
    if (bucket) {
      const limitInTokens = parseFloat(bucket.monthlyLimit) / 1e6;
      setMonthlyLimit(limitInTokens.toString());
    }
  }, [bucket]);

  const handleUpdateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletData?.user?.walletsCreated[0].wallet) {
      toast.error('Budget wallet not found');
      return;
    }

    const clientToUse = smartAccountClient;

    if (!clientToUse?.account) {
      toast.error('Smart account not available');
      return;
    }

    try {
      setIsUpdating(true);
      toast.info('Updating bucket...');

      track('bucket_update_started', {
        bucket_name: bucket.name,
        new_monthly_limit: parseFloat(monthlyLimit),
        wallet_address: walletData.user.walletsCreated[0].wallet
      });

      const limitInUsdc = parseUnits(monthlyLimit, 6); // USDC has 6 decimals

      // Use smart account client for gas sponsorship - always set active to true
      const finalTxHash = await clientToUse.writeContract({
        address: walletData.user.walletsCreated[0].wallet as `0x${string}`,
        abi: (await import('@/lib/contracts/budget-wallet')).BUDGET_WALLET_ABI,
        functionName: 'updateBucket',
        args: [bucket.name, limitInUsdc, true],
        account: clientToUse.account,
        chain: clientToUse.chain
      });

      track('bucket_updated_successfully', {
        bucket_name: bucket.name,
        new_monthly_limit: parseFloat(monthlyLimit),
        transaction_hash: finalTxHash,
        wallet_address: walletData.user.walletsCreated[0].wallet
      });

      toast.success('Bucket updated successfully!');
      console.log('Bucket updated with transaction hash:', finalTxHash);

      // Close modal
      onOpenChange(false);
      
      // Refetch data to update the UI
      setTimeout(() => {
        refetchBuckets();
        refetch();
      }, 1000);

    } catch (error) {
      track('bucket_update_failed', {
        bucket_name: bucket.name,
        new_monthly_limit: parseFloat(monthlyLimit),
        error: error instanceof Error ? error.message : 'Unknown error',
        wallet_address: walletData.user.walletsCreated[0].wallet
      });
      
      console.error('Error updating bucket:', error);
      toast.error('Failed to update bucket');
    } finally {
      setIsUpdating(false);
    }
  };

  const content = (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Update Bucket: {bucket.name}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleUpdateBucket} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="monthlyLimit">Monthly Limit (USDC)</Label>
          <Input
            id="monthlyLimit"
            type="number"
            step="0.01"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            placeholder="100.00"
            required
          />
          <p className="text-sm text-muted-foreground">
            Current limit: {formatUnits(BigInt(bucket.monthlyLimit || '0'), 6)} USDC
          </p>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isUpdating} variant="primary">
            {isUpdating ? 'Updating...' : 'Update Bucket'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {content}
    </Dialog>
  );
}