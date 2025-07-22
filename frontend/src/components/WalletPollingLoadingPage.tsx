"use client";

import React from 'react';
import Image from 'next/image';
import { Loader2, CheckCircle, Clock, Wallet } from 'lucide-react';

interface WalletPollingLoadingPageProps {
  txHash?: string;
  attempt?: number;
  maxAttempts?: number;
}

export function WalletPollingLoadingPage({ 
  txHash, 
  attempt = 1, 
  maxAttempts = 10 
}: WalletPollingLoadingPageProps) {
  const progress = (attempt / maxAttempts) * 100;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ff7e5f]/5 to-[#ff7e5f]/10 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
        <div className="text-center">
          {/* Logo */}
          <div className="mx-auto w-16 h-16 bg-[#ff7e5f]/20 dark:bg-[#ff7e5f]/10 rounded-full flex items-center justify-center mb-6">
            <Image src="/images/logo/logo-icon.svg" alt="Expendi" width={32} height={32} />
          </div>
          
          {/* Main heading */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Setting up your budget account
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Your budget account is being created. This usually takes a few seconds.
          </p>
          
          {/* Progress steps */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Transaction submitted
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 animate-spin" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Indexing account data
                </span>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                {attempt}/{maxAttempts}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Complete setup
                </span>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-[#ff7e5f] h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          {/* Transaction hash */}
          {txHash && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash</p>
              <p className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                {txHash}
              </p>
            </div>
          )}
          
          {/* Info message */}
          <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                Creating your smart account
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                We&apos;re setting up your budget account with automatic spending controls and gas sponsorship features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}