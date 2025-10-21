import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search,
  Wallet,
  TrendingUp,
  Calendar,
  AlertCircle,
  RefreshCw,
  PlusIcon
} from 'lucide-react';
import { BucketManagerCard } from './BucketManagerCard';
import { CreateBucketManagerModal } from './CreateBucketManagerModal';
import { useBucketsList } from '@/hooks/bucket-manager/useBucketsList';
import { useUserSubscriptions } from '@/hooks/bucket-manager/useUserSubscriptions';
import { useSmartAccount } from '@/context/SmartAccountContext';

export function BucketsManagerPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const { smartAccountClient } = useSmartAccount();
  const { data: buckets, isLoading, error, refetch } = useBucketsList();
  const { data: subscriptions } = useUserSubscriptions();

  // Filter buckets based on search and status
  const filteredBuckets = buckets?.filter(bucket => {
    const matchesSearch = bucket.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && bucket.active) ||
      (filterStatus === 'inactive' && !bucket.active);
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate overview stats
  const totalBalance = buckets?.reduce((sum, bucket) => sum + parseFloat(bucket.balance), 0) || 0;
  const activeBuckets = buckets?.filter(bucket => bucket.active).length || 0;
  const totalSubscriptions = subscriptions?.filter(sub => sub.isActive).length || 0;
  const monthlySpending = buckets?.reduce((sum, bucket) => sum + parseFloat(bucket.monthlySpent), 0) || 0;

  const handleFundBucket = (bucketName: string) => {
    // TODO: Open fund bucket modal
    console.log('Fund bucket:', bucketName);
  };

  const handleMakePayment = (bucketName: string) => {
    // TODO: Open payment modal
    console.log('Make payment from bucket:', bucketName);
  };

  const handleViewSubscriptions = (bucketName: string) => {
    // TODO: Open subscriptions view
    console.log('View subscriptions for bucket:', bucketName);
  };

  if (!smartAccountClient?.account) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-semibold mb-2">Wallet Connection Required</h2>
          <p className="text-gray-600">Please connect your wallet to manage buckets</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Buckets</h1>
          <p className="text-gray-600">Manage your spending buckets and automated payments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Bucket
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Balance</p>
              <p className="text-xl font-bold text-green-600">${totalBalance.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full" />
            <div>
              <p className="text-sm text-gray-600">Active Buckets</p>
              <p className="text-xl font-bold">{activeBuckets}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Subscriptions</p>
              <p className="text-xl font-bold">{totalSubscriptions}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Monthly Spent</p>
              <p className="text-xl font-bold">${monthlySpending.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search buckets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All ({buckets?.length || 0})
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('active')}
          >
            Active ({activeBuckets})
          </Button>
          <Button
            variant={filterStatus === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('inactive')}
          >
            Inactive ({(buckets?.length || 0) - activeBuckets})
          </Button>
        </div>
      </div>

      {/* Buckets Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Buckets</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to load buckets'}
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </Card>
      ) : filteredBuckets.length === 0 ? (
        <Card className="p-8 text-center">
          {buckets?.length === 0 ? (
            <div className='max-w-md mx-auto'>
              <div className="w-16 h-16 bg-button-primary/10 dark:bg-button-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusIcon className="w-8 h-8 text-button-primary dark:text-button-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Buckets Yet</h2>
              <p className="text-gray-600 mb-4">
                Create your first bucket to start organizing your spending
              </p>
              <Button onClick={() => setShowCreateModal(true)} variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Bucket
              </Button>
            </div>
          ) : (
            <>
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">No Buckets Found</h2>
              <p className="text-gray-600">
                No buckets match your search "{searchTerm}" with filter "{filterStatus}"
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuckets.map((bucket) => (
            <BucketManagerCard
              key={bucket.name}
              bucket={bucket}
              onFundClick={() => handleFundBucket(bucket.name)}
              onPaymentClick={() => handleMakePayment(bucket.name)}
              onSubscriptionClick={() => handleViewSubscriptions(bucket.name)}
            />
          ))}
        </div>
      )}

      {/* Network Info */}
      {buckets && buckets.length > 0 && (
        <Card className="p-4 bg-blue-50">
          <div className="text-center text-sm text-blue-800">
            <p>
              <strong>Network:</strong> Base Sepolia Testnet | 
              <strong className="ml-2">Contract:</strong> 0x4832FE3192f205F753F1C334916B7cfec7823D64
            </p>
            <p className="mt-1 text-xs">
              Using ExpendiBucketManager smart contracts for secure, automated payment management
            </p>
          </div>
        </Card>
      )}

      {/* Create Bucket Modal */}
      <CreateBucketManagerModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}