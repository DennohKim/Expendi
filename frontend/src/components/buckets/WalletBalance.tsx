"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function WalletBalance() {

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Your Balance
        </h2>
        <div className="flex items-center space-x-2">
          {/* Eye icon */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
            </svg>
          </Button>
          
          {/* Refresh icon */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
            </svg>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Balance */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Balance
          </p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            1.5432 ETH
          </p>
        </div>

        {/* Balance breakdown */}
        <div className="grid grid-cols-2 gap-4">
          {/* Unallocated */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Unallocated
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              0.5432 ETH
            </p>
          </div>

          {/* Allocated */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Allocated
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              1.0000 ETH
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 