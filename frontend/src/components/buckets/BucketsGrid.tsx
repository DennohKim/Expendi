"use client";

import React from 'react';
import { BucketCard } from './BucketCard';
import { Card, CardContent } from '@/components/ui/card';

interface Bucket {
  id: string;
  name: string;
  balance: string;
  monthlyLimit: string;
  monthlySpent: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tokenBalances: Array<{
    id: string;
    balance: string;
    token: {
      id: string;
      name: string;
      symbol: string;
      decimals: number;
    };
  }>;
}
interface BucketsProps {
  buckets: Bucket[];
  loading: boolean;
  error: Error | null;

}

export const BucketsGrid = React.memo(function BucketsGrid( {buckets, loading, error}: BucketsProps ) {
 

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Error loading buckets</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (buckets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No buckets found</p>
            <p className="text-sm mt-1">Create your first bucket to start managing your expenses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredBuckets = buckets.filter((bucket: Bucket) => bucket.name !== 'UNALLOCATED');

  return (
    <div data-tour="buckets-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredBuckets.map((bucket: Bucket) => (
        <BucketCard
          key={bucket.id}
          bucket={bucket}
        />
      ))}
    </div>
  );
});