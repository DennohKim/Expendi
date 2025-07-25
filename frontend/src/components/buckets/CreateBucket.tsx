"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useUserBudgetWallet } from "@/hooks/subgraph-queries/useUserBudgetWallet";
import { useUserBuckets } from "@/hooks/subgraph-queries/getUserBuckets";
import { useSmartAccount } from "@/context/SmartAccountContext";
import { createBudgetWalletUtils } from "@/lib/contracts/budget-wallet";
import { getNetworkConfig } from "@/lib/contracts/config";
import { useAnalytics } from "@/hooks/useAnalytics";
// import { useSessionKeys } from "@/hooks/useSessionKeys";
// import { useSessionKeyClient } from "@/hooks/useSessionKeyClient";

export function CreateBucket() {
  const { address } = useAccount()
  const [bucketName, setBucketName] = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { smartAccountClient, smartAccountAddress, smartAccountReady } = useSmartAccount()
  const { track } = useAnalytics()
  
  // const { 
  //   sessionKey, 
  //   createSessionKey, 
  //   loadSessionKey, 
  //   isSessionKeyValid 
  // } = useSessionKeys()
  
  // const sessionKeyClient = useSessionKeyClient(sessionKey)

  // // Load session key on mount
  // useEffect(() => {
  //   loadSessionKey()
  // }, [loadSessionKey])

  // Get network configuration for current chain
  const networkConfig = getNetworkConfig()
  const usdcAddress = networkConfig.USDC_ADDRESS as `0x${string}`

  // Get user's current USDC balance
  const queryAddress = smartAccountReady && smartAccountAddress ? smartAccountAddress : address
  useBalance({
    address: queryAddress,
    token: usdcAddress,
  })

  const { refetch: refetchBuckets } = useUserBuckets(queryAddress)
  const { data: walletData, refetch } = useUserBudgetWallet(queryAddress)
  console.log("walletData", walletData)




  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!walletData?.user?.walletsCreated[0].wallet) {
      toast.error('Budget wallet not found')
      return
    }

    // // Automatically create session key if none exists or if it's for a different wallet
    // if (!sessionKey || !isSessionKeyValid() || sessionKey.permissions.allowedContract !== walletData.address) {
    //   toast.info('Setting up gasless transactions...')
    //   const newSessionKey = await createSessionKey(
    //     walletData.address as `0x${string}`,
    //     24,
    //     "1000"
    //   )
    //   if (!newSessionKey) {
    //     // Fallback to regular smart account if session key creation fails
    //     toast.info('Using regular transaction mode')
    //   }
    // }

    // Use smart account directly
    const clientToUse = smartAccountClient

    if (!clientToUse?.account) {
      toast.error('Smart account not available')
      return
    }

    try {
      setIsCreating(true)
      toast.info('Creating bucket...')

      track('bucket_creation_started', {
        bucket_name: bucketName,
        monthly_limit: parseFloat(monthlyLimit),
        wallet_address: walletData.user.walletsCreated[0].wallet
      })

      const limitInUsdc = parseUnits(monthlyLimit, 6) // USDC has 6 decimals

      // Create budget wallet utils instance and use createBucket method
      const walletUtils = createBudgetWalletUtils(walletData.user.walletsCreated[0].wallet as `0x${string}`)
      const txHash = await walletUtils.createBucket(
        () => Promise.reject(new Error('Account not available')),
        bucketName,
        limitInUsdc,
        clientToUse
      )

      track('bucket_created_successfully', {
        bucket_name: bucketName,
        monthly_limit: parseFloat(monthlyLimit),
        transaction_hash: txHash,
        wallet_address: walletData.user.walletsCreated[0].wallet
      })

      toast.success('Bucket created successfully!')
      console.log('Bucket created with transaction hash:', txHash)

      // Reset form
      setBucketName('')
      setMonthlyLimit('')
      
      // Refetch wallet data and buckets to update the UI
      // await Promise.all([
      //   refetch(),
      //   refetchBuckets()
      // ])
      setTimeout(() => {
        refetchBuckets();
        refetch();
      }, 1000); // Delay refetch to avoid rate limiting

    } catch (error) {
      track('bucket_creation_failed', {
        bucket_name: bucketName,
        monthly_limit: parseFloat(monthlyLimit),
        error: error instanceof Error ? error.message : 'Unknown error',
        wallet_address: walletData.user.walletsCreated[0].wallet
      })
      
      console.error('Error creating bucket:', error)
      toast.error('Failed to create bucket')
    } finally {
      setIsCreating(false)
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Bucket</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateBucket} className="space-y-4">
          <div>
            <Label htmlFor="bucketName" className="pb-2">Bucket Name</Label>
            <Input
              id="bucketName"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="Enter bucket name"
              required
            />
          </div>
          <div>
            <Label htmlFor="monthlyLimit" className="pb-2">Monthly Limit (USDC)</Label>
            <Input
              id="monthlyLimit"
              type="number"
              step="0.01"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="100.00"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isCreating} variant="primary">
              {isCreating ? 'Creating...' : 'Create Bucket'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}