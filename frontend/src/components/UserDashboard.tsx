// UserDashboard component demonstrating subgraph data integration
import React from 'react';
import { useWalletUser } from '@/hooks/useWalletUser';
import { formatEther } from 'viem';
import { Bell, Wallet, TrendingUp, DollarSign, Target } from 'lucide-react';

// Helper function to safely convert to BigInt
const safeBigInt = (value: string | undefined | null): bigint => {
  if (!value || value === '' || value === 'undefined' || value === 'null') {
    return BigInt(0);
  }
  try {
    return BigInt(value);
  } catch (error) {
    console.warn('Failed to convert to BigInt:', value, error);
    return BigInt(0);
  }
};

export function UserDashboard() {
  const {
    ready,
    isConnected,
    address,
    privyUser,
    login,
    logout,
    analytics,
    realTimeData,
    notifications,
    isLoading,
    error,
    unreadNotificationsCount,
    totalBalance,
    monthlySpent,
    bucketsCount,
    markNotificationAsRead,
    refreshData,
  } = useWalletUser();

  if (!ready) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Wallet className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No wallet connected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your wallet to view your budget dashboard
          </p>
          <button
            data-tour="create-account"
            onClick={login}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">
            Error loading dashboard: {error}
            <button 
              onClick={refreshData}
              className="ml-2 font-medium underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="dashboard-overview" className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div data-tour="welcome" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
            {privyUser?.email?.address && (
              <span className="text-gray-400">•</span>
            )}
            {privyUser?.email?.address}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button className="relative p-2 text-gray-400 hover:text-gray-500">
              <Bell className="h-6 w-6" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={logout}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div data-tour="balance-overview" className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Balance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {parseFloat(formatEther(safeBigInt(totalBalance))).toFixed(4)} ETH
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Spent</p>
              <p className="text-2xl font-semibold text-gray-900">
                {parseFloat(formatEther(safeBigInt(monthlySpent))).toFixed(4)} ETH
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Buckets</p>
              <p className="text-2xl font-semibold text-gray-900">{bucketsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics?.transactions_count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buckets Overview */}
      {realTimeData?.buckets && realTimeData.buckets.length > 0 && (
        <div data-tour="buckets-grid" className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Buckets</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {realTimeData.buckets.map((bucket) => {
                const utilization = parseFloat(bucket.monthlyLimit) > 0 
                  ? (parseFloat(bucket.monthlySpent) / parseFloat(bucket.monthlyLimit)) * 100 
                  : 0;
                
                return (
                  <div key={bucket.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{bucket.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        bucket.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bucket.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Balance:</span>
                        <span className="font-medium">
                          {parseFloat(formatEther(safeBigInt(bucket.balance))).toFixed(4)} ETH
                        </span>
                      </div>
                      
                      {parseFloat(bucket.monthlyLimit) > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Monthly Limit:</span>
                            <span className="font-medium">
                              {parseFloat(formatEther(safeBigInt(bucket.monthlyLimit))).toFixed(4)} ETH
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Spent:</span>
                            <span className="font-medium">
                              {parseFloat(formatEther(safeBigInt(bucket.monthlySpent))).toFixed(4)} ETH
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                utilization >= 90 ? 'bg-red-500' : 
                                utilization >= 75 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          
                          <div className="text-xs text-gray-500 text-center">
                            {utilization.toFixed(1)}% utilized
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div data-tour="recent-transactions" className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {notifications.slice(0, 5).map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => markNotificationAsRead(notification.id)}
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    notification.priority === 'high' ? 'bg-red-500' :
                    notification.priority === 'medium' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Summary */}
      {analytics && (
        <div data-tour="spending-chart" className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Deposited</p>
                <p className="text-lg font-semibold">
                  {analytics.total_deposited ? parseFloat(formatEther(safeBigInt(analytics.total_deposited))).toFixed(4) : '0.0000'} ETH
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-lg font-semibold">
                  {parseFloat(formatEther(safeBigInt(analytics.total_spent))).toFixed(4)} ETH
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Net Flow</p>
                <p className={`text-lg font-semibold ${
                  analytics.net_flow && parseFloat(analytics.net_flow) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.net_flow ? parseFloat(formatEther(safeBigInt(analytics.net_flow))).toFixed(4) : '0.0000'} ETH
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Most Used Bucket</p>
                <p className="text-lg font-semibold">
                  {analytics.most_used_bucket || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}