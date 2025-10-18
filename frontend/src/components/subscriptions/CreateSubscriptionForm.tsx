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
import { Calendar24 } from '@/components/ui/calendar24';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle, DollarSign, Calendar, Tag } from 'lucide-react';

interface SubscriptionFormData {
  name: string;
  description: string;
  category: string;
  amount: string;
  periodInDays: number;
}

interface CreateSubscriptionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateSubscriptionForm: React.FC<CreateSubscriptionFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'create' | 'success'>('form');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const { createSubscription: createOnChain, isLoading: baseLoading } = useBaseAccount();
  const { createSubscription: saveToDatabase } = useSubscription();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<SubscriptionFormData>({
    defaultValues: {
      description: '',
    },
  });

  const watchedAmount = watch('amount');
  const watchedPeriod = watch('periodInDays');
  
  React.useEffect(() => {
    const isCustom = Number(watchedPeriod) === 0;
    setShowCustomDate(isCustom);
    
    // Reset calendar state when switching away from custom
    if (!isCustom) {
      setSelectedDate(undefined);
      setSelectedTime('');
    }
  }, [watchedPeriod]);

  const handleCreateSubscription = async (data: SubscriptionFormData) => {
    try {
      setIsCreating(true);
      setCurrentStep('create');

      // Debug: Log the form data being submitted
      console.log('Form data submitted:', {
        name: data.name,
        description: data.description,
        category: data.category,
        amount: data.amount,
        periodInDays: data.periodInDays,
        amountType: typeof data.amount,
        periodType: typeof data.periodInDays,
      });

      // Validation checks
      if (!data.name || data.name.trim().length < 2) {
        throw new Error('Subscription name must be at least 2 characters');
      }
      if (!data.category) {
        throw new Error('Please select a category');
      }
      if (!data.amount || parseFloat(data.amount) < 0.01) {
        throw new Error('Amount must be at least 0.01 USDC');
      }
      if (!data.periodInDays || (data.periodInDays < 1 && data.periodInDays !== 0)) {
        throw new Error('Please select a billing period');
      }
      
      // Custom date validation
      if (data.periodInDays === 0) {
        if (!selectedDate) {
          throw new Error('Please select a custom billing date');
        }
        if (!selectedTime) {
          throw new Error('Please select a custom billing time');
        }
        
        const customDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedTime}`);
        const now = new Date();
        
        if (customDateTime <= now) {
          throw new Error('Custom billing date must be in the future');
        }
        
        // Check if date is more than 2 years in the future (reasonable limit)
        const twoYearsFromNow = new Date();
        twoYearsFromNow.setFullYear(now.getFullYear() + 2);
        if (customDateTime > twoYearsFromNow) {
          throw new Error('Custom billing date cannot be more than 2 years in the future');
        }
      }

      const ownerAddress = process.env.NEXT_PUBLIC_SUBSCRIPTION_OWNER_ADDRESS;
      if (!ownerAddress) {
        throw new Error('Subscription owner address not configured');
      }

      // Create Base subscription with spend permissions (no manual approval needed)
      toast.info('Creating subscription on Base...');
      const subscriptionParams = {
        amount: data.amount.toString(),
        periodInDays: Number(data.periodInDays),
        name: data.name.trim(),
        description: data.description?.trim() || '',
        category: data.category,
        recipient: ownerAddress as `0x${string}`,
        ...(data.periodInDays === 0 && selectedDate && selectedTime && {
          customBillingDate: `${selectedDate.toISOString().split('T')[0]}T${selectedTime}`,
        }),
      };
      
      console.log('Base subscription params:', subscriptionParams);
      const subscriptionResult = await createOnChain(subscriptionParams);

      // Save to database
      toast.info('Saving subscription details...');
      const databaseParams = {
        subscriptionId: subscriptionResult.subscriptionId,
        payerAddress: '', // This will be filled by the hook from wallet address
        name: data.name.trim(),
        description: data.description?.trim() || '',
        category: data.category,
        recurringAmount: data.amount.toString(),
        periodInDays: Number(data.periodInDays),
        testnet: false, // TODO: Make this dynamic based on network
        ...(data.periodInDays === 0 && selectedDate && selectedTime && {
          customBillingDate: `${selectedDate.toISOString().split('T')[0]}T${selectedTime}`,
        }),
      };
      
      console.log('Database params:', databaseParams);
      await saveToDatabase(databaseParams);

      setCurrentStep('success');
      toast.success('Subscription created successfully!');
      
      // Auto-redirect after success
      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (error) {
      console.error('Failed to create subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create subscription');
      setCurrentStep('form');
    } finally {
      setIsCreating(false);
    }
  };

  const isFormDisabled = isCreating || baseLoading;

  if (currentStep === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Subscription Created Successfully!
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your recurring payment has been set up and will be processed automatically.
        </p>
        <Button onClick={onSuccess} className="min-w-32">
          View Subscriptions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-6">
        <div className={`flex items-center space-x-2 ${
          currentStep === 'form' ? 'text-blue-600 dark:text-blue-400' : 
          ['create', 'success'].includes(currentStep) ? 'text-green-600 dark:text-green-400' : 
          'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'form' ? 'bg-blue-100 dark:bg-blue-900/50' :
            ['create', 'success'].includes(currentStep) ? 'bg-green-100 dark:bg-green-900/50' :
            'bg-gray-100 dark:bg-gray-800'
          }`}>
            {['create', 'success'].includes(currentStep) ? '✓' : '1'}
          </div>
          <span className="text-sm font-medium">Details</span>
        </div>

        <div className={`w-8 h-0.5 ${
          ['create', 'success'].includes(currentStep) ? 'bg-green-300' : 'bg-gray-300'
        }`} />

        <div className={`flex items-center space-x-2 ${
          currentStep === 'create' ? 'text-blue-600 dark:text-blue-400' :
          currentStep === 'success' ? 'text-green-600 dark:text-green-400' :
          'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'create' ? 'bg-blue-100 dark:bg-blue-900/50' :
            currentStep === 'success' ? 'bg-green-100 dark:bg-green-900/50' :
            'bg-gray-100 dark:bg-gray-800'
          }`}>
            {currentStep === 'create' && <Loader2 className="w-4 h-4 animate-spin" />}
            {currentStep === 'success' && '✓'}
            {currentStep !== 'create' && currentStep !== 'success' && '2'}
          </div>
          <span className="text-sm font-medium">Create Subscription</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleCreateSubscription)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
            <Tag className="w-5 h-5" />
            <span>Basic Information</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Subscription Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Netflix Premium"
                disabled={isFormDisabled}
                {...register('name', {
                  required: 'Subscription name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.name.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category
              </Label>
              <select
                id="category"
                disabled={isFormDisabled}
                {...register('category', { required: 'Category is required' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a category</option>
                {SUBSCRIPTION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.category.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Input
              id="description"
              placeholder="Optional description for this subscription"
              disabled={isFormDisabled}
              {...register('description')}
            />
          </div>
        </div>

        {/* Payment Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Payment Details</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount (USDC) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                disabled={isFormDisabled}
                {...register('amount', {
                  required: 'Amount is required',
                  min: {
                    value: 0.01,
                    message: 'Amount must be at least 0.01 USDC',
                  },
                  pattern: {
                    value: /^\d+(\.\d{1,6})?$/,
                    message: 'Invalid amount format',
                  },
                })}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.amount.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodInDays" className="text-sm font-medium">
                Billing Period
              </Label>
              <select
                id="periodInDays"
                disabled={isFormDisabled}
                {...register('periodInDays', { 
                  required: 'Billing period is required',
                  valueAsNumber: true 
                })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select billing period</option>
                {SUBSCRIPTION_PERIODS.map((period) => (
                  <option key={period.days} value={period.days}>
                    {period.label}
                  </option>
                ))}
              </select>
              {errors.periodInDays && (
                <p className="text-sm text-red-500 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.periodInDays.message}</span>
                </p>
              )}
            </div>
          </div>

          {/* Custom Date & Time Selection */}
          {showCustomDate && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                    Select Payment Date & Time
                  </h4>
                </div>
                
                <Calendar24
                  onDateChange={setSelectedDate}
                  onTimeChange={setSelectedTime}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  disabled={isFormDisabled}
                  minDate={new Date()}
                  maxDate={new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)}
                />

                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Payment will be processed on the specified date and time (your local timezone)</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {watchedAmount && watchedPeriod && parseFloat(watchedAmount) > 0 && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Payment Summary</span>
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p>
                <strong>${parseFloat(watchedAmount).toFixed(2)} USDC</strong> will be charged{' '}
                {Number(watchedPeriod) === 0 ? (
                  selectedDate && selectedTime ? (
                    <>
                      on <strong>{new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedTime}`).toLocaleString()}</strong>
                    </>
                  ) : (
                    'on your custom date'
                  )
                ) : (
                  <>
                    every{' '}
                    <strong>
                      {Number(watchedPeriod) === 1 ? 'day' :
                       Number(watchedPeriod) === 7 ? 'week' :
                       Number(watchedPeriod) === 30 ? 'month' :
                       Number(watchedPeriod) === 90 ? '3 months' :
                       Number(watchedPeriod) === 365 ? 'year' :
                       `${watchedPeriod} days`}
                    </strong>
                  </>
                )}
              </p>
              <p className="mt-1 text-blue-700 dark:text-blue-300">
                Uses Base's secure spend permissions - no manual approvals needed
              </p>
              {Number(watchedPeriod) === 0 && (
                <p className="mt-1 text-blue-700 dark:text-blue-300">
                  This is a one-time payment scheduled for the specified date
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isFormDisabled}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={isFormDisabled}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {currentStep === 'create' ? 'Creating Subscription...' : 'Processing...'}
              </>
            ) : (
              'Create Subscription'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};