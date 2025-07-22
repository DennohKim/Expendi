import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

const WalletPageSkeleton = () => {
  return (
    <>
      <div>
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Quick Spend Tab - Above buckets on small/medium, right side on large */}
          <div className="col-span-12 h-auto mb-4 w-full xl:col-span-8 xl:h-[calc(100vh-120px)] xl:mb-0 overflow-y-auto pr-2">
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Budget Account
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your budget account and view balance information
              </p>
            </div>

            {/* Wallet Information Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold">
                  Wallet Details
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Refresh wallet data"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor" />
                  </svg>
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Smart Account Address */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Smart Account Address
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Smart Account
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2" />
                        <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Balance Section */}
                <div className="space-y-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Balance Overview
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Budget Wallet Balance */}
                    <div className="text-center p-6 bg-[#ff7e5f]/10 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Budget Account
                      </div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Available for budgeting
                      </div>
                    </div>
                    {/* User Wallet Balance */}
                    <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Your Wallet Balance
                      </div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Available to deposit
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                      <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="2" />
                      <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor" />
                    </svg>
                    Refresh
                  </Button>
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Unallocated
                    </p>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Allocated
                    </p>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Wallet Status
                    </p>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      Active
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Buckets Grid - Below QuickSpend on small/medium, left side on large */}
          <div className="col-span-12 h-[calc(100vh-120px)] xl:col-span-4">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Control Funds
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Allocate or withdraw funds from your budget account
              </p>
            </div>
            <div className="container mx-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Allocate Funds
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading your wallet information...
                  </p>
                </div>
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default WalletPageSkeleton
