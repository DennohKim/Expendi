import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCreateBucket } from '@/hooks/bucket-manager/useCreateBucket';
import { useFundBucket } from '@/hooks/bucket-manager/useFundBucket';
import { useCreateSubscription } from '@/hooks/bucket-manager/useCreateSubscription';
import { useBucketInfo } from '@/hooks/bucket-manager/useBucketInfo';
import { useUserSubscriptions } from '@/hooks/bucket-manager/useUserSubscriptions';
import { useDepositTokens } from '@/hooks/bucket-manager/useDepositTokens';

export function MonthlyRent() {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [rentAmount, setRentAmount] = useState('100');
  const [setupStep, setSetupStep] = useState<'create' | 'fund' | 'subscribe' | 'complete'>('create');

  const bucketName = 'Monthly Rent';
  const monthlyLimit = '120'; // 100 USDC + 20% buffer

  const createBucket = useCreateBucket();
  const depositTokens = useDepositTokens();
  const fundBucket = useFundBucket();
  const createSubscription = useCreateSubscription();
  
  const { data: bucketInfo, isLoading: loadingBucketInfo } = useBucketInfo(bucketName);
  const { data: subscriptions, isLoading: loadingSubscriptions } = useUserSubscriptions();

  // Check if bucket exists and subscription is active
  const bucketExists = bucketInfo?.active;
  const activeSubscription = subscriptions?.find(
    sub => sub.bucketName === bucketName && sub.isActive
  );

  const handleCreateBucket = async () => {
    try {
      await createBucket.mutateAsync({
        bucketName,
        monthlyLimit
      });
      setSetupStep('fund');
    } catch (error) {
      console.error('Error creating bucket:', error);
    }
  };

  const handleFundBucket = async () => {
    try {
      // First deposit tokens to contract
      await depositTokens.mutateAsync({
        amount: '300' // Deposit enough for 3 months
      });
      
      // Then fund the bucket
      await fundBucket.mutateAsync({
        bucketName,
        amount: '300'
      });
      setSetupStep('subscribe');
    } catch (error) {
      console.error('Error funding bucket:', error);
    }
  };

  const handleCreateSubscription = async () => {
    if (!recipientAddress) {
      alert('Please enter the landlord recipient address');
      return;
    }

    try {
      await createSubscription.mutateAsync({
        bucketName,
        amount: rentAmount,
        periodInDays: 30, // Monthly
        recipient: recipientAddress,
        metadata: 'Monthly rent payment',
        userConsent: true
      });
      setSetupStep('complete');
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getDaysUntilNextPayment = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = timestamp - now;
    return Math.ceil(diff / (24 * 60 * 60));
  };

  if (loadingBucketInfo || loadingSubscriptions) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monthly Rent Payment</h2>
          <p className="text-gray-600">Automate your {rentAmount} USDC monthly rent payments</p>
        </div>
        {activeSubscription && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Active Subscription
          </Badge>
        )}
      </div>

      {/* Bucket Status */}
      {bucketExists && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Rent Bucket Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Balance: </span>
              <span className="font-medium">{bucketInfo.balance} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Monthly Spent: </span>
              <span className="font-medium">{bucketInfo.monthlySpent} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Monthly Limit: </span>
              <span className="font-medium">{bucketInfo.monthlyLimit} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Subscriptions: </span>
              <span className="font-medium">{bucketInfo.subscriptionCount}</span>
            </div>
          </div>
          
          {/* Balance Warning */}
          {parseFloat(bucketInfo.balance) < parseFloat(rentAmount) && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              ⚠️ Low balance: Add more funds to ensure next payment goes through
            </div>
          )}
        </div>
      )}

      {/* Active Subscription Details */}
      {activeSubscription && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Rent Subscription Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Rent Amount: </span>
              <span className="font-medium">{activeSubscription.amount} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Next Payment: </span>
              <span className="font-medium">
                {formatDate(activeSubscription.nextChargeTimestamp)}
                <span className="text-gray-500 ml-1">
                  ({getDaysUntilNextPayment(activeSubscription.nextChargeTimestamp)} days)
                </span>
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Rent Paid: </span>
              <span className="font-medium">{activeSubscription.totalCharged} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Months Paid: </span>
              <span className="font-medium">{activeSubscription.chargeCount}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            <div>Landlord: {activeSubscription.recipient}</div>
            <div>Created: {formatDate(activeSubscription.createdAt)}</div>
          </div>
        </div>
      )}

      {/* Setup Steps */}
      {!activeSubscription && (
        <div className="space-y-4">
          <h3 className="font-semibold">Setup Monthly Rent Payment</h3>
          
          {/* Step 1: Create Bucket */}
          {!bucketExists && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">1</span>
                <span className="font-medium">Create Rent Payment Bucket</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Create a dedicated bucket for rent payments with a {monthlyLimit} USDC monthly limit
              </p>
              <div className="ml-8">
                <Button 
                  onClick={handleCreateBucket}
                  disabled={createBucket.isPending}
                  className="w-full sm:w-auto"
                >
                  {createBucket.isPending ? 'Creating...' : 'Create Rent Bucket'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Fund Bucket */}
          {bucketExists && setupStep === 'fund' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">2</span>
                <span className="font-medium">Fund Your Rent Bucket</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Deposit USDC to cover multiple months of rent payments
              </p>
              <div className="ml-8">
                <Button 
                  onClick={handleFundBucket}
                  disabled={fundBucket.isPending || depositTokens.isPending}
                  className="w-full sm:w-auto"
                >
                  {(fundBucket.isPending || depositTokens.isPending) ? 'Funding...' : 'Fund with 300 USDC (3 months)'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Create Subscription */}
          {bucketExists && (setupStep === 'subscribe' || (parseFloat(bucketInfo?.balance || '0') > 0 && !activeSubscription)) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">3</span>
                <span className="font-medium">Setup Monthly Rent Subscription</span>
              </div>
              <div className="ml-8 space-y-3">
                <div>
                  <Label htmlFor="landlord">Landlord Address</Label>
                  <Input
                    id="landlord"
                    placeholder="0x... (Your landlord's wallet address)"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="rent-amount">Monthly Rent Amount (USDC)</Label>
                  <Input
                    id="rent-amount"
                    type="number"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800">
                  <strong>Important:</strong> Make sure your landlord's wallet address is correct. 
                  Payments will be automatically sent every 30 days.
                </div>
                <Button 
                  onClick={handleCreateSubscription}
                  disabled={createSubscription.isPending || !recipientAddress}
                  className="w-full sm:w-auto"
                >
                  {createSubscription.isPending ? 'Creating...' : 'Create Monthly Rent Subscription'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {activeSubscription && (
        <div className="text-center py-4">
          <div className="text-green-600 text-lg font-semibold mb-2">
            ✓ Monthly Rent Payment Active!
          </div>
          <p className="text-gray-600">
            Your {activeSubscription.amount} USDC rent will be automatically sent every month.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Next payment in {getDaysUntilNextPayment(activeSubscription.nextChargeTimestamp)} days
          </p>
        </div>
      )}

      {/* Quick Actions */}
      {activeSubscription && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Quick Actions</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSetupStep('fund')}
            >
              Add More Funds
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-gray-400"
            >
              Pause Subscription (Coming Soon)
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}