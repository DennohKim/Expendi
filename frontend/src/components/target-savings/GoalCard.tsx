'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Target, Calendar, DollarSign, Zap, Trash2 } from 'lucide-react';
import { GoalCard as GoalCardType } from '@/lib/target-savings';
import { useGoalzUtils, useAutomatedDeposit } from '@/lib/target-savings';
import { AutomationStatusCard } from './AutomationStatusCard';
import { AutomationSheet } from './AutomationSheet';
import { DeleteGoalModal } from './DeleteGoalModal';

interface GoalCardProps {
  goalCard: GoalCardType;
  onDeposit?: (goalId: bigint) => void;
  onWithdraw?: (goalId: bigint) => void;
  onViewDetails?: (goalId: bigint) => void;
}

export function GoalCard({
  goalCard,
  onDeposit,
  onWithdraw,
}: GoalCardProps) {
  const { formatCurrency, formatProgress, getDaysRemaining, getGoalStatus } = useGoalzUtils();
  const [isAutomationSheetOpen, setIsAutomationSheetOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const { id, goal, progress, interestEarned } = goalCard;
  const progressPercentage = formatProgress(progress.progressPercentage);
  const daysRemaining = getDaysRemaining(goal.deadline);
  const status = getGoalStatus(goal, progress);
  
  // Check if automation is active
  const { data: automation } = useAutomatedDeposit(id);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold mb-1">{goal.name}</CardTitle>
            <Badge className={getStatusColor(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        {/* Amount Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Current</span>
            </div>
            <p className="text-sm font-medium">{formatCurrency(goal.currentAmount)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Target</span>
            </div>
            <p className="text-sm font-medium">{formatCurrency(goal.targetAmount)}</p>
          </div>
        </div>
        
        {/* Interest & Deadline */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Interest Earned</span>
            <p className="text-sm font-medium text-green-600">
              +{formatCurrency(interestEarned)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Days Left</span>
            </div>
            <p className="text-sm font-medium">
              {progress.isExpired ? '0' : daysRemaining}
            </p>
          </div>
        </div>
        
        {/* Automation Status */}
        {automation && automation.isActive && (
          <AutomationStatusCard
            goalId={id}
            targetAmount={goal.targetAmount}
            currentAmount={goal.currentAmount}
            depositToken={goal.depositToken}
          />
        )}
        
        {/* Action Buttons */}
        {status === 'active' && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => onDeposit?.(id)}
            >
              Deposit
            </Button>
            {!automation?.isActive && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsAutomationSheetOpen(true)}
              >
                <Zap className="h-3 w-3 mr-1" />
                Automate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onWithdraw?.(id)}
            >
              Withdraw
            </Button>
          </div>
        )}
        
        {(status === 'completed' || status === 'expired') && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onWithdraw?.(id)}
          >
            Withdraw All
          </Button>
        )}
      </CardContent>
      
      {/* Automation Sheet */}
      <AutomationSheet
        isOpen={isAutomationSheetOpen}
        onClose={() => setIsAutomationSheetOpen(false)}
        goalId={id}
        goalName={goal.name}
        targetAmount={goal.targetAmount}
        currentAmount={goal.currentAmount}
        depositToken={goal.depositToken}
      />
      
      {/* Delete Goal Modal */}
      <DeleteGoalModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        goalId={id}
        goalName={goal.name}
        currentAmount={goal.currentAmount}
        shareBalance={goal.shareBalance}
        tokenDecimals={6}
      />
    </Card>
  );
}