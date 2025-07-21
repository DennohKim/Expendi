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
import { BUDGET_WALLET_ABI } from "@/lib/contracts/budget-wallet";
import { getNetworkConfig } from "@/lib/contracts/config";
import { useAllTransactions } from "@/hooks/subgraph-queries/getAllTransactions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  console.log("bucket", bucket);

  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'MOBILE' | 'PAYBILL' | 'BUY_GOODS'>('MOBILE');
  const [mobileNetwork, setMobileNetwork] = useState<'Safaricom' | 'Airtel'>('Safaricom');
  const [isSpending, setIsSpending] = useState(false);
  const [selectedBucketName, setSelectedBucketName] = useState('');
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [, setIsLoadingRate] = useState(false);

  const { smartAccountClient, smartAccountAddress, smartAccountReady } = useSmartAccount();

  // Get network configuration for current chain
  const networkConfig = getNetworkConfig();
  const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;

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

    // Check if either recipient address or phone number is provided
    if (!recipient && !phoneNumber) {
      toast.error('Please enter either a recipient address or phone number');
      return;
    }

    // If recipient address is provided, validate it
    if (recipient && !isAddress(recipient)) {
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

      let txHash: string;
      
      if (phoneNumber) {
        // Mobile payment flow
        const settlementAddress = '0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98';
        
        // First send to settlement address
        txHash = await clientToUse.writeContract({
          address: walletData.user.walletsCreated[0].wallet as `0x${string}`,
          abi: BUDGET_WALLET_ABI,
          functionName: 'spendFromBucket',
          args: [
            queryAddress, // user
            bucketName, // bucketName
            parsedAmount, // amount
            settlementAddress as `0x${string}`, // settlement address
            usdcAddress, // token (USDC)
            '0x' as `0x${string}` // data (empty)
          ],
          account: clientToUse.account,
          chain: clientToUse.chain
        });
        
        // Then initiate mobile payment
        await sendMobilePayment(txHash);
        toast.success(`Successfully initiated mobile payment of ${amount} USDC to ${phoneNumber}!`);
      } else {
        // Regular wallet transfer
        const finalRecipient = recipient;
        
        txHash = await clientToUse.writeContract({
          address: walletData.user.walletsCreated[0].wallet as `0x${string}`,
          abi: BUDGET_WALLET_ABI,
          functionName: 'spendFromBucket',
          args: [
            queryAddress, // user
            bucketName, // bucketName
            parsedAmount, // amount
            finalRecipient as `0x${string}`, // recipient
            usdcAddress, // token (USDC)
            '0x' as `0x${string}` // data (empty)
          ],
          account: clientToUse.account,
          chain: clientToUse.chain
        });
        
        toast.success(`Successfully spent ${amount} USDC from ${bucketName}!`);
      }
      
      console.log('Bucket spend transaction hash:', txHash);

      // Reset form
      setAmount('');
      setRecipient('');
      setPhoneNumber('');
      setValidationResult(null);
      
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

  const validateMobileNumber = React.useCallback(async () => {
    if (!phoneNumber) return;
    
    setIsValidating(true);
    try {
      const response = await fetch('/api/pretium/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: paymentType,
          shortcode: phoneNumber,
          mobile_network: mobileNetwork,
        }),
      });
      
      const result = await response.json();
      if (response.ok) {
        setValidationResult(result);
        toast.success('Mobile number validated successfully');
      } else {
        toast.error(result.error || 'Validation failed');
      }
    } catch {
      toast.error('Failed to validate mobile number');
    } finally {
      setIsValidating(false);
    }
  }, [phoneNumber, paymentType, mobileNetwork]);

  const sendMobilePayment = async (transactionHash: string) => {
    try {
      // Convert USDC amount to KES using exchange rate
      const kesAmount = exchangeRate ? (parseFloat(amount) * exchangeRate).toString() : amount;
      
      const response = await fetch('/api/pretium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_hash: transactionHash,
          amount: kesAmount,
          shortcode: phoneNumber,
          type: paymentType,
          mobile_network: mobileNetwork,
          callback_url: "http://localhost:3000/api/pretium/callback",
          chain: "BASE",
        }),
      });
      
      const result = await response.json();
      if (response.ok) {
        toast.success('Mobile payment initiated successfully');
        return result;
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      toast.error('Failed to process mobile payment');
      throw error;
    }
  };

  const fetchExchangeRate = async () => {
    setIsLoadingRate(true);
    try {
      const response = await fetch('/api/pretium/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency_code: 'KES',
        }),
      });
      
      const result = await response.json();
      if (response.ok && result.data) {
        // Use the buying_rate as it's the rate for converting USDC to KES
        setExchangeRate(result.data.buying_rate);
      } else {
        console.error('Failed to fetch exchange rate:', result.error || 'No exchange rate data');
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    } finally {
      setIsLoadingRate(false);
    }
  };

  // Fetch exchange rate when component mounts (for mobile payments)
  React.useEffect(() => {
    fetchExchangeRate();
  }, []);

  // Auto-validate phone number when complete
  React.useEffect(() => {
    if (phoneNumber && phoneNumber.length >= 10 && !isValidating) {
      // Clear previous validation result
      setValidationResult(null);
      // Add a small delay to avoid too many API calls while typing
      const timeoutId = setTimeout(() => {
        validateMobileNumber();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else if (phoneNumber.length < 10) {
      // Clear validation result if number is incomplete
      setValidationResult(null);
    }
  }, [phoneNumber, isValidating, validateMobileNumber]);

  const availableBalance = formatUnits(usdcBalance, 6);
  const currentSpentFormatted = formatUnits(BigInt(currentSpent), 6);
  const monthlyLimitFormatted = formatUnits(BigInt(monthlyLimit), 6);
  const remainingBudget = Math.max(0, parseFloat(monthlyLimitFormatted) - parseFloat(currentSpentFormatted));

  // Calculate KES amount
  const kesAmount = amount && exchangeRate ? (parseFloat(amount) * exchangeRate).toFixed(2) : null;

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
            <Tabs defaultValue="address" className="w-full">
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
                
                {exchangeRate && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-700 font-medium">Exchange Rate:</span>
                      <span className="text-blue-900">1 USDC = {exchangeRate.toFixed(2)} KES</span>
                    </div>
                    {kesAmount && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-blue-700">You will send:</span>
                        <span className="text-blue-900 font-medium">{kesAmount} KES</span>
                      </div>
                    )}
                  </div>
                )}
               
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
              disabled={isSpending || !amount || (!recipient && !phoneNumber) || !selectedBucketName} 
              variant="primary"
            >
              {isSpending ? 'Spending...' : phoneNumber ? 'Send to Mobile Number' : 'Send USDC'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}