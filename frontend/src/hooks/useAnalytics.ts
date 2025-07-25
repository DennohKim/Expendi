import { useCallback } from 'react'
import { usePostHog } from '@/context/PostHogContext'

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined
}

export function useAnalytics() {
  const { posthog } = usePostHog()

  const track = useCallback((event: string, properties?: EventProperties) => {
    if (typeof window !== 'undefined') {
      posthog.capture(event, properties)
    }
  }, [posthog])

  const identify = useCallback((userId: string, properties?: EventProperties) => {
    if (typeof window !== 'undefined') {
      posthog.identify(userId, properties)
    }
  }, [posthog])

  const setUserProperties = useCallback((properties: EventProperties) => {
    if (typeof window !== 'undefined') {
      posthog.people.set(properties)
    }
  }, [posthog])

  const alias = useCallback((alias: string) => {
    if (typeof window !== 'undefined') {
      posthog.alias(alias)
    }
  }, [posthog])

  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      posthog.reset()
    }
  }, [posthog])

  return {
    track,
    identify,
    setUserProperties,
    alias,
    reset
  }
}