"use client";

import React from 'react';
import { formatUnits, parseUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { useMorphoVault } from '@/hooks/useMorphoVault';
import { useSmartAccount } from '@/context/SmartAccountContext';
import { toast } from 'sonner';

interface MorphoVaultCardProps {
  vaultAddress: string;
  vaultName: string;
  curator?: string;
  baseAPY: number;
  rewardAPR?: number;
  description?: string;
  riskLevel?: string;
}

export const MorphoVaultCard = React.memo(function MorphoVaultCard({ 
  vaultAddress, 
  vaultName, 
  curator,
  baseAPY, 
  rewardAPR = 0,
  description,
  riskLevel
}: MorphoVaultCardProps) {
  const [depositAmount, setDepositAmount] = React.useState('');
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [isDepositOpen, setIsDepositOpen] = React.useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false);

  const { smartAccountReady } = useSmartAccount();
  
  const {
    userShares,
    isLoading,
    deposit,
    withdraw,
    needsApproval,
    userUSDCBalance,
    estimatedValue
  } = useMorphoVault(vaultAddress);

  const totalAPY = baseAPY + rewardAPR;
  
  const calculations = React.useMemo(() => {
    const userSharesFormatted = userShares ? formatUnits(userShares, 18) : '0';
    const userBalanceFormatted = userUSDCBalance ? formatUnits(userUSDCBalance, 6) : '0';
    const estimatedValueFormatted = estimatedValue ? formatUnits(estimatedValue, 6) : '0';
    
    return {
      userSharesFormatted,
      userBalanceFormatted,
      estimatedValueFormatted
    };
  }, [userShares, userUSDCBalance, estimatedValue]);

  const handleDeposit = async () => {
    if (!depositAmount) return;
    if (!smartAccountReady) {
      toast.error('Smart account not ready. Please wait...');
      return;
    }
    
    try {
      const amount = parseUnits(depositAmount, 6);
      
      // Check if user has sufficient balance
      if (!userUSDCBalance || userUSDCBalance < amount) {
        const currentBalance = userUSDCBalance ? parseFloat(formatUnits(userUSDCBalance, 6)).toFixed(2) : '0.00';
        const neededAmount = parseFloat(formatUnits(amount, 6)).toFixed(2);
        toast.error(`Insufficient USDC balance. You have ${currentBalance} USDC but need ${neededAmount} USDC`);
        return;
      }
      
      if (needsApproval) {
        toast.info('Processing approve and deposit in single transaction...');
      } else {
        toast.info('Processing deposit...');
      }
      
      await deposit(amount);
      toast.success('Deposit successful! Funds now earning yield in Morpho vault.');
      setDepositAmount('');
      setIsDepositOpen(false);
    } catch (error: unknown) {
      console.error('Deposit failed:', error);
      
      // Enhanced error handling like wallet page
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('User rejected') || 
          errorMessage.includes('rejected') ||
          errorMessage.includes('User exited') ||
          errorMessage.includes('user rejected')) {
        toast.error('Transaction was cancelled by user');
      } else if (errorMessage.includes('timeout') || 
                 errorMessage.includes('timed out')) {
        toast.error('Transaction is taking longer than expected. Please check your wallet or try again.');
      } else if (errorMessage.includes('insufficient funds') || 
                 errorMessage.includes('insufficient balance')) {
        toast.error('Insufficient USDC balance for this deposit');
      } else {
        toast.error('Deposit failed: ' + (errorMessage || 'Unknown error'));
      }
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    if (!smartAccountReady) {
      toast.error('Smart account not ready. Please wait...');
      return;
    }
    
    try {
      const amount = parseUnits(withdrawAmount, 6);
      
      // Check if user has sufficient vault balance
      if (!estimatedValue || estimatedValue < amount) {
        const currentBalance = estimatedValue ? parseFloat(formatUnits(estimatedValue, 6)).toFixed(2) : '0.00';
        const requestedAmount = parseFloat(formatUnits(amount, 6)).toFixed(2);
        toast.error(`Insufficient vault balance. You have ${currentBalance} USDC deposited but trying to withdraw ${requestedAmount} USDC`);
        return;
      }
      
      toast.info('Processing withdrawal from Morpho vault...');
      await withdraw(amount);
      toast.success('Withdrawal successful! USDC returned to your account.');
      setWithdrawAmount('');
      setIsWithdrawOpen(false);
    } catch (error: unknown) {
      console.error('Withdraw failed:', error);
      
      // Enhanced error handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('User rejected') || 
          errorMessage.includes('rejected') ||
          errorMessage.includes('User exited') ||
          errorMessage.includes('user rejected')) {
        toast.error('Transaction was cancelled by user');
      } else if (errorMessage.includes('timeout') || 
                 errorMessage.includes('timed out')) {
        toast.error('Transaction is taking longer than expected. Please check your wallet or try again.');
      } else {
        toast.error('Withdrawal failed: ' + (errorMessage || 'Unknown error'));
      }
    }
  };

  const canWithdraw = userShares && userShares > BigInt(0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{vaultName}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {curator ? `Curated by ${curator}` : 'USDC Lending Vault'}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {totalAPY.toFixed(2)}% APY
            </Badge>
            {riskLevel && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  riskLevel === 'Low' ? 'border-green-300 text-green-700' :
                  riskLevel === 'Low-Medium' ? 'border-yellow-300 text-yellow-700' :
                  riskLevel === 'Medium' ? 'border-orange-300 text-orange-700' :
                  riskLevel === 'High' ? 'border-red-300 text-red-700' :
                  'border-gray-300 text-gray-700'
                }`}
              >
                {riskLevel} Risk
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Smart Account Status */}
        {!smartAccountReady && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            <AlertCircle className="w-4 h-4" />
            Initializing smart account...
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="text-sm text-muted-foreground p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            {description}
          </div>
        )}

        {/* APY Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Base APY
            </span>
            <span className="font-medium">{baseAPY.toFixed(2)}%</span>
          </div>
          {rewardAPR > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reward APR</span>
              <span className="font-medium text-green-600">+{rewardAPR.toFixed(2)}%</span>
            </div>
          )}
        </div>

        {/* User Position */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Your Deposit</span>
            <span className="text-sm font-medium">
              ${parseFloat(calculations.estimatedValueFormatted).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <span className="text-sm font-medium">
              {parseFloat(calculations.userBalanceFormatted).toFixed(2)} USDC
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1" disabled={isLoading}>
                <Wallet className="w-4 h-4" />
                Deposit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deposit USDC</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Amount (USDC)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Available: {parseFloat(calculations.userBalanceFormatted).toFixed(2)} USDC
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleDeposit} 
                    disabled={!depositAmount || isLoading}
                    className="flex-1"
                  >
                    {needsApproval ? 'Approve & Deposit (Gas Free)' : 'Deposit (Gas Free)'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDepositOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1" disabled={!canWithdraw || isLoading}>
                <DollarSign className="w-4 h-4" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw USDC</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Amount (USDC)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Available: ${parseFloat(calculations.estimatedValueFormatted).toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleWithdraw} 
                    disabled={!withdrawAmount || isLoading}
                    className="flex-1"
                  >
                    Withdraw (Gas Free)
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsWithdrawOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
});