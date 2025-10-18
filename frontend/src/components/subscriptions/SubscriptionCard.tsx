'use client';

import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Subscription, STATUS_COLORS } from '@/types/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import {
  PauseIcon,
  PlayIcon,
  XMarkIcon,
  CreditCardIcon,
  CalendarIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

interface SubscriptionCardProps {
  subscription: Subscription;
  onUpdate?: () => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onUpdate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
  } = useSubscription();

  const handlePause = async () => {
    setIsLoading(true);
    try {
      await pauseSubscription(subscription.id);
      toast.success('Subscription paused successfully');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to pause subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      await resumeSubscription(subscription.id);
      toast.success('Subscription resumed successfully');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to resume subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    setIsLoading(true);
    try {
      await cancelSubscription(subscription.id);
      toast.success('Subscription cancelled successfully');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextChargeText = () => {
    const nextCharge = new Date(subscription.nextChargeDate);
    const now = new Date();
    
    if (nextCharge < now) {
      return 'Overdue';
    }
    
    return formatDistanceToNow(nextCharge, { addSuffix: true });
  };

  const getMonthlyAmount = () => {
    const monthlyAmount = (parseFloat(subscription.recurringAmount) * 30) / subscription.periodInDays;
    return monthlyAmount.toFixed(2);
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {subscription.name}
            </h3>
            <Badge className={STATUS_COLORS[subscription.status]}>
              {subscription.status}
            </Badge>
          </div>
          
          {subscription.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {subscription.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <TagIcon className="w-4 h-4" />
              <span>{subscription.category}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <CreditCardIcon className="w-4 h-4" />
              <span>{subscription.currency}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Amount
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${subscription.recurringAmount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Every {subscription.periodInDays} days
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Monthly Est.
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${getMonthlyAmount()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Approximate
          </p>
        </div>
      </div>

      {subscription.status === 'ACTIVE' && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300">
              Next charge {getNextChargeText()}
            </span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {format(new Date(subscription.nextChargeDate), 'PPP')}
          </p>
        </div>
      )}

      {subscription.status === 'PAUSED' && subscription.pausedAt && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Paused on {format(new Date(subscription.pausedAt), 'PPP')}
          </p>
        </div>
      )}

      {subscription.status === 'CANCELLED' && subscription.cancelledAt && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Cancelled on {format(new Date(subscription.cancelledAt), 'PPP')}
          </p>
        </div>
      )}

      {subscription.transactions && subscription.transactions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Recent Transactions
          </p>
          <div className="space-y-1">
            {subscription.transactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {format(new Date(tx.attemptedAt), 'MMM dd')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white font-medium">
                    ${tx.amount}
                  </span>
                  <Badge className={`text-xs ${
                    tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    tx.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {subscription.status === 'ACTIVE' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={isLoading}
              className="flex-1"
            >
              <PauseIcon className="w-4 h-4 mr-1" />
              Pause
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </>
        )}

        {subscription.status === 'PAUSED' && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={handleResume}
              disabled={isLoading}
              className="flex-1"
            >
              <PlayIcon className="w-4 h-4 mr-1" />
              Resume
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </>
        )}

        {(subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') && (
          <div className="flex-1 text-center text-sm text-gray-500 dark:text-gray-400 py-2">
            No actions available
          </div>
        )}
      </div>
    </Card>
  );
};