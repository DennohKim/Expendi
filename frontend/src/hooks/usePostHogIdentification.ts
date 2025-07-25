import { useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAnalytics } from './useAnalytics'

export function usePostHogIdentification() {
  const { authenticated, user } = usePrivy()
  const { identify, setUserProperties, reset } = useAnalytics()

  useEffect(() => {
    if (authenticated && user) {
      // Identify user with wallet address as primary identifier
      const userId = user.wallet?.address || user.id
      
      identify(userId, {
        wallet_address: user.wallet?.address,
        email: user.email?.address,
        user_id: user.id,
        created_at: user.createdAt.toISOString(),
        auth_method: user.linkedAccounts?.[0]?.type || 'unknown',
        wallet_type: user.wallet?.walletClientType,
        chain_id: user.wallet?.chainId
      })

      // Set additional user properties
      setUserProperties({
        has_email: !!user.email?.address,
        linked_accounts_count: user.linkedAccounts?.length || 0,
        is_guest: user.isGuest || false
      })

    } else if (!authenticated) {
      // Reset PostHog when user logs out
      reset()
    }
  }, [authenticated, user, identify, setUserProperties, reset])

  return { authenticated, user }
}