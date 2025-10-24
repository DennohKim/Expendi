'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { GoalsList } from '@/components/target-savings';
import { CreateGoalForm } from '@/components/target-savings';
import { GoalStatsOverview } from '@/components/target-savings';

const TargetSavingsPage = () => {
  const { address, isConnected } = useAccount();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Target Savings</h1>
        <p className="text-muted-foreground">
          Create and manage your savings goals with automated deposits and yield generation
        </p>
      </div>
      
      {/* Statistics Overview */}
      <GoalStatsOverview userAddress={isConnected ? address : undefined} />
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Create Goal Form - Right sidebar */}
        <div className="col-span-12 h-auto mb-4 w-full overflow-y-auto xl:col-span-4 xl:order-2 xl:h-[calc(100vh-300px)] xl:mb-0">
          <CreateGoalForm userAddress={isConnected ? address : undefined} />
        </div>
        
        {/* Goals List - Main content area */}
        <div className="col-span-12 h-[calc(100vh-300px)] overflow-y-auto pr-2 xl:col-span-8 xl:order-1">
          <div className="mb-1 pb-4 sticky top-0 bg-white dark:bg-gray-900 z-10 pr-2">
            <h2 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">My Savings Goals</h2>
          </div>
          <GoalsList userAddress={isConnected ? address : undefined} />
        </div>
      </div>
    </div>
  );
};

export default TargetSavingsPage;