'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useSubscription } from '@/hooks/useSubscription';
import { SUBSCRIPTION_CATEGORIES, SUBSCRIPTION_PERIODS } from '@/types/subscription';
import { toast } from 'sonner';

interface SubscriptionFormData {
  name: string;
  description: string;
  category: string;
  amount: string;
  periodInDays: number;
}

interface SubscriptionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const { createSubscription: createOnChain, approveUSDC, isLoading: baseLoading } = useBaseAccount();
  const { createSubscription: saveToDatabase } = useSubscription();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SubscriptionFormData>();

  const watchedAmount = watch('amount');
  const watchedPeriod = watch('periodInDays');

  const calculateMonthlyAmount = () => {
    if (!watchedAmount || !watchedPeriod) return '0.00';
    const monthlyAmount = (parseFloat(watchedAmount) * 30) / watchedPeriod;
    return monthlyAmount.toFixed(2);
  };

  const onSubmit = async (data: SubscriptionFormData) => {
    setIsCreating(true);

    try {
      // Step 1: Create subscription on-chain using Base Account
      toast.info('Creating subscription on Base...');
      
      const ownerAddress = process.env.NEXT_PUBLIC_SUBSCRIPTION_OWNER_ADDRESS;
      if (!ownerAddress) {
        throw new Error('Subscription owner address not configured');
      }

      const subscriptionResult = await createOnChain({
        name: data.name,
        description: data.description,
        category: data.category,
        amount: data.amount,
        periodInDays: data.periodInDays,
        recipient: ownerAddress as `0x${string}`,
      });

      toast.success('Subscription created on Base!');

      // Step 2: Save subscription details to database
      toast.info('Saving subscription details...');
      
      await saveToDatabase({
        subscriptionId: subscriptionResult.subscriptionId,
        payerAddress: '', // This will be filled by the hook from wallet address
        name: data.name,
        description: data.description,
        category: data.category,
        recurringAmount: data.amount,
        periodInDays: data.periodInDays,
        testnet: process.env.NEXT_PUBLIC_RECURRING_PAYMENTS_TESTNET === 'true',
      });

      toast.success('Subscription created successfully!');
      onSuccess?.();

    } catch (error) {
      console.error('Failed to create subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create subscription');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Create New Subscription
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Set up a recurring payment for your regular expenses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Subscription Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Subscription name is required' })}
              placeholder="e.g., Netflix Premium"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={watch('category')}
              onValueChange={(value) => setValue('category', value)}
            >
              <option value="">Select a category</option>
              {SUBSCRIPTION_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            {errors.category && (
              <p className="text-sm text-red-600 mt-1">Category is required</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            {...register('description')}
            placeholder="Optional description"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Amount (USDC) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0.01, message: 'Amount must be at least 0.01 USDC' },
              })}
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="period">Billing Period *</Label>
            <Select
              value={watch('periodInDays')?.toString()}
              onValueChange={(value) => setValue('periodInDays', parseInt(value))}
            >
              <option value="">Select period</option>
              {SUBSCRIPTION_PERIODS.map((period) => (
                <option key={period.days} value={period.days}>
                  {period.label} ({period.days} days)
                </option>
              ))}
            </Select>
            {errors.periodInDays && (
              <p className="text-sm text-red-600 mt-1">Period is required</p>
            )}
          </div>
        </div>

        {watchedAmount && watchedPeriod && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Estimated Monthly Cost
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${calculateMonthlyAmount()} USDC
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ${watchedAmount} every {watchedPeriod} days
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Important Notes:
          </h4>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• You'll need to approve USDC spending for this subscription</li>
            <li>• Charges will be automatically processed every billing period</li>
            <li>• You can pause or cancel the subscription at any time</li>
            <li>• Make sure you have sufficient USDC balance for charges</li>
          </ul>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isCreating || baseLoading}
            className="flex-1"
          >
            {isCreating ? 'Creating Subscription...' : 'Create Subscription'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};