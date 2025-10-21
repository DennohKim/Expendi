import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Wallet,
  Plus,
  ArrowUpRight,
  Settings
} from 'lucide-react';
import { BucketListItem } from '@/hooks/bucket-manager/useBucketsList';
import { useFundBucket } from '@/hooks/bucket-manager/useFundBucket';
import { useDepositTokens } from '@/hooks/bucket-manager/useDepositTokens';
import { useOneTimePayment } from '@/hooks/bucket-manager/useOneTimePayment';
import { useUserSubscriptions } from '@/hooks/bucket-manager/useUserSubscriptions';

interface BucketManagerCardProps {
  bucket: BucketListItem;
  onFundClick?: () => void;
  onPaymentClick?: () => void;
  onSubscriptionClick?: () => void;
}

export function BucketManagerCard({ 
  bucket, 
  onFundClick,
  onPaymentClick,
  onSubscriptionClick 
}: BucketManagerCardProps) {
  const [showActions, setShowActions] = useState(false);
  
  const { data: subscriptions } = useUserSubscriptions();
  
  // Get active subscriptions for this bucket
  const bucketSubscriptions = subscriptions?.filter(
    sub => sub.bucketName === bucket.name && sub.isActive
  ) || [];

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusColor = () => {
    if (!bucket.active) return 'bg-gray-500';
    if (bucket.spentPercentage > 90) return 'bg-red-500';
    if (bucket.spentPercentage > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressColor = () => {
    if (bucket.spentPercentage > 90) return 'bg-red-500';
    if (bucket.spentPercentage > 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{bucket.name}</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <Badge variant={bucket.active ? "default" : "secondary"}>
              {bucket.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Balance Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600">Balance</span>
          </div>
          <span className="text-xl font-bold text-green-600">
            ${bucket.balance} USDC
          </span>
        </div>

        {/* Monthly Budget Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Monthly Budget</span>
            <span className="font-medium">
              ${bucket.monthlySpent} / ${bucket.monthlyLimit}
            </span>
          </div>
          <Progress 
            value={Math.min(bucket.spentPercentage, 100)} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{bucket.spentPercentage.toFixed(1)}% used</span>
            <span>${bucket.remainingBudget} remaining</span>
          </div>
        </div>

        {/* Subscription Info */}
        {bucketSubscriptions.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {bucketSubscriptions.length} Active Subscription{bucketSubscriptions.length > 1 ? 's' : ''}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSubscriptionClick}
              className="text-blue-600 hover:text-blue-800"
            >
              View
            </Button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-sm text-gray-600">Subscriptions</div>
            <div className="font-semibold">{bucket.subscriptionCount}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Last Reset</div>
            <div className="font-semibold text-xs">
              {formatDate(bucket.lastResetTimestamp)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onFundClick}
            className="flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Fund
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onPaymentClick}
            className="flex items-center gap-1"
          >
            <ArrowUpRight className="w-3 h-3" />
            Pay
          </Button>
        </div>

        {/* Quick Stats (expandable) */}
        {showActions && (
          <div className="pt-3 border-t space-y-2">
            <div className="text-xs text-gray-600">Quick Stats:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Raw Balance: </span>
                <span className="font-mono">{bucket.rawBalance.toString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Raw Limit: </span>
                <span className="font-mono">{bucket.rawMonthlyLimit.toString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowActions(!showActions)}
          className="w-full text-xs text-gray-500 hover:text-gray-700"
        >
          {showActions ? 'Less Details' : 'More Details'}
        </Button>
      </CardContent>
    </Card>
  );
}