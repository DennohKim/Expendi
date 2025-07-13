"use client"

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { useSmartAccount } from '@/context/SmartAccountContext'
import { parseUnits } from 'viem'

export interface SessionKeyData {
  privateKey: `0x${string}`
  sessionKeyAddress: `0x${string}`
  validUntil: number
  validAfter: number
  permissions: {
    allowedContract: `0x${string}`
    allowedFunctions: string[]
    maxSpendingLimit: bigint
    maxGasLimit: bigint
  }
}

export function useSessionKeys() {
  const [sessionKey, setSessionKey] = useState<SessionKeyData | null>(null)
  const [isCreatingSessionKey, setIsCreatingSessionKey] = useState(false)
  const { smartAccountClient, smartAccountAddress } = useSmartAccount()

  const createSessionKey = useCallback(async (
    budgetWalletAddress: `0x${string}`,
    validForHours: number = 24,
    maxSpendingLimit: string = "1000"
  ) => {
    if (!smartAccountClient || !smartAccountAddress) {
      toast.error('Smart account not available')
      return null
    }

    try {
      setIsCreatingSessionKey(true)
      toast.info('Creating restricted session key...')

      const sessionPrivateKey = generatePrivateKey()
      const sessionAccount = privateKeyToAccount(sessionPrivateKey)
      
      const now = Math.floor(Date.now() / 1000)
      const validUntil = now + (validForHours * 60 * 60)
      const validAfter = now - 60

      // Get function selectors for budget wallet operations
      const allowedFunctions = [
        '0x12345678', // createBucket function selector
        '0x87654321', // depositToBucket function selector
        // Add other specific function selectors as needed
      ]

      const sessionKeyData: SessionKeyData = {
        privateKey: sessionPrivateKey,
        sessionKeyAddress: sessionAccount.address,
        validUntil,
        validAfter,
        permissions: {
          allowedContract: budgetWalletAddress,
          allowedFunctions,
          maxSpendingLimit: parseUnits(maxSpendingLimit, 6),
          maxGasLimit: parseUnits("0.01", 18) // Max 0.01 ETH gas per transaction
        }
      }

      // Store session key with contract restriction
      localStorage.setItem('sessionKey', JSON.stringify({
        ...sessionKeyData,
        permissions: {
          ...sessionKeyData.permissions,
          allowedContract: sessionKeyData.permissions.allowedContract,
          allowedFunctions: sessionKeyData.permissions.allowedFunctions,
          maxSpendingLimit: sessionKeyData.permissions.maxSpendingLimit.toString(),
          maxGasLimit: sessionKeyData.permissions.maxGasLimit.toString()
        }
      }))
      
      setSessionKey(sessionKeyData)
      toast.success(`Session key created for budget wallet: ${budgetWalletAddress.slice(0, 8)}...`)
      
      return sessionKeyData
    } catch (error) {
      console.error('Error creating session key:', error)
      toast.error('Failed to create session key')
      return null
    } finally {
      setIsCreatingSessionKey(false)
    }
  }, [smartAccountClient, smartAccountAddress])

  const loadSessionKey = useCallback(() => {
    try {
      const stored = localStorage.getItem('sessionKey')
      if (stored) {
        const parsed = JSON.parse(stored)
        const sessionKeyData: SessionKeyData = {
          ...parsed,
          permissions: {
            ...parsed.permissions,
            maxSpendingLimit: BigInt(parsed.permissions.maxSpendingLimit),
            maxGasLimit: BigInt(parsed.permissions.maxGasLimit)
          }
        }
        
        // Check if session key is still valid
        const now = Math.floor(Date.now() / 1000)
        if (sessionKeyData.validUntil > now) {
          setSessionKey(sessionKeyData)
          return sessionKeyData
        } else {
          localStorage.removeItem('sessionKey')
          toast.info('Session key expired')
        }
      }
    } catch (error) {
      console.error('Error loading session key:', error)
      localStorage.removeItem('sessionKey')
    }
    return null
  }, [])

  const revokeSessionKey = useCallback(() => {
    localStorage.removeItem('sessionKey')
    setSessionKey(null)
    toast.success('Session key revoked')
  }, [])

  const isSessionKeyValid = useCallback((sessionKeyData?: SessionKeyData) => {
    const key = sessionKeyData || sessionKey
    if (!key) return false
    
    const now = Math.floor(Date.now() / 1000)
    return key.validAfter <= now && now <= key.validUntil
  }, [sessionKey])

  return {
    sessionKey,
    isCreatingSessionKey,
    createSessionKey,
    loadSessionKey,
    revokeSessionKey,
    isSessionKeyValid
  }
}