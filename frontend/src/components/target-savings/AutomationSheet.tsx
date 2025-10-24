'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Zap,
  CalendarDays,
  TrendingUp,
  Info,
  DollarSign
} from 'lucide-react';
import {
  useTokenBalance,
  useTokenAllowance,
  useTokenApproval,
  useCreateAutomation,
  useGoalzUtils,
  useAutomationAllowanceCheck,
  CONTRACTS,
  AUTOMATION_INTERVALS,
  AUTOMATION_LABELS,
  AUTOMATION_CONFIG,
} from '@/lib/target-savings';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';

interface AutomationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: bigint;
  goalName: string;
  targetAmount: bigint;
  currentAmount: bigint;
  depositToken: string;
}

type SetupStep = 'configure' | 'approve' | 'gelato' | 'confirm';

export function AutomationSheet({
  isOpen,
  onClose,
  goalId,
  goalName,
  targetAmount,
  currentAmount,
}: AutomationSheetProps) {
  const [step, setStep] = useState<SetupStep>('configure');
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState<number>(AUTOMATION_INTERVALS.WEEKLY);
  const [customFrequency, setCustomFrequency] = useState('');
  
  const { address } = useAccount();
  const { formatCurrency, parseAmount } = useGoalzUtils();
  
  // Contract hooks
  const { data: balance } = useTokenBalance(CONTRACTS.USDC, address);
  useTokenAllowance(CONTRACTS.USDC, address, CONTRACTS.GOALZ);
  const { approveToken, isPending: isApproving, isConfirmed: isApproved } = useTokenApproval();
  const { createAutomation, isPending: isCreating, isConfirmed: isCreated } = useCreateAutomation();
  
  // Parse amounts
  const depositAmountBigInt = depositAmount ? parseAmount(depositAmount) : BigInt(0);
  const frequencyInSeconds = selectedFrequency === AUTOMATION_INTERVALS.CUSTOM && customFrequency
    ? BigInt(Math.floor(parseFloat(customFrequency) * 86400)) // Convert days to seconds
    : BigInt(selectedFrequency);
  
  // Calculate automation metrics
  const remainingAmount = targetAmount - currentAmount;
  const estimatedDeposits = depositAmountBigInt > 0
    ? Math.ceil(Number(remainingAmount) / Number(depositAmountBigInt))
    : 0;
  
  const requiredApproval = depositAmountBigInt * BigInt(estimatedDeposits);
  const approvalWithBuffer = requiredApproval + (requiredApproval * BigInt(10)) / BigInt(100); // 10% buffer
  
  // Check allowance
  const { hasEnoughAllowance } = useAutomationAllowanceCheck(
    CONTRACTS.USDC,
    address,
    approvalWithBuffer
  );
  
  // Calculate estimated completion
  const estimatedCompletionDays = estimatedDeposits > 0 && frequencyInSeconds > 0
    ? Math.ceil((estimatedDeposits * Number(frequencyInSeconds)) / 86400)
    : 0;
  
  // Validation
  const hasInsufficientBalance = balance !== undefined && depositAmountBigInt > balance?.value;
  const isAmountTooSmall = depositAmountBigInt < AUTOMATION_CONFIG.MIN_DEPOSIT_AMOUNT;
  const isFrequencyTooShort = frequencyInSeconds < BigInt(AUTOMATION_CONFIG.MIN_INTERVAL);
  const willExceedTarget = depositAmountBigInt > remainingAmount;
  const showLowDepositsWarning = estimatedDeposits < AUTOMATION_CONFIG.MIN_DEPOSITS_FOR_WARNING;
  
  const canProceed = depositAmountBigInt > 0 
    && !hasInsufficientBalance 
    && !isAmountTooSmall 
    && !isFrequencyTooShort
    && !willExceedTarget;
  
  // Handle state transitions
  useEffect(() => {
    if (isApproved && step === 'approve') {
      toast.success('Token approval successful!');
      setStep('gelato');
    }
  }, [isApproved, step]);
  
  useEffect(() => {
    if (isCreated) {
      toast.success('Automation created successfully!');
      onClose();
    }
  }, [isCreated, onClose]);
  
  const handleNext = () => {
    if (!canProceed) return;
    
    if (!hasEnoughAllowance) {
      setStep('approve');
    } else {
      setStep('gelato');
    }
  };
  
  const handleApprove = () => {
    approveToken(CONTRACTS.USDC, approvalWithBuffer);
  };
  
  const handleCreateAutomation = () => {
    createAutomation({
      goalId,
      amount: depositAmountBigInt,
      interval: frequencyInSeconds,
    });
  };
  
  const resetModal = () => {
    setDepositAmount('');
    setSelectedFrequency(AUTOMATION_INTERVALS.WEEKLY);
    setCustomFrequency('');
    setStep('configure');
  };
  
  useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={() => {}}>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Automate Deposits for {goalName}
          </SheetTitle>
          <SheetClose onClick={onClose} className="absolute right-4 top-4" />
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {(['configure', 'approve', 'gelato', 'confirm'] as SetupStep[]).map((s, idx) => (
              <div key={s} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {idx + 1}
                </div>
                {idx < 3 && (
                  <div className={`w-12 h-0.5 ${step === s ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          
          {/* Goal Info */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining to Goal</span>
                <span className="font-medium">{formatCurrency(remainingAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available Balance</span>
                <span className="font-medium">
                  {balance?.value !== undefined ? formatCurrency(balance.value) : '...'}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Step: Configure */}
          {step === 'configure' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Deposit Amount (USDC)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="100.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
                {isAmountTooSmall && depositAmount && (
                  <p className="text-xs text-red-600 mt-1">
                    Minimum deposit is {formatCurrency(AUTOMATION_CONFIG.MIN_DEPOSIT_AMOUNT)}
                  </p>
                )}
                {willExceedTarget && depositAmount && (
                  <p className="text-xs text-red-600 mt-1">
                    Amount exceeds remaining goal amount
                  </p>
                )}
              </div>
              
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Frequency
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(AUTOMATION_INTERVALS)
                    .filter(([key]) => key !== 'CUSTOM')
                    .map(([key, value]) => (
                      <Button
                        key={key}
                        variant={selectedFrequency === value ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedFrequency(value)}
                      >
                        {AUTOMATION_LABELS[value]}
                      </Button>
                    ))}
                </div>
                
                {/* Custom frequency option */}
                <div className="mt-3">
                  <Button
                    variant={selectedFrequency === AUTOMATION_INTERVALS.CUSTOM ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFrequency(AUTOMATION_INTERVALS.CUSTOM)}
                    className="w-full"
                  >
                    Custom Frequency
                  </Button>
                  {selectedFrequency === AUTOMATION_INTERVALS.CUSTOM && (
                    <div className="mt-2">
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        placeholder="Enter days"
                        value={customFrequency}
                        onChange={(e) => setCustomFrequency(e.target.value)}
                      />
                      {isFrequencyTooShort && customFrequency && (
                        <p className="text-xs text-red-600 mt-1">
                          Minimum frequency is 1 day
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Estimates */}
              {canProceed && estimatedDeposits > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">Estimated Plan</p>
                        <ul className="mt-2 space-y-1 text-blue-800">
                          <li>• {estimatedDeposits} deposits of {formatCurrency(depositAmountBigInt)}</li>
                          <li>• Every {selectedFrequency === AUTOMATION_INTERVALS.CUSTOM 
                            ? `${customFrequency} days` 
                            : AUTOMATION_LABELS[selectedFrequency].toLowerCase()}</li>
                          <li>• Goal completion in ~{estimatedCompletionDays} days</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Low deposits warning */}
              {showLowDepositsWarning && estimatedDeposits > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    With only {estimatedDeposits} deposits, you&apos;ll need to renew approval soon. 
                    Consider smaller, more frequent deposits for longer automation.
                  </p>
                </div>
              )}
              
              {/* Validation messages */}
              {hasInsufficientBalance && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Insufficient balance for first deposit
                </div>
              )}
            </div>
          )}
          
          {/* Step: Approve */}
          {step === 'approve' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Approve Token Access</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Allow the contract to automatically transfer USDC for your scheduled deposits
                </p>
              </div>
              
              <Card className="bg-gray-50">
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approval Amount:</span>
                    <span className="font-medium">{formatCurrency(approvalWithBuffer)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">For Deposits:</span>
                    <span className="font-medium">{estimatedDeposits} × {formatCurrency(depositAmountBigInt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buffer (10%):</span>
                    <span className="font-medium">{formatCurrency(approvalWithBuffer - requiredApproval)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-md text-sm">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">Calculated Approval Strategy</p>
                  <p className="mt-1">
                    We&apos;re approving enough for {estimatedDeposits} deposits plus a 10% buffer. 
                    You&apos;ll need to renew approval after ~{estimatedDeposits} deposits.
                  </p>
                  <p className="mt-1 text-xs">
                    You can revoke this approval anytime from your wallet.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Step: Gelato Info */}
          {step === 'gelato' && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Gelato Network</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automated execution powered by Gelato
                  </p>
                </div>
              </div>
              
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-2 text-sm text-purple-900">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>Gelato will automatically execute deposits on your schedule</p>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-purple-900">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>Small gas fees are deducted from your deposits</p>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-purple-900">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>You can cancel automation anytime</p>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Make sure you maintain sufficient USDC balance and token allowance for 
                  automated deposits to work properly.
                </p>
              </div>
              
              <Button
                className="w-full"
                onClick={() => setStep('confirm')}
              >
                Continue to Confirmation
              </Button>
            </div>
          )}
          
          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                  <CalendarDays className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Confirm Automation</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review your automated deposit plan
                  </p>
                </div>
              </div>
              
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Goal:</span>
                    <span className="font-medium">{goalName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deposit Amount:</span>
                    <span className="font-medium">{formatCurrency(depositAmountBigInt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="font-medium">
                      {selectedFrequency === AUTOMATION_INTERVALS.CUSTOM 
                        ? `Every ${customFrequency} days` 
                        : AUTOMATION_LABELS[selectedFrequency]}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Deposits:</span>
                    <span className="font-medium">{estimatedDeposits}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion:</span>
                    <span className="font-medium">~{estimatedCompletionDays} days</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={step === 'configure' ? onClose : () => setStep('configure')}
              disabled={isApproving || isCreating}
            >
              {step === 'configure' ? 'Cancel' : 'Back'}
            </Button>
            
            {step === 'configure' && (
              <Button
                className="flex-1"
                onClick={handleNext}
                disabled={!canProceed}
                variant="primary"
              >
                {hasEnoughAllowance ? 'Continue' : 'Next: Approve'}
              </Button>
            )}
            
            {step === 'approve' && (
              <Button
                className="flex-1"
                onClick={handleApprove}
                disabled={isApproving}
                variant="primary"
              >
                {isApproving ? 'Approving...' : `Approve ${formatCurrency(approvalWithBuffer)}`}
              </Button>
            )}
            
            {step === 'confirm' && (
              <Button
                className="flex-1"
                onClick={handleCreateAutomation}
                disabled={isCreating}
                variant="primary"
              >
                {isCreating ? 'Creating...' : 'Create Automation'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

