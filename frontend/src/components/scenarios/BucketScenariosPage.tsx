import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklyLabContribution } from './WeeklyLabContribution';
import { MonthlyRent } from './MonthlyRent';
import { FoodBucket } from './FoodBucket';
import { useUserSubscriptions } from '@/hooks/bucket-manager/useUserSubscriptions';
import { useBucketInfo } from '@/hooks/bucket-manager/useBucketInfo';

export function BucketScenariosPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: subscriptions, isLoading: loadingSubscriptions } = useUserSubscriptions();
  const { data: labBucket } = useBucketInfo('Weekly Lab Contribution');
  const { data: rentBucket } = useBucketInfo('Monthly Rent');
  const { data: foodBucket } = useBucketInfo('Food Expenses');

  const activeSubscriptionsCount = subscriptions?.filter(sub => sub.isActive).length || 0;
  const totalBalance = [labBucket, rentBucket, foodBucket]
    .reduce((sum, bucket) => sum + parseFloat(bucket?.balance || '0'), 0);

  const getNextPaymentDate = () => {
    if (!subscriptions?.length) return null;
    
    const nextPayments = subscriptions
      .filter(sub => sub.isActive)
      .map(sub => sub.nextChargeTimestamp)
      .sort((a, b) => a - b);
    
    return nextPayments.length > 0 ? new Date(nextPayments[0] * 1000) : null;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">ExpendiBucketManager Scenarios</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Manage your automated payments and expenses with smart contract-powered buckets. 
          Set up weekly lab contributions, monthly rent payments, and flexible food expenses.
        </p>
      </div>

      {/* Overview Cards */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold">{activeSubscriptionsCount}</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {activeSubscriptionsCount > 0 ? 'Active' : 'None'}
              </Badge>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                USDC
              </Badge>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Next Payment</p>
                <p className="text-sm font-medium">
                  {getNextPaymentDate() ? formatDate(getNextPaymentDate()!) : 'None scheduled'}
                </p>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">
                Upcoming
              </Badge>
            </div>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lab">Lab Contribution</TabsTrigger>
          <TabsTrigger value="rent">Monthly Rent</TabsTrigger>
          <TabsTrigger value="food">Food Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscription Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Active Subscriptions</h3>
              {loadingSubscriptions ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : subscriptions?.length ? (
                <div className="space-y-3">
                  {subscriptions
                    .filter(sub => sub.isActive)
                    .map((sub) => (
                      <div key={sub.subscriptionId} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{sub.bucketName}</p>
                          <p className="text-sm text-gray-600">{sub.amount} USDC every {sub.periodInDays} days</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Active
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">No active subscriptions</p>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('lab')}
                >
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                  Set up Lab Contribution (10 USDC/week)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('rent')}
                >
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                  Set up Monthly Rent (100 USDC/month)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('food')}
                >
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
                  Create Food Expense Bucket
                </Button>
              </div>
            </Card>
          </div>

          {/* How It Works */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">How ExpendiBucketManager Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium mb-2">Create Buckets</h4>
                <p className="text-sm text-gray-600">
                  Set up dedicated spending buckets with monthly limits for different categories
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h4 className="font-medium mb-2">Fund & Subscribe</h4>
                <p className="text-sm text-gray-600">
                  Add USDC to buckets and create automated subscriptions or make one-time payments
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">3</span>
                </div>
                <h4 className="font-medium mb-2">Automate Payments</h4>
                <p className="text-sm text-gray-600">
                  Chainlink Automation processes recurring payments automatically on schedule
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="lab">
          <WeeklyLabContribution />
        </TabsContent>

        <TabsContent value="rent">
          <MonthlyRent />
        </TabsContent>

        <TabsContent value="food">
          <FoodBucket />
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card className="p-4 bg-gray-50">
        <div className="text-center text-sm text-gray-600">
          <p>
            <strong>Network:</strong> Base Sepolia Testnet | 
            <strong className="ml-2">Contract:</strong> 0x4832FE3192f205F753F1C334916B7cfec7823D64 |
            <strong className="ml-2">Automation:</strong> 0x373B8a2f3A0aBdD6654D199C60c1ad9fab6F25d7
          </p>
          <p className="mt-1">
            All payments use USDC (MockUSDC for testing). Chainlink Automation ensures precise payment timing.
          </p>
        </div>
      </Card>
    </div>
  );
}