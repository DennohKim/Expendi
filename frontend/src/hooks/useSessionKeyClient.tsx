"use client"

import { useMemo } from 'react'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createSmartAccountClient } from 'permissionless'
import { createPimlicoClient } from 'permissionless/clients/pimlico'
import { entryPoint06Address } from 'viem/account-abstraction'
import { toSimpleSmartAccount } from 'permissionless/accounts'
import { SessionKeyData } from './useSessionKeys'

export function useSessionKeyClient(sessionKey: SessionKeyData | null) {
  return useMemo(async () => {
    if (!sessionKey) return null

    try {
      // Create session account from private key
      const sessionAccount = privateKeyToAccount(sessionKey.privateKey)
      
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })

      const pimlicoRpcUrl = `https://api.pimlico.io/v2/${base.id}/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`
      
      const pimlicoPaymaster = createPimlicoClient({
        transport: http(pimlicoRpcUrl),
        entryPoint: {
          address: entryPoint06Address,
          version: "0.6",
        },
      })

      // Create smart account with session key as owner
      const simpleSmartAccount = await toSimpleSmartAccount({
        client: publicClient,
        owner: sessionAccount, // Use session account directly
        entryPoint: {
          address: entryPoint06Address,
          version: "0.6"
        }
      })

      const sessionSmartAccountClient = createSmartAccountClient({
        account: simpleSmartAccount,
        chain: base,
        bundlerTransport: http(pimlicoRpcUrl),
        paymaster: pimlicoPaymaster,
        userOperation: {
          estimateFeesPerGas: async () => (await pimlicoPaymaster.getUserOperationGasPrice()).fast,
        },
      })

      return sessionSmartAccountClient
    } catch (error) {
      console.error('Error creating session key client:', error)
      return null
    }
  }, [sessionKey])
}