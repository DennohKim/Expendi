'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateTimePicker24h } from '@/components/ui/date-time-picker-24h';
import { toast } from 'sonner';
import { Loader2, CheckCircle, DollarSign, Calendar, Tag, User } from 'lucide-react';

// Simple form data interface
interface SubscriptionFormData {
  name: string;
  description: string;
  category: string;
  amount: string;
  periodInDays: number;
  recipientAddress: string;
}

const SUBSCRIPTION_CATEGORIES = [
  'General',
  'Software',
  'Media',
  'Utilities',
  'Food',
  'Entertainment',
  'Business',
  'Other'
] as const;

const SUBSCRIPTION_PERIODS = [
  { label: 'One-time Payment', days: 0 },
  { label: 'Weekly', days: 7 },
  { label: 'Monthly', days: 30 },
  { label: 'Quarterly', days: 90 },
  { label: 'Yearly', days: 365 },
] as const;

interface CreateSubscriptionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateSubscriptionForm: React.FC<CreateSubscriptionFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { address, isConnected } = useAccount();
  const [isCreating, setIsCreating] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | undefined>();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<SubscriptionFormData>({
    defaultValues: {
      description: '',
      category: 'General',
      periodInDays: 30,
      recipientAddress: process.env.NEXT_PUBLIC_SUBSCRIPTION_RECIPIENT_ADDRESS || '',
    },
  });

  const watchedPeriod = watch('periodInDays');
  
  React.useEffect(() => {
    const isCustom = Number(watchedPeriod) === 0;
    console.log('useEffect - watchedPeriod:', watchedPeriod, 'isCustom:', isCustom, 'showCustomDate will be:', isCustom);
    setShowCustomDate(isCustom);
    
    if (!isCustom) {
      console.log('Resetting selectedDateTime because not custom period');
      setSelectedDateTime(undefined);
    }
  }, [watchedPeriod]);

  const ensureUserExists = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const chainName = process.env.NEXT_PUBLIC_NETWORK_NAME?.toLowerCase() || 'base';
    
    try {
      // Try to create/sync the user first
      await fetch(`${apiUrl}/api/sync/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address?.toLowerCase(),
          chainName: chainName,
        }),
      });
    } catch (error) {
      console.log('User sync failed, but will proceed with subscription creation:', error);
    }
  };

  const createSubscriptionViaAPI = async (subscriptionData: any) => {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
    // Format user ID as expected by backend: ${chainName}:${walletAddress}
    const chainName = process.env.NEXT_PUBLIC_NETWORK_NAME?.toLowerCase() || 'base';
    const userId = `${chainName}:${address?.toLowerCase()}`;
    
    console.log('=== SUBSCRIPTION API DEBUG ===');
    console.log('apiUrl:', apiUrl);
    console.log('chainName:', chainName);
    console.log('address:', address);
    console.log('userId (header):', userId);
    console.log('subscriptionData:', subscriptionData);
    console.log('===============================');
    
    const response = await fetch(`${apiUrl}/api/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API Error Response:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const handleCreateSubscription = async (data: SubscriptionFormData) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsCreating(true);

      // Debug: Log all form data
      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Raw form data:', data);
      console.log('data.periodInDays:', data.periodInDays, 'type:', typeof data.periodInDays);
      console.log('watchedPeriod:', watchedPeriod, 'type:', typeof watchedPeriod);
      console.log('showCustomDate:', showCustomDate);
      console.log('selectedDateTime:', selectedDateTime);
      console.log('================================');

      // Validate amount
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (amount > 10000) {
        throw new Error('Amount cannot exceed 10,000 USDC (daily limit)');
      }

      // Validate custom date if needed (only for one-time payments)
      const periodInDays = Number(data.periodInDays);
      console.log('Converted periodInDays:', periodInDays, 'is zero?', periodInDays === 0);
      console.log('showCustomDate state:', showCustomDate);
      
      // Use both the form data AND the UI state to determine if we need a custom date
      const isOneTimePayment = periodInDays === 0 || showCustomDate;
      console.log('isOneTimePayment:', isOneTimePayment);
      
      if (isOneTimePayment) {
        console.log('One-time payment detected, checking for selectedDateTime...');
        if (!selectedDateTime) {
          console.log('ERROR: selectedDateTime is null/undefined for one-time payment');
          throw new Error('Please select a custom billing date and time');
        }
        
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        
        if (selectedDateTime <= fiveMinutesFromNow) {
          throw new Error('Custom billing date must be at least 5 minutes in the future');
        }
        console.log('Custom date validation passed');
      } else {
        console.log('Recurring payment detected, skipping date validation');
      }

      // Validate recipient address
      if (!data.recipientAddress || data.recipientAddress.length !== 42 || !data.recipientAddress.startsWith('0x')) {
        throw new Error('Please enter a valid recipient address');
      }

      toast.info('Creating subscription...');
      
      // Ensure user exists in database before creating subscription
      await ensureUserExists();
      
      const subscriptionPayload = {
        subscriptionId: `sub_${Date.now()}_${address?.slice(-6)}`, // Generate unique subscription ID
        payerAddress: address,
        name: data.name.trim(),
        description: data.description?.trim() || '',
        category: data.category,
        recurringAmount: data.amount,
        periodInDays: periodInDays,
        ...(periodInDays === 0 && selectedDateTime && {
          customBillingDate: selectedDateTime.toISOString(),
        }),
        testnet: false, // Set to true if using testnet
        chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'), // Add chainId for user creation
      };
      
      console.log('Creating subscription with payload:', subscriptionPayload);
      
      const result = await createSubscriptionViaAPI(subscriptionPayload);
      
      if (result.success) {
        toast.success('Subscription created successfully!');
        
        // Reset form
        reset();
        setSelectedDateTime(undefined);
        
        // Call success callback after a short delay
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else {
        throw new Error(result.error || 'Failed to create subscription');
      }

    } catch (error: any) {
      console.error('Failed to create subscription:', error);
      toast.error(error.message || 'Failed to create subscription');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Create Subscription
          </CardTitle>
          <CardDescription>
            Please connect your wallet to create subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Connect your wallet to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Create Subscription
        </CardTitle>
        <CardDescription>
          Set up a new subscription payment
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(handleCreateSubscription)} className="space-y-6">
          {/* Subscription Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Subscription Name
            </Label>
            <Input
              id="name"
              {...register('name', { 
                required: 'Subscription name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 100, message: 'Name must be less than 100 characters' }
              })}
              placeholder="e.g., Netflix Monthly, Office Rent"
              disabled={isCreating}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Amount (USDC)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max="10000"
              {...register('amount', { 
                required: 'Amount is required',
                min: { value: 0.01, message: 'Minimum amount is 0.01 USDC' },
                max: { value: 10000, message: 'Maximum amount is 10,000 USDC' }
              })}
              placeholder="10.00"
              disabled={isCreating}
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Daily limit: 10,000 USDC per user
            </p>
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <Label htmlFor="recipientAddress" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Recipient Address
            </Label>
            <Input
              id="recipientAddress"
              {...register('recipientAddress', { 
                required: 'Recipient address is required',
                pattern: {
                  value: /^0x[a-fA-F0-9]{40}$/,
                  message: 'Please enter a valid Ethereum address'
                }
              })}
              placeholder="0x..."
              disabled={isCreating}
            />
            {errors.recipientAddress && (
              <p className="text-sm text-red-600">{errors.recipientAddress.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={watch('category')}
              onValueChange={(value) => setValue('category', value)}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Period */}
          <div className="space-y-2">
            <Label htmlFor="period" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Billing Period
            </Label>
            <Select
              value={watch('periodInDays')?.toString()}
              onValueChange={(value) => setValue('periodInDays', parseInt(value))}
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select billing period" />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_PERIODS.map((period) => (
                  <SelectItem key={period.days} value={period.days.toString()}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Picker */}
          {showCustomDate && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Custom Payment Date & Time *
              </Label>
              
              <DateTimePicker24h
                value={selectedDateTime}
                onChange={(date) => {
                  console.log('DateTimePicker24h onChange called with:', date);
                  setSelectedDateTime(date);
                }}
                disabled={isCreating}
                minDate={new Date(Date.now() + 5 * 60 * 1000)} // 5 minutes from now
                maxDate={new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)} // 2 years from now
                required={true}
              />
              
              <p className="text-xs text-muted-foreground">
                Select when you want the payment to be processed (must be at least 5 minutes in the future)
              </p>
              
              {!selectedDateTime && (
                <p className="text-xs text-red-600">
                  ⚠️ Please select a date and time for your one-time payment
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Additional details about this subscription"
              disabled={isCreating}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <Button 
              type="submit" 
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Subscription
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};