'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, CreditCard, Target, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { CreateSubscriptionForm } from '@/components/subscriptions/CreateSubscriptionForm-simple';

export default function CreateSubscriptionPage() {
  const router = useRouter();
  const { isConnected } = useAccount();

  const isSubscriptionsEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS === 'true';

  if (!isSubscriptionsEnabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Subscriptions Coming Soon
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The subscriptions feature is currently under development and will be available soon.
          </p>
          <Button onClick={() => router.push('/subscriptions')}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sign in to your account
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to your account to create a subscription.
          </p>
          <Button onClick={() => router.push('/subscriptions')} variant="primary">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Back Navigation */}
      <div className="col-span-12">
        <Button
          variant="ghost"
          onClick={() => router.push('/subscriptions')}
          className="mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Subscriptions
        </Button>
      </div>

      {/* Page Header */}
      <div className="col-span-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Create New Subscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Set up automated recurring payments for your services and subscriptions
          </p>
        </div>
      </div>

     

      {/* Main Form Section */}
      <div className="col-span-12 lg:col-span-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Subscription Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateSubscriptionForm
              onSuccess={() => {
                router.push('/subscriptions');
              }}
              onCancel={() => {
                router.push('/subscriptions');
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <div className="col-span-12 lg:col-span-4">
        <div className="space-y-6">
          {/* How it Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How it Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Set Up</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fill in your subscription details and payment amount
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Grant Permissions</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Base creates secure spend permissions - no manual approvals needed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  💡 Ensure your wallet has sufficient USDC balance for recurring payments
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  🔒 Base's spend permissions let you control exactly how much can be charged
                </p>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ⚡ No transaction fees thanks to sponsored transactions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}