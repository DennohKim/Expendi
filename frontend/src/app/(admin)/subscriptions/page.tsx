'use client';

import React from 'react';
import { SubscriptionList } from '@/components/subscriptions/SubscriptionList';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function SubscriptionsPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  const isSubscriptionsEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS === 'true';

  if (!isSubscriptionsEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Subscriptions Coming Soon
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The subscriptions feature is currently under development and will be available soon.
          </p>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sign in to your account
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to your account to view and manage your subscriptions.
          </p>
          <Button onClick={() => {
            // This would trigger the wallet connection modal
            // The exact implementation depends on your wallet connection setup
            console.log('Connect wallet clicked');
          }} variant="primary">
            Sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <SubscriptionList
          onCreateNew={() => router.push('/subscriptions/create')}
        />
      </div>
    </div>
  );
}