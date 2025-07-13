"use client"

import { useCallback } from 'react'
import { SessionKeyData } from './useSessionKeys'

export function useSessionKeyValidation() {
  const validateTransaction = useCallback((
    sessionKey: SessionKeyData,
    to: `0x${string}`,
    data: `0x${string}`,
    value: bigint
  ) => {
    // Check if interacting with allowed contract only
    if (to !== sessionKey.permissions.allowedContract) {
      throw new Error(`Transaction not allowed. Can only interact with ${sessionKey.permissions.allowedContract}`)
    }

    // Check if function is allowed
    const functionSelector = data.slice(0, 10) as `0x${string}`
    if (!sessionKey.permissions.allowedFunctions.includes(functionSelector)) {
      throw new Error(`Function ${functionSelector} not allowed`)
    }

    // Check spending limits
    if (value > sessionKey.permissions.maxSpendingLimit) {
      throw new Error(`Amount exceeds spending limit`)
    }

    // Check time validity
    const now = Math.floor(Date.now() / 1000)
    if (now < sessionKey.validAfter || now > sessionKey.validUntil) {
      throw new Error('Session key expired or not yet valid')
    }

    return true
  }, [])

  return { validateTransaction }
}