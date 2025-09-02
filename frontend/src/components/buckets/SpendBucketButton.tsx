"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QuickSpendBucket } from "@/components/buckets/QuickSpendBucket";

interface SpendBucketButtonProps {
  bucketName: string;
  currentSpent: bigint;
  monthlyLimit: bigint;
  usdcBalance: bigint;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

export function SpendBucketButton({ 
  bucketName, 
  currentSpent, 
  monthlyLimit, 
  usdcBalance,
  size = "sm", 
  variant = "outline",
  className
}: SpendBucketButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Create a bucket object compatible with QuickSpendBucket
  const bucket = {
    id: bucketName,
    name: bucketName,
    balance: '0', // Not used by QuickSpendBucket
    monthlyLimit: monthlyLimit.toString(),
    monthlySpent: currentSpent.toString(),
    active: true,
    createdAt: '0',
    updatedAt: '0',
    tokenBalances: [
      {
        id: 'usdc',
        balance: usdcBalance.toString(),
        token: {
          id: 'usdc',
          name: 'USDC',
          symbol: 'USDC',
          decimals: 6,
        },
      },
    ],
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button data-tour="spend-from-bucket" variant={variant} size={size} className={className}>
          <Send />
          Spend
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" id="spend-dialog">
        <DialogHeader>
          <DialogTitle>Spend from Bucket: {bucketName}</DialogTitle>
        </DialogHeader>
        
        {/* Use QuickSpendBucket without Card wrapper */}
        <QuickSpendBucket bucket={[bucket]} showWrapper={false} />
      </DialogContent>
    </Dialog>
  );
}