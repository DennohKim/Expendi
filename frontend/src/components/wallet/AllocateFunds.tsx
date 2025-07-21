import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface AllocateFundsProps {
  walletBalance: bigint;
  unallocatedBalance: bigint;
  handleDeposit: (amount: string) => void;
  isDepositing: boolean;
  handleWithdraw?: (amount: string) => void;
  isWithdrawing?: boolean;
  onDepositSuccess?: () => void;
  onWithdrawSuccess?: () => void;
}

const AllocateFunds = ({ 
  walletBalance, 
  handleDeposit, 
  unallocatedBalance,
  isDepositing, 
  handleWithdraw,
  isWithdrawing = false,
  onDepositSuccess,
  onWithdrawSuccess 
}: AllocateFundsProps) => {
  // State variables
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  
  // Helper function to format balance
  const formatBalance = (balance: bigint) => {
    return (Number(balance) / 1000000).toFixed(2) // Convert from wei to USDC
  }
  
  // Handle deposit with amount
  const handleDepositClick = async () => {
    await handleDeposit(depositAmount);
    // Clear the input after deposit attempt
    setDepositAmount('');
    // Call success callback if provided
    if (onDepositSuccess) {
      onDepositSuccess();
    }
  }

  // Handle withdraw with amount
  const handleWithdrawClick = async () => {
    if (handleWithdraw) {
      await handleWithdraw(withdrawAmount);
      // Clear the input after withdraw attempt
      setWithdrawAmount('');
      // Call success callback if provided
      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }
    }
  }

  return (
    <div>
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="space-y-4">
          <Tabs defaultValue="allocate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="allocate">Allocate</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            </TabsList>
            
            <TabsContent value="allocate" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Amount (USDC)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
                {walletBalance && (
                  <p className="text-sm text-gray-500">
                    Your wallet balance: {formatBalance(walletBalance)} USDC
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                variant="primary"
                onClick={handleDepositClick}
                disabled={isDepositing || !depositAmount}
              >
                {isDepositing ? 'Processing...' : 'Deposit'}
              </Button>
            </TabsContent>
            
            <TabsContent value="withdraw" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Amount (USDC)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
                {unallocatedBalance && (
                  <p className="text-sm text-gray-500">
                    Available to withdraw: {formatBalance(unallocatedBalance)} USDC
                  </p>
                )}
              </div>
              <Button
                className="w-full"
                variant="primary"
                onClick={handleWithdrawClick}
                disabled={isWithdrawing || !withdrawAmount || !handleWithdraw}
              >
                {isWithdrawing ? 'Processing...' : 'Withdraw'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default AllocateFunds
