'use client';

import React, { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useGoalzUtils, useWithdrawFromGoal } from '@/lib/target-savings';
import { toast } from 'sonner';

interface WithdrawSheetProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: bigint;
  goalName: string;
  currentAmount: bigint;
}

export function WithdrawSheet({
  isOpen,
  onClose,
  goalId,
  goalName,
  currentAmount,
}: WithdrawSheetProps) {
  const { formatCurrency } = useGoalzUtils();
  const { withdrawFromGoal, isPending, isConfirmed, error } = useWithdrawFromGoal();
  
  const handleWithdraw = () => {
    // Note: The Goalz contract withdraw function withdraws ALL funds from the goal
    withdrawFromGoal({
      goalId,
    });
  };
  
  useEffect(() => {
    if (isConfirmed) {
      toast.success('Withdrawal successful!');
      // Don't close automatically - let user close manually
    }
  }, [isConfirmed]);
  
  useEffect(() => {
    if (error) {
      toast.error('Transaction failed. Please try again.');
    }
  }, [error]);

  return (
    <Sheet open={isOpen} onOpenChange={() => {}}>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle>Withdraw from {goalName}</SheetTitle>
          <SheetClose onClick={onClose} className="absolute right-4 top-4" />
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Current Balance */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available to Withdraw</span>
                <span className="font-medium">
                  {formatCurrency(currentAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Warning for full withdrawal */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 text-orange-800 rounded-md">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Full Withdrawal Notice</p>
              <p className="mt-1">
                This will withdraw ALL funds from your goal. The contract only supports full withdrawals.
              </p>
            </div>
          </div>
          
          {/* Full Withdrawal Confirmation */}
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">Full Withdrawal</p>
              <p className="text-sm text-muted-foreground">
                You will withdraw all funds from this goal
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(currentAmount)}
                </p>
                <p className="text-sm text-muted-foreground">Total amount to withdraw</p>
              </div>
            </div>
          </div>
          
          {/* Final warning */}
          <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4" />
            This action cannot be undone and will completely withdraw all funds from your goal.
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            
            <Button
              className="flex-1"
              onClick={handleWithdraw}
              disabled={isPending || currentAmount <= 0}
              variant="primary"
            >
              {isPending ? 'Processing...' : 'Withdraw All Funds'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}