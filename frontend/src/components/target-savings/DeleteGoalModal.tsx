'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDeleteGoal } from '@/lib/target-savings';
import { formatUnits } from 'viem';
import { toast } from 'sonner';

interface DeleteGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: bigint;
  goalName: string;
  currentAmount: bigint;
  shareBalance: bigint;
  tokenDecimals?: number;
}

export function DeleteGoalModal({
  isOpen,
  onClose,
  goalId,
  goalName,
  currentAmount,
  shareBalance,
  tokenDecimals = 6,
}: DeleteGoalModalProps) {
  const { deleteGoal, isPending, isConfirming, isConfirmed, error } = useDeleteGoal();
  
  const hasFunds = currentAmount > BigInt(0) || shareBalance > BigInt(0);
  const formattedAmount = formatUnits(currentAmount, tokenDecimals);

  const handleDelete = () => {
    if (hasFunds) return;
    
    try {
      deleteGoal(goalId);
    } catch (err) {
      console.error('Error deleting goal:', err);
      toast.error('Failed to delete goal');
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      toast.success('Goal deleted successfully!');
      onClose();
    }
  }, [isConfirmed, onClose]);

  useEffect(() => {
    if (error) {
      toast.error('Failed to delete goal. Please try again.');
    }
  }, [error]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Goal
          </DialogTitle>
          <DialogDescription>
            {hasFunds 
              ? 'This goal cannot be deleted because it contains funds.'
              : 'Are you sure you want to delete this goal? This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Goal Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Goal Name</p>
              <p className="text-base font-semibold">{goalName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
              <p className={`text-base font-semibold ${hasFunds ? 'text-destructive' : 'text-green-600'}`}>
                ${formattedAmount}
              </p>
            </div>
          </div>

          {/* Warning Message */}
          {hasFunds && (
            <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Cannot Delete Goal With Funds
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You must withdraw all funds before deleting this goal. Please use the withdraw button to remove all funds first.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Message when no funds */}
          {!hasFunds && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                This will permanently delete the goal and cannot be undone. Make sure you want to proceed.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending || isConfirming}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={hasFunds || isPending || isConfirming}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Goal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

