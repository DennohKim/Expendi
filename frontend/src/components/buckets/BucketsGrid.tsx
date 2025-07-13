"use client";

import { useUserBuckets } from '@/hooks/contract-queries/useUserBuckets';
import { BucketCard } from './BucketCard';
import { Card, CardContent } from '@/components/ui/card';

export function BucketsGrid() {
  const { buckets, loading, error } = useUserBuckets();

  console.log("buckets", buckets);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
            <p className="text-sm mt-1">{error}</p>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {buckets.map((bucket) => (
        <BucketCard
          key={bucket.name}
          name={bucket.name}
          monthlyLimit={bucket.monthlyLimit}
          currentSpent={bucket.currentSpent}
          isActive={bucket.isActive}
          ethBalance={bucket.ethBalance}
          usdcBalance={bucket.usdcBalance}
        />
      ))}
    </div>
  );
}