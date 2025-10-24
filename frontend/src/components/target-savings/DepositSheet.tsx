'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import {
  useTokenBalance,
  useTokenAllowance,
  useTokenApproval,
  useDepositToGoal,
  useGoalzUtils,
  CONTRACTS,
} from '@/lib/target-savings';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

interface DepositSheetProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: bigint;
  goalName: string;
}

export function DepositSheet({ isOpen, onClose, goalId, goalName }: DepositSheetProps) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approve' | 'deposit'>('input');
  
  const { address } = useAccount();
  const { formatCurrency, parseAmount, formatAmount } = useGoalzUtils();
  
  // Contract hooks using EOA
  const { data: balance } = useTokenBalance(CONTRACTS.USDC, address);
  const { data: allowance } = useTokenAllowance(CONTRACTS.USDC, address, CONTRACTS.GOALZ);
  const { approveToken, isPending: isApproving, isConfirmed: isApproved } = useTokenApproval();
  const { depositToGoal, isPending: isDepositing, isConfirmed: isDeposited } = useDepositToGoal();
  
  const depositAmount = amount ? parseAmount(amount) : BigInt(0);
  const needsApproval = allowance !== undefined && depositAmount > allowance;
  const hasInsufficientBalance = balance !== undefined && depositAmount > balance?.value;
  
  const handleNext = () => {
    if (!amount || depositAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (hasInsufficientBalance) {
      toast.error('Insufficient balance');
      return;
    }
    
    if (needsApproval) {
      setStep('approve');
    } else {
      setStep('deposit');
    }
  };
  
  const handleApprove = () => {
    approveToken(CONTRACTS.USDC, depositAmount);
  };
  
  const handleDeposit = () => {
    depositToGoal({
      goalId,
      amount: depositAmount,
    });
  };
  
  // Handle state transitions
  useEffect(() => {
    if (isApproved && step === 'approve') {
      setStep('deposit');
      toast.success('Token approval successful!');
    }
  }, [isApproved, step]);
  
  useEffect(() => {
    if (isDeposited) {
      toast.success('Deposit successful!');
      // Don't close automatically - let user close manually
      setAmount('');
      setStep('input');
    }
  }, [isDeposited]);
  
  const resetModal = () => {
    setAmount('');
    setStep('input');
  };
  
  useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={() => {}}>
      <SheetContent className="w-96">
        <SheetHeader>
          <SheetTitle>Deposit to {goalName}</SheetTitle>
          <SheetClose onClick={onClose} className="absolute right-4 top-4" />
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Balance Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Balance</span>
                <span className="font-medium">
                  {balance?.value !== undefined ? formatCurrency(balance.value) : '...'}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {step === 'input' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Deposit Amount (USDC)
                  </div>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
                {amount && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatAmount(depositAmount)} USDC
                  </p>
                )}
              </div>
              
              {/* Quick amount buttons */}
              {balance?.value && (
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 100].map((percent) => {
                    const quickAmount = (balance.value * BigInt(percent)) / BigInt(100);
                    return (
                      <Button
                        key={percent}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(formatAmount(quickAmount))}
                      >
                        {percent}%
                      </Button>
                    );
                  })}
                </div>
              )}
              
              {/* Validation Messages */}
              {hasInsufficientBalance && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Insufficient balance
                </div>
              )}
              
              {needsApproval && !hasInsufficientBalance && amount && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Token approval required for this amount
                </div>
              )}
            </>
          )}
          
          {step === 'approve' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Approve Token Access</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Allow the contract to access your USDC tokens for deposits
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm">
                  <span className="text-muted-foreground">Amount: </span>
                  <span className="font-medium">{formatCurrency(depositAmount)}</span>
                </p>
              </div>
            </div>
          )}
          
          {step === 'deposit' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Confirm Deposit</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Deposit {formatCurrency(depositAmount)} to your goal
                </p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isApproving || isDepositing}
            >
              Cancel
            </Button>
            
            {step === 'input' && (
              <Button
                className="flex-1"
                variant="primary"
                onClick={handleNext}
                disabled={!amount || hasInsufficientBalance || depositAmount <= 0}
              >
                {needsApproval ? 'Next' : 'Deposit'}
              </Button>
            )}
            
            {step === 'approve' && (
              <Button
                className="flex-1"
                onClick={handleApprove}
                disabled={isApproving}
                variant="primary"
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
            )}
            
            {step === 'deposit' && (
              <Button
                className="flex-1"
                onClick={handleDeposit}
                disabled={isDepositing}
                variant="primary"
              >
                {isDepositing ? 'Depositing...' : 'Confirm Deposit'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}