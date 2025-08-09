"use client"

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useUserBudgetWallet } from "@/hooks/subgraph-queries/useUserBudgetWallet";
import { useUserBuckets } from "@/hooks/subgraph-queries/getUserBuckets";
import { useSmartAccount } from "@/context/SmartAccountContext";
import { useAllTransactions } from "@/hooks/subgraph-queries/getAllTransactions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useDebouncedValidation } from "@/hooks/useDebouncedValidation";
import { useBucketPayment } from "@/hooks/useBucketPayment";

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



export function QuickSpendBucket({ bucket }: { bucket: UserBucket[] }) {

  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recipientMode, setRecipientMode] = useState<'address' | 'phone'>('address');
  const [paymentType, setPaymentType] = useState<'MOBILE' | 'PAYBILL' | 'BUY_GOODS'>('MOBILE');
  const [mobileNetwork, setMobileNetwork] = useState<'Safaricom' | 'Airtel'>('Safaricom');
  const [selectedBucketName, setSelectedBucketName] = useState('');
  // Use TanStack Query for exchange rate
  const { data: exchangeRate, isLoading: isLoadingRate, error: exchangeRateError } = useExchangeRate('KES');
  
  // Use TanStack Query for phone number validation
  const { 
    isValidating, 
    validationResult, 
    clearValidation 
  } = useDebouncedValidation({
    phoneNumber,
    paymentType,
    mobileNetwork,
    enabled: phoneNumber.length >= 10,
  });

  // Use TanStack Query for bucket payments
  const bucketPayment = useBucketPayment();

  const { smartAccountClient, smartAccountAddress, smartAccountReady } = useSmartAccount();


  const queryAddress = useMemo(() => 
    smartAccountReady && smartAccountAddress ? smartAccountAddress : address,
    [smartAccountReady, smartAccountAddress, address]
  );

  const { data: walletData } = useUserBudgetWallet(queryAddress);
  const { refetch: refetchBuckets } = useUserBuckets(queryAddress);
  const { refetch: refetchTransactions } = useAllTransactions(queryAddress);

  // Use buckets passed from parent instead of fetching again
  const userBuckets: UserBucket[] = bucket || [];
  
  const selectedBucket = userBuckets.find((b: UserBucket) => b.name === selectedBucketName);
  
  const bucketOptions = userBuckets
    .filter((b: UserBucket) => b.active && b.name !== 'UNALLOCATED')
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

    if (!queryAddress) {
      toast.error('User address not found');
      return;
    }

    if (!smartAccountClient) {
      toast.error('Smart account not available');
      return;
    }

    // Use the bucket payment mutation
    try {
      // Convert entered KES to USDC for on-chain spending and validations
      const amountUsdc = exchangeRate ? (parseFloat(amount) / exchangeRate).toFixed(2) : amount;

      const result = await bucketPayment.mutateAsync({
        smartAccountClient,
        walletAddress: walletData.user.walletsCreated[0].wallet as `0x${string}`,
        userAddress: queryAddress as `0x${string}`,
        bucketName: selectedBucketName,
        amount: amountUsdc,
        recipient,
        phoneNumber,
        paymentType,
        mobileNetwork,
        availableBalance: usdcBalance,
        currentSpent,
        monthlyLimit,
        exchangeRate,
      });

      console.log('Bucket spend transaction hash:', result.txHash);

      // Reset form
      setAmount('');
      setRecipient('');
      setPhoneNumber('');
      clearValidation();
      
      // Refetch buckets to update the UI
      setTimeout(() => {
        refetchBuckets();
        refetchTransactions();
      }, 1000); // Delay refetch to avoid rate limiting

    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Bucket payment error:', error);
    }
  };



  // Handle exchange rate errors
  React.useEffect(() => {
    if (exchangeRateError) {
      console.error('Error fetching exchange rate:', exchangeRateError);
    }
  }, [exchangeRateError]);

  // Clear validation when phone number changes significantly
  React.useEffect(() => {
    if (phoneNumber.length < 10) {
      clearValidation();
    }
  }, [phoneNumber]);

  const availableBalance = formatUnits(usdcBalance, 6);
  const currentSpentFormatted = formatUnits(BigInt(currentSpent), 6);
  const monthlyLimitFormatted = formatUnits(BigInt(monthlyLimit), 6);
  const remainingBudget = Math.max(0, parseFloat(monthlyLimitFormatted) - parseFloat(currentSpentFormatted));

  // New: amount is entered in KES. Compute USDC equivalent and KES maximums for UI/validation
  const usdcEquivalent = amount && exchangeRate ? (parseFloat(amount) / exchangeRate).toFixed(2) : null;
  const maxUsdc = Math.min(parseFloat(availableBalance), remainingBudget);
  const maxKesNumber = exchangeRate ? maxUsdc * exchangeRate : undefined;
  const maxKesLabel = typeof maxKesNumber === 'number' && isFinite(maxKesNumber)
    ? maxKesNumber.toFixed(2)
    : '—';

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
            <Label className="pb-2">Recipient</Label>
            <Tabs value={recipientMode} onValueChange={(v) => setRecipientMode(v as 'address' | 'phone')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="address">Wallet Address</TabsTrigger>
                <TabsTrigger value="phone">Phone Number</TabsTrigger>
              </TabsList>
              <TabsContent value="address" className="space-y-2">
                <Input
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                />
                <div className="text-sm text-muted-foreground">
                  Enter the wallet address to send USDC to
                </div>
              </TabsContent>
              <TabsContent value="phone" className="space-y-4">
                <div className="flex justify-between items-center pt-4">
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select value={paymentType} onValueChange={(value: 'MOBILE' | 'PAYBILL' | 'BUY_GOODS') => setPaymentType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MOBILE">Mobile Number</SelectItem>
                      <SelectItem value="PAYBILL">Paybill</SelectItem>
                      <SelectItem value="BUY_GOODS">Buy Goods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Mobile Network</Label>
                  <Select value={mobileNetwork} onValueChange={(value) => setMobileNetwork(value as 'Safaricom' | 'Airtel')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Safaricom">Safaricom</SelectItem>
                      <SelectItem value="Airtel">Airtel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                </div>
                
                {isLoadingRate ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 font-medium">Exchange Rate:</span>
                      <span className="text-gray-600">Loading...</span>
                    </div>
                  </div>
                ) : exchangeRateError ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-red-700 font-medium">Exchange Rate:</span>
                      <span className="text-red-600">Error loading rate</span>
                    </div>
                  </div>
                ) : exchangeRate ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-700 font-medium">Exchange Rate:</span>
                      <span className="text-blue-900">1 USDC = {exchangeRate.toFixed(2)} KES</span>
                    </div>
                    {amount && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-blue-700">You will send:</span>
                        <span className="text-blue-900 font-medium">{parseFloat(amount).toFixed(2)} KES</span>
                      </div>
                    )}
                    {usdcEquivalent && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-blue-700">USDC equivalent:</span>
                        <span className="text-blue-900 font-medium">{usdcEquivalent} USDC</span>
                      </div>
                    )}
                  </div>
                ) : null}
               
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {paymentType === 'MOBILE' ? 'Phone Number' : 
                     paymentType === 'PAYBILL' ? 'Paybill Number' : 'Till Number'}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                      }}
                      placeholder={paymentType === 'MOBILE' ? '0712345678' : 
                                 paymentType === 'PAYBILL' ? '123456' : '890123'}
                    />
                    {isValidating && (
                      <div className="text-sm text-blue-600">
                        Validating number...
                      </div>
                    )}
                  </div>
                  {validationResult && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                     {(validationResult as { data?: { public_name?: string } })?.data?.public_name || 'Valid recipient'}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Enter the {paymentType.toLowerCase()} number to send Kenya Shillings to
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {selectedBucket && (
            <div>
              <Label htmlFor="amount" className="pb-2">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000.00"
                max={maxKesNumber}
                required
              />
              <div className="text-sm text-muted-foreground mt-1">
                Maximum: {maxKesLabel} KES
              </div>
              {usdcEquivalent && (
                <div className="text-sm text-muted-foreground mt-1">
                  Equivalent: {usdcEquivalent} USDC
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button 
              type="submit" 
              disabled={bucketPayment.isProcessing || !amount || (!recipient && !phoneNumber) || !selectedBucketName || !exchangeRate} 
              variant="primary"
            >
              {bucketPayment.isProcessing ? 'Processing...' : recipientMode === 'phone' ? 'Send KES' : 'Send USDC'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}