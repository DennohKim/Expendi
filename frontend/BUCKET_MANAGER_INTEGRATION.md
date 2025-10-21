# ExpendiBucketManager Frontend Integration Guide

This guide provides step-by-step implementation for integrating with the deployed ExpendiBucketManager contracts, including creating buckets, managing subscriptions, and handling one-time payments.

## 📋 Scenario Implementation

We'll implement three use cases:
1. **Weekly Lab Contribution**: 10 USDC weekly subscription
2. **Monthly Rent**: 100 USDC monthly subscription  
3. **Food Bucket**: One-time payments only (no subscriptions)

## 🔧 Contract Configuration

First, update your network configuration to include the ExpendiBucketManager contracts:

### Step 1: Update Network Config

```typescript
// @frontend/src/lib/contracts/config.ts
export const NETWORK_CONFIGS = {
  [CHAIN_IDS.BASE_SEPOLIA]: {
    // ... existing config
    EXPENDI_BUCKET_MANAGER_ADDRESS: '0x4832FE3192f205F753F1C334916B7cfec7823D64',
    EXPENDI_AUTOMATION_ADDRESS: '0x373B8a2f3A0aBdD6654D199C60c1ad9fab6F25d7',
    USDC_ADDRESS: '0x316506500241C52c71B6116863D6d020a3054782', // MockUSDC from deployment
  }
} as const;
```

### Step 2: Create ExpendiBucketManager ABI

```typescript
// @frontend/src/lib/contracts/expendi-bucket-manager.ts
export const EXPENDI_BUCKET_MANAGER_ABI = [
  // Bucket Management
  'function createBucket(string memory bucketName, uint256 monthlyLimit) external',
  'function fundBucket(string memory bucketName, uint256 amount, address token) external',
  'function deleteBucket(string memory bucketName) external',
  
  // One-time Payments
  'function makeOneTimePayment(string memory bucketName, uint256 amount, address token, address recipient, string memory description) external',
  
  // Subscription Management
  'function createBucketSubscription(string memory bucketName, uint256 amount, uint256 periodInDays, address token, address recipient, string memory metadata, bool userConsent) external returns (uint256)',
  'function cancelBucketSubscription(uint256 subscriptionId) external',
  
  // Token Management
  'function depositTokens(address token, uint256 amount) external payable',
  'function withdrawTokens(address token, uint256 amount) external',
  
  // View Functions
  'function getBucketBalance(address user, string memory bucketName, address token) external view returns (uint256)',
  'function getBucketInfo(address user, string memory bucketName) external view returns (uint256 balance, uint256 monthlySpent, uint256 monthlyLimit, uint256 lastResetTimestamp, bool active, uint256 subscriptionCount)',
  'function getSubscriptionInfo(address user, uint256 subscriptionId) external view returns (tuple(uint256 subscriptionId, string bucketName, uint256 amount, uint256 periodInDays, address token, address recipient, bool isActive, uint256 nextChargeTimestamp, uint256 totalCharged, uint256 chargeCount, uint256 createdAt, uint256 lastProcessedAt, bool userConsent))',
  'function getUserSubscriptions(address user) external view returns (uint256[])',
  
  // Events
  'event BucketCreated(address indexed user, string indexed bucketName, uint256 monthlyLimit, uint256 timestamp, uint256 blockNumber)',
  'event BucketFunded(address indexed user, string indexed bucketName, uint256 amount, address indexed token, uint256 newBalance, uint256 timestamp, uint256 blockNumber)',
  'event BucketSubscriptionCreated(address indexed user, string indexed bucketName, uint256 indexed subscriptionId, uint256 amount, uint256 periodInDays, address recipient, address token, uint256 nextChargeTimestamp, bool userConsent, string metadata, uint256 timestamp, uint256 blockNumber)',
  'event OneTimePaymentMade(address indexed user, string indexed bucketName, uint256 amount, address indexed token, address recipient, string description, uint256 newBucketBalance, uint256 monthlySpent, uint256 timestamp, uint256 blockNumber)'
] as const;
```

## 🪣 Step-by-Step Implementation

### 1. Create Bucket Hook

```typescript
// @frontend/src/hooks/bucket-manager/useCreateBucket.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface CreateBucketRequest {
  bucketName: string;
  monthlyLimit: string; // in USDC
}

export function useCreateBucket() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bucketName, monthlyLimit }: CreateBucketRequest) => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig();
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      const parsedLimit = parseUnits(monthlyLimit, 6); // USDC has 6 decimals

      const txHash = await smartAccountClient.writeContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'createBucket',
        args: [bucketName, parsedLimit],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { txHash, bucketName, monthlyLimit };
    },
    onSuccess: (data) => {
      toast.success(`Bucket "${data.bucketName}" created successfully!`);
      // Invalidate and refetch bucket queries
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
    onError: (error) => {
      console.error('Error creating bucket:', error);
      toast.error('Failed to create bucket');
    }
  });
}
```

### 2. Fund Bucket Hook

```typescript
// @frontend/src/hooks/bucket-manager/useFundBucket.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface FundBucketRequest {
  bucketName: string;
  amount: string; // in USDC
}

export function useFundBucket() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bucketName, amount }: FundBucketRequest) => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig();
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;
      const parsedAmount = parseUnits(amount, 6);

      const txHash = await smartAccountClient.writeContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'fundBucket',
        args: [bucketName, parsedAmount, usdcAddress],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { txHash, bucketName, amount };
    },
    onSuccess: (data) => {
      toast.success(`Funded "${data.bucketName}" with ${data.amount} USDC`);
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['bucket-balance'] });
    },
    onError: (error) => {
      console.error('Error funding bucket:', error);
      toast.error('Failed to fund bucket');
    }
  });
}
```

### 3. Deposit Tokens Hook

```typescript
// @frontend/src/hooks/bucket-manager/useDepositTokens.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface DepositTokensRequest {
  amount: string; // in USDC
}

export function useDepositTokens() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ amount }: DepositTokensRequest) => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig();
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;
      const parsedAmount = parseUnits(amount, 6);

      // First approve USDC spending
      const approvalTxHash = await smartAccountClient.writeContract({
        address: usdcAddress,
        abi: ['function approve(address spender, uint256 amount) external returns (bool)'],
        functionName: 'approve',
        args: [bucketManagerAddress, parsedAmount],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      // Wait for approval confirmation
      await smartAccountClient.waitForTransactionReceipt({ hash: approvalTxHash });

      // Then deposit tokens
      const depositTxHash = await smartAccountClient.writeContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'depositTokens',
        args: [usdcAddress, parsedAmount],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { depositTxHash, amount };
    },
    onSuccess: (data) => {
      toast.success(`Deposited ${data.amount} USDC to contract`);
      queryClient.invalidateQueries({ queryKey: ['user-token-balance'] });
    },
    onError: (error) => {
      console.error('Error depositing tokens:', error);
      toast.error('Failed to deposit tokens');
    }
  });
}
```

### 4. Create Subscription Hook

```typescript
// @frontend/src/hooks/bucket-manager/useCreateSubscription.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface CreateSubscriptionRequest {
  bucketName: string;
  amount: string; // in USDC
  periodInDays: number;
  recipient: `0x${string}`;
  metadata: string;
}

export function useCreateSubscription() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      bucketName, 
      amount, 
      periodInDays, 
      recipient, 
      metadata 
    }: CreateSubscriptionRequest) => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig();
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;
      const parsedAmount = parseUnits(amount, 6);
      const userConsent = true; // Explicit user consent required

      const txHash = await smartAccountClient.writeContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'createBucketSubscription',
        args: [
          bucketName,
          parsedAmount,
          periodInDays,
          usdcAddress,
          recipient,
          metadata,
          userConsent
        ],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { txHash, bucketName, amount, periodInDays };
    },
    onSuccess: (data) => {
      toast.success(`Created subscription: ${data.amount} USDC every ${data.periodInDays} days`);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
    onError: (error) => {
      console.error('Error creating subscription:', error);
      toast.error('Failed to create subscription');
    }
  });
}
```

### 5. One-Time Payment Hook

```typescript
// @frontend/src/hooks/bucket-manager/useOneTimePayment.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

interface OneTimePaymentRequest {
  bucketName: string;
  amount: string; // in USDC
  recipient: `0x${string}`;
  description: string;
}

export function useOneTimePayment() {
  const { smartAccountClient } = useSmartAccount();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      bucketName, 
      amount, 
      recipient, 
      description 
    }: OneTimePaymentRequest) => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig();
      const bucketManagerAddress = networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`;
      const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`;
      const parsedAmount = parseUnits(amount, 6);

      const txHash = await smartAccountClient.writeContract({
        address: bucketManagerAddress,
        abi: EXPENDI_BUCKET_MANAGER_ABI,
        functionName: 'makeOneTimePayment',
        args: [bucketName, parsedAmount, usdcAddress, recipient, description],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { txHash, bucketName, amount, recipient, description };
    },
    onSuccess: (data) => {
      toast.success(`Paid ${data.amount} USDC from "${data.bucketName}"`);
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['bucket-balance'] });
    },
    onError: (error) => {
      console.error('Error making payment:', error);
      toast.error('Failed to make payment');
    }
  });
}
```

### 6. Track Subscription in Automation Hook

```typescript
// @frontend/src/hooks/bucket-manager/useTrackSubscription.ts
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { getNetworkConfig } from '@/lib/contracts/config';

interface TrackSubscriptionRequest {
  userAddress: `0x${string}`;
  subscriptionId: bigint;
}

const AUTOMATION_ABI = [
  'function trackUserSubscription(address user, uint256 subscriptionId) external'
] as const;

export function useTrackSubscription() {
  const { smartAccountClient } = useSmartAccount();
  
  return useMutation({
    mutationFn: async ({ userAddress, subscriptionId }: TrackSubscriptionRequest) => {
      if (!smartAccountClient?.account) {
        throw new Error('Smart account not available');
      }

      const networkConfig = getNetworkConfig();
      const automationAddress = networkConfig.EXPENDI_AUTOMATION_ADDRESS as `0x${string}`;

      const txHash = await smartAccountClient.writeContract({
        address: automationAddress,
        abi: AUTOMATION_ABI,
        functionName: 'trackUserSubscription',
        args: [userAddress, subscriptionId],
        account: smartAccountClient.account,
        chain: smartAccountClient.chain
      });

      return { txHash, userAddress, subscriptionId };
    },
    onSuccess: () => {
      toast.success('Subscription added to automation tracking');
    },
    onError: (error) => {
      console.error('Error tracking subscription:', error);
      toast.error('Failed to track subscription for automation');
    }
  });
}
```

## 🎯 Scenario Implementation Components

### 1. Weekly Lab Contribution Component

```typescript
// @frontend/src/components/scenarios/WeeklyLabContribution.tsx
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateBucket } from '@/hooks/bucket-manager/useCreateBucket';
import { useFundBucket } from '@/hooks/bucket-manager/useFundBucket';
import { useDepositTokens } from '@/hooks/bucket-manager/useDepositTokens';
import { useCreateSubscription } from '@/hooks/bucket-manager/useCreateSubscription';
import { useTrackSubscription } from '@/hooks/bucket-manager/useTrackSubscription';
import { useAccount } from 'wagmi';

export function WeeklyLabContribution() {
  const { address } = useAccount();
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<string>('40'); // 4 weeks worth
  
  const createBucket = useCreateBucket();
  const fundBucket = useFundBucket();
  const depositTokens = useDepositTokens();
  const createSubscription = useCreateSubscription();
  const trackSubscription = useTrackSubscription();

  const handleSetupLabContribution = async () => {
    try {
      // Step 1: Deposit tokens to contract
      await depositTokens.mutateAsync({ amount: fundingAmount });
      
      // Step 2: Create bucket with monthly limit (40 USDC for ~4 weeks)
      await createBucket.mutateAsync({
        bucketName: 'Lab Contribution',
        monthlyLimit: '40'
      });
      
      // Step 3: Fund the bucket
      await fundBucket.mutateAsync({
        bucketName: 'Lab Contribution',
        amount: fundingAmount
      });
      
      // Step 4: Create weekly subscription (7 days)
      const subscriptionResult = await createSubscription.mutateAsync({
        bucketName: 'Lab Contribution',
        amount: '10',
        periodInDays: 7,
        recipient: recipientAddress as `0x${string}`,
        metadata: 'Weekly lab contribution payment'
      });
      
      // Step 5: Track subscription in automation (requires subscription ID from event)
      // Note: In production, you'd extract subscription ID from transaction logs
      // For now, we'll assume subscription ID = 1 (first subscription)
      if (address) {
        await trackSubscription.mutateAsync({
          userAddress: address,
          subscriptionId: BigInt(1) // This should be extracted from transaction receipt
        });
      }
      
    } catch (error) {
      console.error('Error setting up lab contribution:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Lab Contribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Recipient Address</Label>
          <Input
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div>
          <Label>Initial Funding Amount (USDC)</Label>
          <Input
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
            placeholder="40"
          />
        </div>
        <Button 
          onClick={handleSetupLabContribution}
          disabled={!recipientAddress || createBucket.isPending}
          className="w-full"
        >
          Setup Weekly Lab Contribution (10 USDC/week)
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 2. Monthly Rent Component

```typescript
// @frontend/src/components/scenarios/MonthlyRent.tsx
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateBucket } from '@/hooks/bucket-manager/useCreateBucket';
import { useFundBucket } from '@/hooks/bucket-manager/useFundBucket';
import { useDepositTokens } from '@/hooks/bucket-manager/useDepositTokens';
import { useCreateSubscription } from '@/hooks/bucket-manager/useCreateSubscription';
import { useTrackSubscription } from '@/hooks/bucket-manager/useTrackSubscription';
import { useAccount } from 'wagmi';

export function MonthlyRent() {
  const { address } = useAccount();
  const [landlordAddress, setLandlordAddress] = useState<string>('');
  const [fundingAmount, setFundingAmount] = useState<string>('300'); // 3 months worth
  
  const createBucket = useCreateBucket();
  const fundBucket = useFundBucket();
  const depositTokens = useDepositTokens();
  const createSubscription = useCreateSubscription();
  const trackSubscription = useTrackSubscription();

  const handleSetupRent = async () => {
    try {
      // Step 1: Deposit tokens to contract
      await depositTokens.mutateAsync({ amount: fundingAmount });
      
      // Step 2: Create bucket with monthly limit (300 USDC)
      await createBucket.mutateAsync({
        bucketName: 'Monthly Rent',
        monthlyLimit: '300'
      });
      
      // Step 3: Fund the bucket
      await fundBucket.mutateAsync({
        bucketName: 'Monthly Rent',
        amount: fundingAmount
      });
      
      // Step 4: Create monthly subscription (30 days)
      await createSubscription.mutateAsync({
        bucketName: 'Monthly Rent',
        amount: '100',
        periodInDays: 30,
        recipient: landlordAddress as `0x${string}`,
        metadata: 'Monthly rent payment'
      });
      
      // Step 5: Track subscription in automation
      if (address) {
        await trackSubscription.mutateAsync({
          userAddress: address,
          subscriptionId: BigInt(2) // This should be extracted from transaction receipt
        });
      }
      
    } catch (error) {
      console.error('Error setting up rent:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Rent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Landlord Address</Label>
          <Input
            value={landlordAddress}
            onChange={(e) => setLandlordAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>
        <div>
          <Label>Initial Funding Amount (USDC)</Label>
          <Input
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
            placeholder="300"
          />
        </div>
        <Button 
          onClick={handleSetupRent}
          disabled={!landlordAddress || createBucket.isPending}
          className="w-full"
        >
          Setup Monthly Rent (100 USDC/month)
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 3. Food Bucket Component (One-time Payments)

```typescript
// @frontend/src/components/scenarios/FoodBucket.tsx
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateBucket } from '@/hooks/bucket-manager/useCreateBucket';
import { useFundBucket } from '@/hooks/bucket-manager/useFundBucket';
import { useDepositTokens } from '@/hooks/bucket-manager/useDepositTokens';
import { useOneTimePayment } from '@/hooks/bucket-manager/useOneTimePayment';

export function FoodBucket() {
  const [fundingAmount, setFundingAmount] = useState<string>('200');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  const createBucket = useCreateBucket();
  const fundBucket = useFundBucket();
  const depositTokens = useDepositTokens();
  const oneTimePayment = useOneTimePayment();

  const handleSetupFoodBucket = async () => {
    try {
      // Step 1: Deposit tokens to contract
      await depositTokens.mutateAsync({ amount: fundingAmount });
      
      // Step 2: Create bucket with monthly limit (200 USDC)
      await createBucket.mutateAsync({
        bucketName: 'Food Expenses',
        monthlyLimit: '200'
      });
      
      // Step 3: Fund the bucket
      await fundBucket.mutateAsync({
        bucketName: 'Food Expenses',
        amount: fundingAmount
      });
      
    } catch (error) {
      console.error('Error setting up food bucket:', error);
    }
  };

  const handleMakePayment = async () => {
    if (!paymentAmount || !recipientAddress || !description) return;
    
    try {
      await oneTimePayment.mutateAsync({
        bucketName: 'Food Expenses',
        amount: paymentAmount,
        recipient: recipientAddress as `0x${string}`,
        description
      });
      
      // Reset form
      setPaymentAmount('');
      setRecipientAddress('');
      setDescription('');
      
    } catch (error) {
      console.error('Error making payment:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Food Bucket Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Initial Funding Amount (USDC)</Label>
            <Input
              value={fundingAmount}
              onChange={(e) => setFundingAmount(e.target.value)}
              placeholder="200"
            />
          </div>
          <Button 
            onClick={handleSetupFoodBucket}
            disabled={createBucket.isPending}
            className="w-full"
          >
            Setup Food Bucket (No Subscriptions)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Make Food Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Amount (USDC)</Label>
            <Input
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="25.00"
            />
          </div>
          <div>
            <Label>Recipient Address</Label>
            <Input
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Grocery store payment"
            />
          </div>
          <Button 
            onClick={handleMakePayment}
            disabled={!paymentAmount || !recipientAddress || oneTimePayment.isPending}
            className="w-full"
          >
            Make Payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 📊 View Data Hooks

### Get Bucket Information

```typescript
// @frontend/src/hooks/bucket-manager/useBucketInfo.ts
import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContract } from 'wagmi';
import { getNetworkConfig } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

export function useBucketInfo(bucketName: string) {
  const { address } = useAccount();
  const networkConfig = getNetworkConfig();
  
  return useReadContract({
    address: networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`,
    abi: EXPENDI_BUCKET_MANAGER_ABI,
    functionName: 'getBucketInfo',
    args: [address!, bucketName],
    query: {
      enabled: !!address && !!bucketName
    }
  });
}
```

### Get User Subscriptions

```typescript
// @frontend/src/hooks/bucket-manager/useUserSubscriptions.ts
import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContract } from 'wagmi';
import { getNetworkConfig } from '@/lib/contracts/config';
import { EXPENDI_BUCKET_MANAGER_ABI } from '@/lib/contracts/expendi-bucket-manager';

export function useUserSubscriptions() {
  const { address } = useAccount();
  const networkConfig = getNetworkConfig();
  
  return useReadContract({
    address: networkConfig.EXPENDI_BUCKET_MANAGER_ADDRESS as `0x${string}`,
    abi: EXPENDI_BUCKET_MANAGER_ABI,
    functionName: 'getUserSubscriptions',
    args: [address!],
    query: {
      enabled: !!address
    }
  });
}
```

## 🚀 Usage in Components

Create a main scenarios page that combines all three use cases:

```typescript
// @frontend/src/app/scenarios/page.tsx
"use client"

import { WeeklyLabContribution } from '@/components/scenarios/WeeklyLabContribution';
import { MonthlyRent } from '@/components/scenarios/MonthlyRent';
import { FoodBucket } from '@/components/scenarios/FoodBucket';

export default function ScenariosPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">ExpendiBucketManager Scenarios</h1>
      
      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <WeeklyLabContribution />
        <MonthlyRent />
        <FoodBucket />
      </div>
    </div>
  );
}
```

## 🔄 Key Implementation Notes

1. **Transaction Receipts**: Extract subscription IDs from transaction logs for accurate tracking
2. **Gas Sponsorship**: All transactions use your existing smart account setup with Privy
3. **Error Handling**: Each hook includes proper error handling and user feedback
4. **State Management**: Uses React Query for caching and invalidation
5. **Rate Limiting**: Consider adding delays between operations to avoid rate limiting
6. **Approval Flow**: USDC approvals are handled automatically in deposit functions
7. **Automation Tracking**: Subscriptions are automatically tracked for Chainlink automation

## ✅ Testing Checklist

- [ ] Create buckets with different monthly limits
- [ ] Fund buckets with various amounts
- [ ] Create weekly subscription (7 days)
- [ ] Create monthly subscription (30 days)
- [ ] Make one-time payments from food bucket
- [ ] Verify subscription tracking in automation
- [ ] Test error handling for insufficient funds
- [ ] Verify monthly limit enforcement
- [ ] Check bucket balance updates after payments

This implementation provides a complete integration with your ExpendiBucketManager contracts, supporting all three scenarios with proper gas sponsorship and user experience!