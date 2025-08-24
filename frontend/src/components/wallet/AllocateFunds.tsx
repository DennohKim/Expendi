import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOnramp } from '@/hooks/useOnramp'
import { useExchangeRate } from '@/hooks/useExchangeRate'

interface AllocateFundsProps {
  walletBalance: bigint;
  unallocatedBalance: bigint;
  handleDeposit: (amount: string) => void;
  isDepositing: boolean;
  handleWithdraw?: (amount: string) => void;
  isWithdrawing?: boolean;
  onDepositSuccess?: () => void;
  onWithdrawSuccess?: () => void;
  userAddress?: string;
}

const AllocateFunds = ({ 
  walletBalance, 
  handleDeposit, 
  unallocatedBalance,
  isDepositing, 
  handleWithdraw,
  isWithdrawing = false,
  onDepositSuccess,
  onWithdrawSuccess,
  userAddress
}: AllocateFundsProps) => {
  // State variables
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [onrampAmount, setOnrampAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [mobileNetwork, setMobileNetwork] = useState('Safaricom')
  
  // Hooks
  const onrampMutation = useOnramp()
  const { data: exchangeRate, isLoading: exchangeRateLoading } = useExchangeRate('KES')
  
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

  // Handle onramp with KES
  const handleOnrampClick = async () => {
    if (!userAddress || !onrampAmount || !phoneNumber) return;
    
    const requestData = {
      shortcode: phoneNumber,
      amount: parseFloat(onrampAmount),
      fee: 10,
      mobile_network: mobileNetwork,
      chain: 'BASE' as const,
      asset: 'USDC' as const,
      address: userAddress,
      currency_code: 'KES' as const
    };
    
    onrampMutation.mutate(requestData);
  }

  // Calculate USDC equivalent
  const usdcEquivalent = exchangeRate && onrampAmount 
    ? (parseFloat(onrampAmount) / exchangeRate).toFixed(2)
    : '0.00'

  return (
    <div>
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="space-y-4">
          <Tabs defaultValue="allocate" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="allocate">Allocate</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              <TabsTrigger value="onramp">Onramp</TabsTrigger>

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

            <TabsContent value="onramp" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onramp-amount">Amount (KES)</Label>
                <Input
                  id="onramp-amount"
                  type="number"
                  placeholder="0.00"
                  value={onrampAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOnrampAmount(e.target.value)}
                  step="0.01"
                  min="20"
                  max="250000"
                />
                {exchangeRate && onrampAmount && (
                  <p className="text-sm text-gray-500">
                    You will receive: {usdcEquivalent} USDC
                    {exchangeRateLoading && " (calculating...)"}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone-number">M-Pesa Phone Number</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="0799770833"
                  value={phoneNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile-network">Mobile Network</Label>
                <Select value={mobileNetwork} onValueChange={setMobileNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Safaricom">Safaricom (M-Pesa)</SelectItem>
                    <SelectItem value="Airtel">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                variant="primary"
                onClick={handleOnrampClick}
                disabled={onrampMutation.isPending || !onrampAmount || !phoneNumber || !userAddress}
              >
                {onrampMutation.isPending ? 'Processing...' : 'Buy USDC with KES'}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                Minimum: 20 KES • Maximum: 250,000 KES
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default AllocateFunds
