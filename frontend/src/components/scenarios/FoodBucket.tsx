import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCreateBucket } from '@/hooks/bucket-manager/useCreateBucket';
import { useFundBucket } from '@/hooks/bucket-manager/useFundBucket';
import { useOneTimePayment } from '@/hooks/bucket-manager/useOneTimePayment';
import { useBucketInfo } from '@/hooks/bucket-manager/useBucketInfo';
import { useDepositTokens } from '@/hooks/bucket-manager/useDepositTokens';

export function FoodBucket() {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('25');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [setupStep, setSetupStep] = useState<'create' | 'fund' | 'ready'>('create');

  const bucketName = 'Food Expenses';
  const monthlyLimit = '500'; // Higher limit for food expenses

  const createBucket = useCreateBucket();
  const depositTokens = useDepositTokens();
  const fundBucket = useFundBucket();
  const makePayment = useOneTimePayment();
  
  const { data: bucketInfo, isLoading: loadingBucketInfo } = useBucketInfo(bucketName);

  // Check if bucket exists
  const bucketExists = bucketInfo?.active;
  const hasFunds = bucketInfo && parseFloat(bucketInfo.balance) > 0;

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
        amount: '200' // Initial funding amount
      });
      
      // Then fund the bucket
      await fundBucket.mutateAsync({
        bucketName,
        amount: '200'
      });
      setSetupStep('ready');
    } catch (error) {
      console.error('Error funding bucket:', error);
    }
  };

  const handleMakePayment = async () => {
    if (!recipientAddress || !paymentAmount) {
      alert('Please enter recipient address and payment amount');
      return;
    }

    if (parseFloat(paymentAmount) > parseFloat(bucketInfo?.balance || '0')) {
      alert('Insufficient bucket balance for this payment');
      return;
    }

    try {
      await makePayment.mutateAsync({
        bucketName,
        amount: paymentAmount,
        recipient: recipientAddress,
        description: paymentDescription || `Food payment of ${paymentAmount} USDC`
      });
      
      // Reset form
      setRecipientAddress('');
      setPaymentAmount('25');
      setPaymentDescription('');
    } catch (error) {
      console.error('Error making payment:', error);
    }
  };

  const getSpendingProgress = () => {
    if (!bucketInfo) return 0;
    const spent = parseFloat(bucketInfo.monthlySpent);
    const limit = parseFloat(bucketInfo.monthlyLimit);
    return (spent / limit) * 100;
  };

  const getRemainingBudget = () => {
    if (!bucketInfo) return '0';
    const spent = parseFloat(bucketInfo.monthlySpent);
    const limit = parseFloat(bucketInfo.monthlyLimit);
    return (limit - spent).toFixed(2);
  };

  if (loadingBucketInfo) {
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
          <h2 className="text-2xl font-bold">Food Expenses Bucket</h2>
          <p className="text-gray-600">Make one-time payments for food and dining expenses</p>
        </div>
        {bucketExists && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Active Bucket
          </Badge>
        )}
      </div>

      {/* Bucket Status */}
      {bucketExists && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Food Budget Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-600">Available Balance: </span>
              <span className="font-medium text-green-600">{bucketInfo.balance} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Monthly Spent: </span>
              <span className="font-medium">{bucketInfo.monthlySpent} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Monthly Budget: </span>
              <span className="font-medium">{bucketInfo.monthlyLimit} USDC</span>
            </div>
            <div>
              <span className="text-gray-600">Remaining Budget: </span>
              <span className="font-medium text-blue-600">{getRemainingBudget()} USDC</span>
            </div>
          </div>

          {/* Spending Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Monthly Spending Progress</span>
              <span>{getSpendingProgress().toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  getSpendingProgress() > 80 ? 'bg-red-500' : 
                  getSpendingProgress() > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(getSpendingProgress(), 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Budget Warnings */}
          {getSpendingProgress() > 80 && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              ⚠️ You've used {getSpendingProgress().toFixed(1)}% of your monthly food budget
            </div>
          )}
        </div>
      )}

      {/* Setup Steps */}
      {!bucketExists && (
        <div className="space-y-4">
          <h3 className="font-semibold">Setup Food Expenses Bucket</h3>
          
          {/* Step 1: Create Bucket */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">1</span>
              <span className="font-medium">Create Food Expenses Bucket</span>
            </div>
            <p className="text-sm text-gray-600 ml-8">
              Create a bucket for food expenses with a {monthlyLimit} USDC monthly spending limit
            </p>
            <div className="ml-8">
              <Button 
                onClick={handleCreateBucket}
                disabled={createBucket.isPending}
                className="w-full sm:w-auto"
              >
                {createBucket.isPending ? 'Creating...' : 'Create Food Bucket'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fund Bucket */}
      {bucketExists && setupStep === 'fund' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-medium">2</span>
            <span className="font-medium">Fund Your Food Bucket</span>
          </div>
          <p className="text-sm text-gray-600 ml-8">
            Add USDC to your food bucket for making payments
          </p>
          <div className="ml-8">
            <Button 
              onClick={handleFundBucket}
              disabled={fundBucket.isPending || depositTokens.isPending}
              className="w-full sm:w-auto"
            >
              {(fundBucket.isPending || depositTokens.isPending) ? 'Funding...' : 'Fund with 200 USDC'}
            </Button>
          </div>
        </div>
      )}

      {/* Make Payment Section */}
      {bucketExists && hasFunds && (
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold">Make Food Payment</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="food-recipient">Recipient Address</Label>
                <Input
                  id="food-recipient"
                  placeholder="0x... (Restaurant, delivery service, etc.)"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="food-amount">Payment Amount (USDC)</Label>
                <Input
                  id="food-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1"
                  max={bucketInfo?.balance}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Available: {bucketInfo?.balance} USDC
                </div>
              </div>
              
              <div>
                <Label htmlFor="food-description">Description (Optional)</Label>
                <Input
                  id="food-description"
                  placeholder="e.g., Lunch at restaurant, grocery shopping..."
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Payment Preview</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">{paymentAmount} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>From Bucket:</span>
                  <span>{bucketName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span>{(parseFloat(bucketInfo?.balance || '0') - parseFloat(paymentAmount || '0')).toFixed(2)} USDC</span>
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleMakePayment}
            disabled={
              makePayment.isPending || 
              !recipientAddress || 
              !paymentAmount ||
              parseFloat(paymentAmount) > parseFloat(bucketInfo?.balance || '0')
            }
            className="w-full"
          >
            {makePayment.isPending ? 'Processing Payment...' : `Send ${paymentAmount} USDC`}
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      {bucketExists && hasFunds && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Quick Payment Amounts</h4>
          <div className="flex gap-2 flex-wrap">
            {['10', '25', '50', '100'].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(amount)}
                disabled={parseFloat(amount) > parseFloat(bucketInfo?.balance || '0')}
                className="text-xs"
              >
                ${amount}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Add More Funds Button */}
      {bucketExists && parseFloat(bucketInfo?.balance || '0') < 50 && (
        <div className="text-center py-4">
          <div className="text-orange-600 text-sm mb-2">
            Low balance detected
          </div>
          <Button
            variant="outline"
            onClick={() => setSetupStep('fund')}
            size="sm"
          >
            Add More Funds
          </Button>
        </div>
      )}
    </Card>
  );
}