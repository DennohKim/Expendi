'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Zap, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp
} from 'lucide-react';
import {
  useAutomatedDeposit,
  useAutomationMetrics,
  useAutomationAllowanceCheck,
  formatFrequency,
  formatNextDeposit,
  useGoalzUtils,
  useCancelAutomation,
} from '@/lib/target-savings';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Address } from 'viem';

interface AutomationStatusCardProps {
  goalId: bigint;
  targetAmount: bigint;
  currentAmount: bigint;
  depositToken: Address;
}

export function AutomationStatusCard({
  goalId,
  targetAmount,
  currentAmount,
  depositToken,
}: AutomationStatusCardProps) {
  const { address } = useAccount();
  const { formatCurrency } = useGoalzUtils();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Ensure component is mounted on client before rendering Dialog
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Fetch automation data
  const { data: automation, refetch } = useAutomatedDeposit(goalId);
  const { cancelAutomation, isPending: isCancelling, isConfirmed: isCancelled } = useCancelAutomation();
  
  // Calculate metrics
  const metrics = useAutomationMetrics(goalId, targetAmount, currentAmount, automation);
  
  // Check allowance status
  const { hasEnoughAllowance, currentAllowance, shortfall } = useAutomationAllowanceCheck(
    depositToken,
    address,
    metrics.approvalNeeded
  );
  
  // Handle cancel
  React.useEffect(() => {
    if (isCancelled) {
      toast.success('Automation cancelled successfully');
      setShowCancelDialog(false);
      refetch();
    }
  }, [isCancelled, refetch]);
  
  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };
  
  const handleConfirmCancel = () => {
    cancelAutomation(goalId);
  };
  
  if (!automation || !automation.isActive) {
    return null;
  }
  
  // Determine status
  const hasLowAllowance = !hasEnoughAllowance && metrics.depositsRemaining > 0;
  const isNearCompletion = metrics.depositsRemaining <= 3;
  const isDue = automation.nextDepositDate && automation.nextDepositDate < new Date();
  
  return (
    <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-transparent">
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">Automated Deposits</h4>
                  <Badge variant={isDue ? 'default' : 'secondary'} className="text-xs">
                    {isDue ? 'Due Now' : 'Active'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(automation.amount)} • {formatFrequency(automation.frequency)}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelClick}
              disabled={isCancelling}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Cancel
            </Button>
          </div>
          
          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Next Deposit</p>
                <p className="text-sm font-medium" suppressHydrationWarning>
                  {automation.nextDepositDate 
                    ? formatNextDeposit(automation.nextDepositDate)
                    : 'Calculating...'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-sm font-medium">
                  {metrics.depositsRemaining} deposit{metrics.depositsRemaining !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Completion</p>
                <p className="text-sm font-medium">
                  ~{metrics.daysToCompletion} days
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              {hasEnoughAllowance ? (
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Allowance</p>
                <p className="text-sm font-medium">
                  {hasEnoughAllowance ? 'Sufficient' : 'Low'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Warnings */}
          {hasLowAllowance && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-md text-xs">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Low Token Allowance</p>
                <p className="mt-1">
                  Current allowance: {formatCurrency(currentAllowance)}
                  <br />
                  Need additional: {formatCurrency(shortfall)}
                  <br />
                  Please approve more tokens to continue automation.
                </p>
              </div>
            </div>
          )}
          
          {isNearCompletion && !hasLowAllowance && (
            <div className="flex items-start gap-2 p-3 bg-green-50 text-green-800 rounded-md text-xs">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Almost There!</p>
                <p className="mt-1">
                  Only {metrics.depositsRemaining} more deposit{metrics.depositsRemaining !== 1 ? 's' : ''} until your goal is complete.
                </p>
              </div>
            </div>
          )}
          
          {isDue && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-md text-xs">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Deposit Due</p>
                <p className="mt-1">
                  The next scheduled deposit is due now. Gelato will process it automatically 
                  if you have sufficient balance and allowance.
                </p>
              </div>
            </div>
          )}
          
          {/* Next Deposit Date */}
          {automation.nextDepositDate && !isDue && (
            <div className="text-xs text-muted-foreground" suppressHydrationWarning>
              Next deposit scheduled for{' '}
              <span className="font-medium text-foreground">
                {automation.nextDepositDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Cancel Confirmation Dialog - Only render on client */}
      {isMounted && (
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Cancel Automation?
              </DialogTitle>
              <DialogDescription className="pt-4 space-y-3 text-left">
                <p>
                  Are you sure you want to cancel automated deposits for this goal?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
                  <p className="font-medium mb-1">This will:</p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Stop all future automated deposits</li>
                    <li>Remove the Gelato automation task</li>
                    <li>Require manual deposits to continue progress</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your existing deposits and goal progress will not be affected. You can set up automation again anytime.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
              >
                Keep Automation
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Automation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

