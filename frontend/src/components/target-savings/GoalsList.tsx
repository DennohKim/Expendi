'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Address } from 'viem';
import { useFilteredGoals } from '@/lib/target-savings';
import { GoalCard } from './GoalCard';
import { DepositSheet } from './DepositSheet';
import { WithdrawSheet } from './WithdrawSheet';

interface GoalsListProps {
  userAddress: Address | undefined;
}

export function GoalsList({ userAddress }: GoalsListProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'progress' | 'amount'>('newest');
  const [selectedGoalId, setSelectedGoalId] = useState<bigint | null>(null);
  const [depositSheetOpen, setDepositSheetOpen] = useState(false);
  const [withdrawSheetOpen, setWithdrawSheetOpen] = useState(false);
  
  const { goals, isLoading } = useFilteredGoals(userAddress, activeTab, sortBy);
  console.log("goals", goals);
  
  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  
  const handleDeposit = (goalId: bigint) => {
    setSelectedGoalId(goalId);
    setDepositSheetOpen(true);
  };
  
  const handleWithdraw = (goalId: bigint) => {
    setSelectedGoalId(goalId);
    setWithdrawSheetOpen(true);
  };


  if (!userAddress) {
    return (
      <div className="text-center py-12">
        <Target className="mx-auto h-16 w-16 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Connect Your Wallet</h3>
        <p className="mt-2 text-muted-foreground">
          Connect your wallet to view your savings goals
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Active
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="expired" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Expired
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
            <SelectItem value="amount">Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Goals Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12">
          <Target className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">
            {activeTab === 'all' ? 'No goals yet' : `No ${activeTab} goals`}
          </h3>
          <p className="mt-2 text-muted-foreground mb-6">
            {activeTab === 'all'
              ? 'Create your first savings goal using the form on the right'
              : `You don't have any ${activeTab} goals at the moment`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goalCard) => (
            <GoalCard
              key={goalCard.id.toString()}
              goalCard={goalCard}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
            />
          ))}
        </div>
      )}
      
      {/* Sheets for deposit/withdraw */}
      {selectedGoal && (
        <>
          <DepositSheet
            isOpen={depositSheetOpen}
            onClose={() => setDepositSheetOpen(false)}
            goalId={selectedGoal.id}
            goalName={selectedGoal.goal.name}
          />
          <WithdrawSheet
            isOpen={withdrawSheetOpen}
            onClose={() => setWithdrawSheetOpen(false)}
            goalId={selectedGoal.id}
            goalName={selectedGoal.goal.name}
            currentAmount={selectedGoal.goal.currentAmount}
          />
        </>
      )}
    </div>
  );
}