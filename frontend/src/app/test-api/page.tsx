'use client';

import React from 'react';
import { APITestComponent } from '@/components/test/APITestComponent-basic';

export default function TestAPIPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Backend API Integration Test</h1>
          <p className="text-muted-foreground">
            Test your frontend-backend API connection and verify the subscription system is working.
          </p>
        </div>
        
        <APITestComponent />
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="font-semibold text-blue-900 mb-2">📋 Quick Test Checklist</h2>
          <ul className="space-y-2 text-blue-800">
            <li>✅ Backend running on port 3001</li>
            <li>✅ Frontend accessing API endpoints</li>
            <li>✅ Queue status showing healthy</li>
            <li>✅ Environment variables loaded</li>
            <li>✅ Contract address configured</li>
          </ul>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="font-semibold text-green-900 mb-2">🎯 Next Steps</h2>
          <ol className="space-y-2 text-green-800 list-decimal list-inside">
            <li>Connect your wallet on the main subscription page</li>
            <li>Grant permission for subscription payments</li>
            <li>Create a test subscription</li>
            <li>Monitor the queue status for processing</li>
            <li>View your subscriptions in the dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
}