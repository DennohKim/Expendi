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

// Country configuration
const COUNTRIES = {
  KES: { name: 'Kenya', currency: 'KES', symbol: 'KES' },
  UGX: { name: 'Uganda', currency: 'UGX', symbol: 'UGX' },
  GHS: { name: 'Ghana', currency: 'GHS', symbol: 'GHS' },
  CDF: { name: 'DR Congo', currency: 'CDF', symbol: 'CDF' },
  ETB: { name: 'Ethiopia', currency: 'ETB', symbol: 'ETB' },
} as const;

// Mobile networks by country
const MOBILE_NETWORKS = {
  KES: ['Safaricom', 'Airtel'],
  UGX: ['MTN', 'Airtel'],
  GHS: ['MTN', 'AirtelTigo'],
  CDF: ['Airtel Money', 'Orange Money'],
  ETB: ['Telebirr', 'Cbe Birr'],
} as const;

export function QuickSpendBucket({ bucket }: { bucket: UserBucket[] }) {

  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientMode, setRecipientMode] = useState<'address' | 'cash'>('address');
  const [paymentType, setPaymentType] = useState<'MOBILE' | 'PAYBILL' | 'BUY_GOODS'>('MOBILE');
  const [mobileNetwork, setMobileNetwork] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<'KES' | 'UGX' | 'GHS' | 'CDF' | 'ETB'>('KES');
  const [selectedBucketName, setSelectedBucketName] = useState('');
  // Use TanStack Query for exchange rate
  const { data: exchangeRate, isLoading: isLoadingRate, error: exchangeRateError } = useExchangeRate(selectedCountry);
  
  // Use TanStack Query for phone number validation
  const { 
    isValidating, 
    validationResult, 
    clearValidation 
  } = useDebouncedValidation({
    phoneNumber,
    paymentType,
    mobileNetwork: mobileNetwork || 'Safaricom', // Fallback to avoid empty string
    enabled: phoneNumber.length >= 10 && mobileNetwork !== '',
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
        accountNumber,
        paymentType,
        mobileNetwork,
        selectedCountry,
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
      setAccountNumber('');
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

  // Clear account number when payment type is not PAYBILL
  React.useEffect(() => {
    if (paymentType !== 'PAYBILL') {
      setAccountNumber('');
    }
  }, [paymentType]);

  // Reset relevant fields when country changes
  React.useEffect(() => {
    setPhoneNumber('');
    setAccountNumber('');
    setMobileNetwork('');
    
    // Set default payment type
    setPaymentType('MOBILE');
    
    // Set default mobile network if available
    const networks = MOBILE_NETWORKS[selectedCountry];
    if (networks.length > 0) {
      setMobileNetwork(networks[0] as string);
    }
  }, [selectedCountry]);

  const availableBalance = formatUnits(usdcBalance, 6);
  const currentSpentFormatted = formatUnits(BigInt(currentSpent), 6);
  const monthlyLimitFormatted = formatUnits(BigInt(monthlyLimit), 6);
  const remainingBudget = Math.max(0, parseFloat(monthlyLimitFormatted) - parseFloat(currentSpentFormatted));

  // New: amount is entered in local currency. Compute USDC equivalent and local currency maximums for UI/validation
  const usdcEquivalent = amount && exchangeRate ? (parseFloat(amount) / exchangeRate).toFixed(2) : null;
  const maxUsdc = Math.min(parseFloat(availableBalance), remainingBudget);
  const maxLocalNumber = exchangeRate ? maxUsdc * exchangeRate : undefined;
  const maxLocalLabel = typeof maxLocalNumber === 'number' && isFinite(maxLocalNumber)
    ? maxLocalNumber.toFixed(2)
    : '—';
  
  const currentCountry = COUNTRIES[selectedCountry];
  const availableNetworks = MOBILE_NETWORKS[selectedCountry];

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
            <Tabs value={recipientMode} onValueChange={(v) => setRecipientMode(v as 'address' | 'cash')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="address">Wallet Address</TabsTrigger>
                <TabsTrigger value="cash">Cash</TabsTrigger>
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
              <TabsContent value="cash" className="space-y-3">
                {/* Country Selection - Only for fiat payments */}
                <div>
                  <Label htmlFor="country-select" className="pb-2">Select Country</Label>
                  <Select value={selectedCountry} onValueChange={(value) => setSelectedCountry(value as typeof selectedCountry)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COUNTRIES).map(([code, country]) => (
                        <SelectItem key={code} value={code}>
                          {country.name} ({country.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-between items-center pt-4">
                {/* Payment Type - Only for Kenya */}
                {selectedCountry === 'KES' && (
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
                )}
                
                {/* Mobile Network - For all mobile money countries */}
                {availableNetworks.length > 0 && (
                  <div className="space-y-2">
                    <Label>Mobile Network</Label>
                    <Select value={mobileNetwork} onValueChange={setMobileNetwork}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableNetworks.map((network) => (
                          <SelectItem key={network} value={network}>
                            {network}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
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
                      <span className="text-blue-900">1 USDC = {exchangeRate.toFixed(2)} {currentCountry.currency}</span>
                    </div>
                    {amount && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-blue-700">You will send:</span>
                        <span className="text-blue-900 font-medium">{parseFloat(amount).toFixed(2)} {currentCountry.currency}</span>
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
               
                {/* Phone/Shortcode field - For all mobile money countries */}
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {selectedCountry === 'KES' ? (
                      paymentType === 'MOBILE' ? 'Phone Number' : 
                      paymentType === 'PAYBILL' ? 'Paybill Number' : 'Till Number'
                    ) : 'Phone Number'}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                      }}
                      placeholder={
                        selectedCountry === 'KES' 
                          ? (paymentType === 'MOBILE' ? '0712345678' : 
                             paymentType === 'PAYBILL' ? '123456' : '890123')
                          : '0712345678'
                      }
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
                    Enter the {selectedCountry === 'KES' ? paymentType.toLowerCase() : 'phone'} number to send {currentCountry.currency} to
                  </div>
                </div>
                
                {/* Account Number field - only shown for PAYBILL in Kenya */}
                {selectedCountry === 'KES' && paymentType === 'PAYBILL' && (
                  <div className="space-y-2">
                    <Label htmlFor="paybill-account-number">Account Number</Label>
                    <Input
                      id="paybill-account-number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter account number"
                      required={paymentType === 'PAYBILL'}
                    />
                    <div className="text-sm text-muted-foreground">
                      Enter the account number for this paybill
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          {selectedBucket && (
            <div>
              <Label htmlFor="amount" className="pb-2">Amount ({currentCountry.currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000.00"
                max={maxLocalNumber}
                required
              />
              <div className="text-sm text-muted-foreground mt-1">
                Maximum: {maxLocalLabel} {currentCountry.currency}
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
              disabled={
                bucketPayment.isProcessing || 
                !amount || 
                (!recipient && !phoneNumber) ||
                (selectedCountry === 'KES' && paymentType === 'PAYBILL' && !accountNumber) ||
                !mobileNetwork ||
                !selectedBucketName || 
                !exchangeRate
              } 
              variant="primary"
            >
              {bucketPayment.isProcessing ? 'Processing...' : recipientMode === 'cash' ? `Send ${currentCountry.currency}` : 'Send USDC'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}