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

export function WeeklyLabContribution() {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [contributionAmount, setContributionAmount] = useState('10');
  const [setupStep, setSetupStep] = useState<'create' | 'fund' | 'subscribe' | 'complete'>('create');

  const bucketName = 'Weekly Lab Contribution';
  const monthlyLimit = '50'; // 10 USDC × ~5 weeks per month

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
        amount: '50' // Deposit enough for multiple payments
      });
      
      // Then fund the bucket
      await fundBucket.mutateAsync({
        bucketName,
        amount: '50'
      });
      setSetupStep('subscribe');
    } catch (error) {
      console.error('Error funding bucket:', error);
    }
  };

  const handleCreateSubscription = async () => {
    if (!recipientAddress) {
      alert('Please enter the lab recipient address');
      return;
    }

    try {
      await createSubscription.mutateAsync({
        bucketName,
        amount: contributionAmount,
        periodInDays: 7, // Weekly
        recipient: recipientAddress,
        metadata: 'Weekly lab contribution payment',
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
          <h2 className="text-2xl font-bold">Weekly Lab Contribution</h2>
          <p className="text-gray-600">Automate your {contributionAmount} USDC weekly lab contributions</p>
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
          <h3 className="font-semibold mb-2">Bucket Status</h3>
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
        </div>
      )}

      {/* Active Subscription Details */}
      {activeSubscription && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Active Subscription</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Amount: </span>
              <span className="font-medium">{activeSubscription.amount} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Next Payment: </span>
              <span className="font-medium">{formatDate(activeSubscription.nextChargeTimestamp)}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Paid: </span>
              <span className="font-medium">{activeSubscription.totalCharged} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Payment Count: </span>
              <span className="font-medium">{activeSubscription.chargeCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Setup Steps */}
      {!activeSubscription && (
        <div className="space-y-4">
          <h3 className="font-semibold">Setup Weekly Contribution</h3>
          
          {/* Step 1: Create Bucket */}
          {!bucketExists && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">1</span>
                <span className="font-medium">Create Lab Contribution Bucket</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Create a dedicated bucket for lab contributions with a {monthlyLimit} USDC monthly limit
              </p>
              <div className="ml-8">
                <Button 
                  onClick={handleCreateBucket}
                  disabled={createBucket.isPending}
                  className="w-full sm:w-auto"
                >
                  {createBucket.isPending ? 'Creating...' : 'Create Bucket'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Fund Bucket */}
          {bucketExists && setupStep === 'fund' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">2</span>
                <span className="font-medium">Fund Your Bucket</span>
              </div>
              <p className="text-sm text-gray-600 ml-8">
                Deposit USDC to fund your weekly contributions
              </p>
              <div className="ml-8">
                <Button 
                  onClick={handleFundBucket}
                  disabled={fundBucket.isPending || depositTokens.isPending}
                  className="w-full sm:w-auto"
                >
                  {(fundBucket.isPending || depositTokens.isPending) ? 'Funding...' : 'Fund with 50 USDC'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Create Subscription */}
          {bucketExists && (setupStep === 'subscribe' || (parseFloat(bucketInfo?.balance || '0') > 0 && !activeSubscription)) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">3</span>
                <span className="font-medium">Setup Weekly Subscription</span>
              </div>
              <div className="ml-8 space-y-3">
                <div>
                  <Label htmlFor="recipient">Lab Recipient Address</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Weekly Contribution Amount (USDC)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleCreateSubscription}
                  disabled={createSubscription.isPending || !recipientAddress}
                  className="w-full sm:w-auto"
                >
                  {createSubscription.isPending ? 'Creating...' : 'Create Weekly Subscription'}
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
            ✓ Weekly Lab Contribution Active!
          </div>
          <p className="text-gray-600">
            Your {activeSubscription.amount} USDC contribution will be automatically sent every week.
          </p>
        </div>
      )}
    </Card>
  );
}