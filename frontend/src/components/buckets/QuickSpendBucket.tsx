"use client"

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseUnits, formatUnits, isAddress } from "viem";
import { useAccount } from "wagmi";
import { useUserBudgetWallet } from "@/hooks/subgraph-queries/useUserBudgetWallet";
import { useUserBuckets } from "@/hooks/subgraph-queries/getUserBuckets";
import { useSmartAccount } from "@/context/SmartAccountContext";
import { MOCK_USDC_ADDRESS, BUDGET_WALLET_ABI } from "@/lib/contracts/budget-wallet";
import { Bucket, useAllTransactions } from "@/hooks/subgraph-queries/getAllTransactions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TokenBalance {
  id: string;
  balance: string;
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface UserBucket {
  id: string;
  name: string;
  balance: string;
  monthlyLimit: string;
  monthlySpent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tokenBalances: TokenBalance[];
}



export function QuickSpendBucket({ bucket }: { bucket: Bucket[] }) {
  console.log("bucket", bucket);

  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isSpending, setIsSpending] = useState(false);
  const [selectedBucketName, setSelectedBucketName] = useState('');

  const { smartAccountClient, smartAccountAddress, smartAccountReady } = useSmartAccount();

  const queryAddress = useMemo(() => 
    smartAccountReady && smartAccountAddress ? smartAccountAddress : address,
    [smartAccountReady, smartAccountAddress, address]
  );

  const { data: walletData } = useUserBudgetWallet(queryAddress);
  const { data: userBucketsData, refetch: refetchBuckets } = useUserBuckets(queryAddress);
  const { refetch: refetchTransactions } = useAllTransactions(queryAddress);

  const userBuckets: UserBucket[] = userBucketsData?.user?.buckets || [];
  
  const selectedBucket = userBuckets.find((b: UserBucket) => b.name === selectedBucketName);
  
  const bucketOptions = userBuckets
    .filter((b: UserBucket) => b.active)
    .map((b: UserBucket) => ({
      value: b.name,
      label: b.name
    }));

  const usdcBalance = selectedBucket?.tokenBalances?.reduce((total, tokenBalance) => {
    const balance = BigInt(tokenBalance.balance);
    return total + balance;
  }, BigInt(0)) || BigInt(0);
  const currentSpent = selectedBucket?.monthlySpent || '0';
  const monthlyLimit = selectedBucket?.monthlyLimit || '0';
  const bucketName = selectedBucket?.name || '';


  const handleSpendFromBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBucketName || !selectedBucket) {
      toast.error('Please select a bucket');
      return;
    }
    
    if (!walletData?.user?.walletsCreated[0].wallet) {
      toast.error('Budget wallet not found');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!recipient || !isAddress(recipient)) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    if (!queryAddress) {
      toast.error('User address not found');
      return;
    }

    // Use smart account client for gas sponsorship
    const clientToUse = smartAccountClient;

    if (!clientToUse?.account) {
      toast.error('Smart account not available');
      return;
    }

    const parsedAmount = parseUnits(amount, 6); // USDC has 6 decimals
    const availableBalance = formatUnits(usdcBalance, 6);
    const currentSpentFormatted = formatUnits(BigInt(currentSpent), 6);
    const monthlyLimitFormatted = formatUnits(BigInt(monthlyLimit), 6);
    const remainingBudget = parseFloat(monthlyLimitFormatted) - parseFloat(currentSpentFormatted);

    // Check if user has enough balance in bucket
    if (parseFloat(amount) > parseFloat(availableBalance)) {
      toast.error(`Insufficient balance in bucket. Available: ${availableBalance} USDC`);
      return;
    }

    // Check if spending would exceed monthly limit
    if (parseFloat(amount) > remainingBudget) {
      toast.error(`Amount exceeds remaining budget. Remaining: ${remainingBudget.toFixed(2)} USDC`);
      return;
    }

    try {
      setIsSpending(true);
      toast.info(`Spending ${amount} USDC from ${bucketName}...`);

      // Use smart account client directly for gas sponsorship
      const txHash = await clientToUse.writeContract({
        address: walletData.user.walletsCreated[0].wallet as `0x${string}`,
        abi: BUDGET_WALLET_ABI,
        functionName: 'spendFromBucket',
        args: [
          queryAddress, // user
          bucketName, // bucketName
          parsedAmount, // amount
          recipient as `0x${string}`, // recipient
          MOCK_USDC_ADDRESS, // token (USDC)
          '0x' as `0x${string}` // data (empty)
        ],
        account: clientToUse.account,
        chain: clientToUse.chain
      });

      toast.success(`Successfully spent ${amount} USDC from ${bucketName}!`);
      console.log('Bucket spend transaction hash:', txHash);

      // Reset form
      setAmount('');
      setRecipient('');
      
      // Refetch buckets to update the UI
      setTimeout(() => {
        refetchBuckets();
        refetchTransactions();
      }, 1000); // Delay refetch to avoid rate limiting

    } catch (error) {
      console.error('Error spending from bucket:', error);
      toast.error('Failed to spend from bucket');
    } finally {
      setIsSpending(false);
    }
  };

  const availableBalance = formatUnits(usdcBalance, 6);
  const currentSpentFormatted = formatUnits(BigInt(currentSpent), 6);
  const monthlyLimitFormatted = formatUnits(BigInt(monthlyLimit), 6);
  const remainingBudget = Math.max(0, parseFloat(monthlyLimitFormatted) - parseFloat(currentSpentFormatted));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Spend from Bucket</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSpendFromBucket} className="space-y-4">
          <div>
            <Label htmlFor="bucket-select" className="pb-2">Select Bucket</Label>
            <Select value={selectedBucketName} onValueChange={setSelectedBucketName}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a bucket to spend from" />
              </SelectTrigger>
              <SelectContent>
                {bucketOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedBucket && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="font-medium">{availableBalance} USDC</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Limit</p>
                <p className="font-medium">{remainingBudget.toFixed(2)} USDC</p>
              </div>
            </div>
          )}
          
          <div>
            <Label htmlFor="recipient" className="pb-2">Recipient Address</Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              required
            />
            <div className="text-sm text-muted-foreground mt-1">
              Enter the wallet address to send USDC to
            </div>
          </div>
          
          {selectedBucket && (
            <div>
              <Label htmlFor="amount" className="pb-2">Amount (USDC)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                max={Math.min(parseFloat(availableBalance), remainingBudget)}
                required
              />
              <div className="text-sm text-muted-foreground mt-1">
                Maximum: {Math.min(parseFloat(availableBalance), remainingBudget).toFixed(2)} USDC
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button 
              type="submit" 
              disabled={isSpending || !amount || !recipient || !selectedBucketName} 
              variant="primary"
            >
              {isSpending ? 'Spending...' : 'Send USDC'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}