'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionCard } from './SubscriptionCard';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionFilters,
  SUBSCRIPTION_CATEGORIES,
} from '@/types/subscription';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface SubscriptionListProps {
  onCreateNew?: () => void;
}

export const SubscriptionList: React.FC<SubscriptionListProps> = ({
  onCreateNew,
}) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<SubscriptionFilters>({
    limit: 10,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { getSubscriptions, isLoading, error } = useSubscription();

  const loadSubscriptions = async () => {
    try {
      const result = await getSubscriptions(filters);
      setSubscriptions(result.subscriptions);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [filters]);

  const filteredSubscriptions = subscriptions.filter((subscription) =>
    subscription.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscription.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFilterChange = (key: keyof SubscriptionFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: key !== 'offset' ? 0 : value, // Reset offset when other filters change
    }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 10),
    }));
  };

  const getStatusCounts = () => {
    return subscriptions.reduce((counts, sub) => {
      counts[sub.status] = (counts[sub.status] || 0) + 1;
      return counts;
    }, {} as Record<SubscriptionStatus, number>);
  };

  const getTotalMonthlyAmount = () => {
    return filteredSubscriptions
      .filter(sub => sub.status === 'ACTIVE')
      .reduce((total, sub) => {
        const monthlyAmount = (parseFloat(sub.recurringAmount) * 30) / sub.periodInDays;
        return total + monthlyAmount;
      }, 0)
      .toFixed(2);
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400 mb-4">
          Failed to load subscriptions: {error}
        </p>
        <Button onClick={loadSubscriptions}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Subscriptions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your recurring payments and automated bills
          </p>
        </div>
        
        {onCreateNew && (
          <Button onClick={onCreateNew} className="flex items-center gap-2" variant="primary">
            <PlusIcon className="w-4 h-4" />
            Create Subscription
          </Button>
        )}
      </div>

      {/* Stats */}
      {subscriptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Monthly</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${getTotalMonthlyAmount()}
            </p>
          </Card>
          
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {getStatusCounts().ACTIVE || 0}
            </p>
          </Card>
          
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Paused</p>
            <p className="text-2xl font-bold text-yellow-600">
              {getStatusCounts().PAUSED || 0}
            </p>
          </Card>
          
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {subscriptions.length}
            </p>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <FunnelIcon className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => 
                  handleFilterChange('status', value || undefined)
                }
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
                <option value="FAILED">Failed</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <Select
                value={filters.category || ''}
                onValueChange={(value) => 
                  handleFilterChange('category', value || undefined)
                }
              >
                <option value="">All Categories</option>
                {SUBSCRIPTION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Per Page
              </label>
              <Select
                value={filters.limit?.toString() || '10'}
                onValueChange={(value) => 
                  handleFilterChange('limit', parseInt(value))
                }
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Grid */}
      {isLoading && subscriptions.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : filteredSubscriptions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onUpdate={loadSubscriptions}
              />
            ))}
          </div>

          {/* Load More */}
          {subscriptions.length < total && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : `Load More (${total - subscriptions.length} remaining)`}
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <div className="w-16 h-16 bg-button-primary/10 dark:bg-button-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusIcon className="w-8 h-8 text-button-primary dark:text-button-primary" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No subscriptions found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm || filters.status || filters.category
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first automated recurring payment'
              }
            </p>
            {onCreateNew && !searchTerm && !filters.status && !filters.category && (
              <Button onClick={onCreateNew} variant="primary">
                Create Your First Subscription
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};