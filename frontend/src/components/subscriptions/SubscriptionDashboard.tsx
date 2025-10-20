'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { 
  useUserSubscriptions, 
  useQueueStatus,
  useSubscriptionOperations 
} from '@/hooks/useSubscriptionAPI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Activity, 
  Clock, 
  CheckCircle, 
  Pause, 
  Play, 
  X,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SubscriptionDashboard() {
  const { address } = useAccount();
  const { 
    data: subscriptions, 
    isLoading: subscriptionsLoading, 
    error: subscriptionsError,
    refetch: refetchSubscriptions 
  } = useUserSubscriptions(address);
  
  const { 
    data: queueStatus, 
    isLoading: queueLoading,
    refetch: refetchQueue 
  } = useQueueStatus(30000); // Auto-refresh every 30 seconds

  const operations = useSubscriptionOperations();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 text-white';
      case 'paused': return 'bg-yellow-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      case 'completed': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      case 'completed': return <TrendingUp className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatRelativeTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };

  const handlePause = (subscriptionId: string) => {
    operations.pause.mutate(subscriptionId);
  };

  const handleResume = (subscriptionId: string) => {
    operations.resume.mutate(subscriptionId);
  };

  const handleCancel = (subscriptionId: string) => {
    if (confirm('Are you sure you want to cancel this subscription?')) {
      operations.cancel.mutate(subscriptionId);
    }
  };

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Subscription Dashboard
          </CardTitle>
          <CardDescription>Please connect your wallet to view subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Connect your wallet to get started with subscriptions.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Backend processing queue status</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchQueue()}
            disabled={queueLoading}
          >
            <RefreshCw className={`h-4 w-4 ${queueLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {queueStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg border">
                <div className="text-2xl font-bold text-yellow-600">{queueStatus.stats.waiting}</div>
                <div className="text-sm text-yellow-700">Waiting</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{queueStatus.stats.active}</div>
                <div className="text-sm text-blue-700">Processing</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{queueStatus.stats.completed}</div>
                <div className="text-sm text-green-700">Completed</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border">
                <div className="text-2xl font-bold text-red-600">{queueStatus.stats.failed}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">{queueStatus.stats.delayed}</div>
                <div className="text-sm text-purple-700">Delayed</div>
              </div>
            </div>
          ) : queueLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading queue status...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <AlertCircle className="h-5 w-5 mr-2" />
              Unable to fetch queue status
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Your Subscriptions
            </CardTitle>
            <CardDescription>
              {subscriptions?.length || 0} subscription{subscriptions?.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchSubscriptions()} 
            disabled={subscriptionsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${subscriptionsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {subscriptionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading subscriptions...</span>
            </div>
          ) : subscriptionsError ? (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error loading subscriptions: {subscriptionsError.message}
            </div>
          ) : !subscriptions || subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No subscriptions found</p>
              <p>Create your first subscription to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{subscription.metadata.name}</h3>
                      <Badge className={`${getStatusColor(subscription.status)} flex items-center gap-1`}>
                        {getStatusIcon(subscription.status)}
                        {subscription.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {subscription.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePause(subscription.id)}
                          disabled={operations.isLoading}
                        >
                          <Pause className="h-4 w-4" />
                          Pause
                        </Button>
                      )}
                      
                      {subscription.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResume(subscription.id)}
                          disabled={operations.isLoading}
                        >
                          <Play className="h-4 w-4" />
                          Resume
                        </Button>
                      )}
                      
                      {(subscription.status === 'active' || subscription.status === 'paused') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(subscription.id)}
                          disabled={operations.isLoading}
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground block">Amount</span>
                      <div className="font-medium text-lg">${subscription.amount} USDC</div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-muted-foreground block">Type</span>
                      <div className="font-medium">
                        {subscription.periodInDays === 0 ? 'One-time' : `Every ${subscription.periodInDays} days`}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-muted-foreground block">Next Charge</span>
                      <div className="font-medium">{formatDate(subscription.nextChargeTimestamp)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(subscription.nextChargeTimestamp)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-muted-foreground block">Recipient</span>
                      <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {subscription.recipientAddress.slice(0, 6)}...{subscription.recipientAddress.slice(-4)}
                      </div>
                    </div>
                  </div>
                  
                  {subscription.metadata.description && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-muted-foreground text-sm">Description:</span>
                      <p className="text-sm mt-1">{subscription.metadata.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading Overlay for Operations */}
      {operations.isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Processing subscription operation...</span>
          </div>
        </div>
      )}
    </div>
  );
}