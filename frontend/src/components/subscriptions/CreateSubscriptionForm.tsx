'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useCustomSubscription } from '@/hooks/useCustomSubscription';
import { useSubscription } from '@/hooks/useSubscription';
import { SUBSCRIPTION_CATEGORIES, SUBSCRIPTION_PERIODS } from '@/types/subscription';
import { DateTimePicker24h } from '@/components/ui/date-time-picker-24h';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle, DollarSign, Calendar, Tag } from 'lucide-react';

// Define form data interface
interface SubscriptionFormData {
  name: string;
  description: string;
  category: string;
  amount: string;
  periodInDays: number;
}

// Zod validation schema for subscription form (used for runtime validation)
const subscriptionFormSchema = z.object({
  name: z.string()
    .min(2, 'Subscription name must be at least 2 characters')
    .max(100, 'Subscription name must be less than 100 characters'),
  description: z.string().optional().default(''),
  category: z.string()
    .min(1, 'Please select a category')
    .refine((val: string) => SUBSCRIPTION_CATEGORIES.includes(val as any), 'Invalid category selected'),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val: string) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0.01;
    }, 'Amount must be at least 0.01 USDC')
    .refine((val: string) => {
      const num = parseFloat(val);
      return !isNaN(num) && num <= 1000000;
    }, 'Amount cannot exceed 1,000,000 USDC'),
  periodInDays: z.number()
    .refine((val: number) => {
      return val === 0 || SUBSCRIPTION_PERIODS.some(period => period.days === val);
    }, 'Please select a valid billing period'),
});

interface CreateSubscriptionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateSubscriptionForm: React.FC<CreateSubscriptionFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'permission' | 'create' | 'success'>('form');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | undefined>();
  const [hasPermission, setHasPermission] = useState(false);
  const { 
    createSubscription: createCustomSubscription,
    grantSubscriptionPermission,
    getPermissionStatus,
    approveUSDC,
    isLoading: customLoading 
  } = useCustomSubscription();
  const { createSubscription: saveToDatabase } = useSubscription();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SubscriptionFormData>({
    defaultValues: {
      description: '',
    },
  });

  const watchedAmount = watch('amount');
  const watchedPeriod = watch('periodInDays');
  
  // Check permission status on mount
  React.useEffect(() => {
    const checkPermission = async () => {
      try {
        const permission = await getPermissionStatus();
        setHasPermission(permission?.isActive || false);
      } catch (error) {
        console.log('No existing permission found');
        setHasPermission(false);
      }
    };
    
    checkPermission();
  }, [getPermissionStatus]);

  React.useEffect(() => {
    const isCustom = Number(watchedPeriod) === 0;
    setShowCustomDate(isCustom);
    
    // Reset calendar state when switching away from custom
    if (!isCustom) {
      setSelectedDateTime(undefined);
    }
  }, [watchedPeriod]);

  const handleCreateSubscription = async (data: SubscriptionFormData) => {
    try {
      setIsCreating(true);

      // Validate Zod schema first (this should catch most validation errors)
      const validatedData = subscriptionFormSchema.parse(data);

      // Additional custom date validation for period 0 (custom date)
      if (validatedData.periodInDays === 0) {
        if (!selectedDateTime) {
          throw new Error('Please select a custom billing date and time');
        }
        
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        
        if (selectedDateTime <= fiveMinutesFromNow) {
          throw new Error('Custom billing date must be at least 5 minutes in the future');
        }
        
        // Check if date is more than 2 years in the future (reasonable limit)
        const twoYearsFromNow = new Date();
        twoYearsFromNow.setFullYear(now.getFullYear() + 2);
        if (selectedDateTime > twoYearsFromNow) {
          throw new Error('Custom billing date cannot be more than 2 years in the future');
        }
      }

      const recipientAddress = process.env.NEXT_PUBLIC_SUBSCRIPTION_RECIPIENT_ADDRESS;
      if (!recipientAddress) {
        throw new Error('Subscription recipient address not configured');
      }

      // Step 1: Grant permission if not already granted
      if (!hasPermission) {
        setCurrentStep('permission');
        toast.info('Approving USDC for subscription contract...');
        
        // First approve USDC for the contract
        await approveUSDC('10000'); // Approve a large amount for multiple subscriptions
        
        toast.info('Granting subscription permission...');
        
        // Calculate permission parameters
        const totalAllowance = parseFloat(validatedData.amount) * 12; // Allow for 12 charges
        const periodInSeconds = validatedData.periodInDays === 0 ? 86400 : validatedData.periodInDays * 24 * 60 * 60; // Default to 1 day for custom
        const expiryTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year from now
        
        await grantSubscriptionPermission({
          allowedAmount: totalAllowance.toString(),
          periodInSeconds,
          expiryTimestamp
        });
        
        setHasPermission(true);
        toast.success('Permission granted successfully!');
      }

      // Step 2: Create subscription
      setCurrentStep('create');
      toast.info('Creating subscription...');
      
      const subscriptionParams = {
        amount: validatedData.amount.toString(),
        periodInDays: Number(validatedData.periodInDays),
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || '',
        category: validatedData.category,
        recipient: recipientAddress as `0x${string}`,
        ...(validatedData.periodInDays === 0 && selectedDateTime && {
          customBillingDate: selectedDateTime.toISOString(),
        }),
      };
      
      console.log('Custom subscription params:', subscriptionParams);
      const subscriptionResult = await createCustomSubscription(subscriptionParams);

      setCurrentStep('success');
      toast.success('Subscription created successfully!');
      
      // Auto-redirect after success
      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (error: unknown) {
      console.error('Failed to create subscription:', error);
      if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        const firstError = error.issues[0];
        toast.error(firstError?.message || 'Form validation failed');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to create subscription');
      }
      setCurrentStep('form');
    } finally {
      setIsCreating(false);
    }
  };

  const isFormDisabled = isCreating || customLoading;
  
  // Helper function to check if step is completed
  const isStepCompleted = (step: string) => {
    const stepOrder = ['form', 'permission', 'create', 'success'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    return currentIndex > stepIndex;
  };
  
  // Helper functions to check current step safely
  const isFormStep = () => currentStep === 'form';
  const isPermissionStep = () => currentStep === 'permission';
  const isCreateStep = () => currentStep === 'create';
  const isSuccessStep = () => currentStep === 'success';

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
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto">
        <div className={`flex items-center space-x-2 ${
          isFormStep() ? 'text-blue-600 dark:text-blue-400' : 
          isStepCompleted('form') ? 'text-green-600 dark:text-green-400' : 
          'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            isFormStep() ? 'bg-blue-100 dark:bg-blue-900/50' :
            isStepCompleted('form') ? 'bg-green-100 dark:bg-green-900/50' :
            'bg-gray-100 dark:bg-gray-800'
          }`}>
            {isStepCompleted('form') ? '✓' : '1'}
          </div>
          <span className="text-sm font-medium whitespace-nowrap">Details</span>
        </div>

        <div className={`w-4 h-0.5 ${
          isStepCompleted('form') ? 'bg-green-300' : 'bg-gray-300'
        }`} />

        <div className={`flex items-center space-x-2 ${
          isPermissionStep() ? 'text-blue-600 dark:text-blue-400' :
          isStepCompleted('permission') ? 'text-green-600 dark:text-green-400' :
          'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            isPermissionStep() ? 'bg-blue-100 dark:bg-blue-900/50' :
            isStepCompleted('permission') ? 'bg-green-100 dark:bg-green-900/50' :
            'bg-gray-100 dark:bg-gray-800'
          }`}>
            {isPermissionStep() && <Loader2 className="w-4 h-4 animate-spin" />}
            {isStepCompleted('permission') ? '✓' : '2'}
          </div>
          <span className="text-sm font-medium whitespace-nowrap">Permission</span>
        </div>

        <div className={`w-4 h-0.5 ${
          isStepCompleted('permission') ? 'bg-green-300' : 'bg-gray-300'
        }`} />

        <div className={`flex items-center space-x-2 ${
          isCreateStep() ? 'text-blue-600 dark:text-blue-400' :
          isSuccessStep() ? 'text-green-600 dark:text-green-400' :
          'text-gray-400'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            isCreateStep() ? 'bg-blue-100 dark:bg-blue-900/50' :
            isSuccessStep() ? 'bg-green-100 dark:bg-green-900/50' :
            'bg-gray-100 dark:bg-gray-800'
          }`}>
            {isCreateStep() && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSuccessStep() && '✓'}
            {(isFormStep() || isPermissionStep()) && '3'}
          </div>
          <span className="text-sm font-medium whitespace-nowrap">Create</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleCreateSubscription)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
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
                  maxLength: {
                    value: 100,
                    message: 'Name must be less than 100 characters',
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
                {...register('category', { 
                  required: 'Category is required',
                  validate: (value) => {
                    if (!SUBSCRIPTION_CATEGORIES.includes(value as any)) {
                      return 'Invalid category selected';
                    }
                    return true;
                  }
                })}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
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
                  validate: (value) => {
                    const num = parseFloat(value);
                    if (isNaN(num)) return 'Amount must be a valid number';
                    if (num < 0.01) return 'Amount must be at least 0.01 USDC';
                    if (num > 1000000) return 'Amount cannot exceed 1,000,000 USDC';
                    return true;
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
                  valueAsNumber: true,
                  validate: (value) => {
                    if (value !== 0 && !SUBSCRIPTION_PERIODS.some(period => period.days === value)) {
                      return 'Please select a valid billing period';
                    }
                    return true;
                  }
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
                
                <DateTimePicker24h
                  value={selectedDateTime}
                  onChange={setSelectedDateTime}
                  disabled={isFormDisabled}
                  required={watchedPeriod === 0}
                  minDate={new Date(new Date().setHours(0, 0, 0, 0))}
                  maxDate={new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)}
                  error={watchedPeriod === 0 && !selectedDateTime ? 'Please select a date and time' : undefined}
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
                  selectedDateTime ? (
                    <>
                      on <strong>{selectedDateTime.toLocaleString()}</strong>
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
                Uses ERC-7715 compatible permissions with automatic execution
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
                {isPermissionStep() ? 'Granting Permission...' :
                 isCreateStep() ? 'Creating Subscription...' : 'Processing...'}
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