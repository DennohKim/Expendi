"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QuickSpendBucket } from "@/components/buckets/QuickSpendBucket";
import { PaymentStatusModal } from "@/components/modals/PaymentStatusModal";
import { useAccount } from "wagmi";
import { useSmartAccount } from "@/context/SmartAccountContext";

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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [lastTransactionCode, setLastTransactionCode] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('KES');
  
  const { address } = useAccount();
  const { smartAccountReady, smartAccountAddress } = useSmartAccount();
  
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : address;

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

  // Callback to handle payment status modal from QuickSpendBucket
  const handlePaymentStatus = (transactionCode: string, country: string) => {
    setLastTransactionCode(transactionCode);
    setSelectedCountry(country);
    setIsStatusModalOpen(true);
  };

  return (
    <>
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
          
          {/* Use QuickSpendBucket without Card wrapper and pass payment status callback */}
          <QuickSpendBucket 
            bucket={[bucket]} 
            showWrapper={false}
            onPaymentStatus={handlePaymentStatus}
            showPaymentStatusModal={false}
          />
        </DialogContent>
      </Dialog>
      
      {/* Payment Status Modal - rendered at the same level as the main dialog */}
      <PaymentStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        transactionCode={lastTransactionCode}
        currency={selectedCountry}
        bucketName={bucketName}
        userAddress={queryAddress}
      />
    </>
  );
}