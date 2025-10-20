'use client';

import React, { useState } from 'react';
import { useQueueStatus } from '@/hooks/useSubscriptionAPI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Activity } from 'lucide-react';

export function APITestComponent() {
  const { data: status, isLoading, error, refetch } = useQueueStatus(10000); // Refresh every 10 seconds
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Update last update time when data changes
  React.useEffect(() => {
    if (status) {
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [status]);

  const testDirectAPI = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v2/subscriptions/queue/status');
      const data = await response.json();
      console.log('🧪 Direct API Test Result:', data);
      
      if (data.success) {
        alert('✅ Direct API call successful! Check console for details.');
      } else {
        alert('❌ API call failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Direct API test failed:', error);
      alert('❌ Direct API call failed: ' + (error as Error).message);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Backend API Integration Test
        </CardTitle>
        <CardDescription>
          Testing connection to backend API at http://localhost:3001
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            {status ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">
              API Connection: {status ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Queue Status */}
        {status && (
          <div className="space-y-3">
            <h3 className="font-semibold">Queue Status</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center p-3 bg-yellow-50 rounded-lg border">
                <div className="text-2xl font-bold text-yellow-600">{status.stats.waiting}</div>
                <div className="text-sm text-yellow-700">Waiting</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{status.stats.active}</div>
                <div className="text-sm text-blue-700">Active</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{status.stats.completed}</div>
                <div className="text-sm text-green-700">Completed</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg border">
                <div className="text-2xl font-bold text-red-600">{status.stats.failed}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">{status.stats.delayed}</div>
                <div className="text-sm text-purple-700">Delayed</div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Last updated: {lastUpdate}
            </div>
          </div>
        )}

        {/* Test Buttons */}
        <div className="space-y-2">
          <h3 className="font-semibold">API Tests</h3>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={testDirectAPI}
              className="flex-1"
            >
              Test Direct API Call
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.open('http://localhost:3001/api/v2/subscriptions/queue/status', '_blank')}
              className="flex-1"
            >
              Open API in New Tab
            </Button>
          </div>
        </div>

        {/* API Details */}
        <div className="space-y-2">
          <h3 className="font-semibold">Configuration</h3>
          
          <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
            <div>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}</div>
            <div>Contract: {process.env.NEXT_PUBLIC_EXPENDI_SUBSCRIPTION_CONTRACT_ADDRESS}</div>
            <div>Chain ID: {process.env.NEXT_PUBLIC_CHAIN_ID}</div>
          </div>
        </div>

        {/* Raw Response */}
        {status && (
          <details className="space-y-2">
            <summary className="font-semibold cursor-pointer">Raw API Response</summary>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto">
              {JSON.stringify(status, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}