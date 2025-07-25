'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { initPostHog, posthog } from '@/lib/analytics/posthog'
import { usePostHogIdentification } from '@/hooks/usePostHogIdentification'
import { usePageTracking } from '@/hooks/usePageTracking'

interface PostHogContextValue {
  posthog: typeof posthog
}

const PostHogContext = createContext<PostHogContextValue | undefined>(undefined)

interface PostHogProviderProps {
  children: ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog()
  }, [])

  // Handle user identification automatically
  usePostHogIdentification()
  
  // Handle page view tracking
  usePageTracking()

  return (
    <PostHogContext.Provider value={{ posthog }}>
      {children}
    </PostHogContext.Provider>
  )
}

export function usePostHog() {
  const context = useContext(PostHogContext)
  if (!context) {
    throw new Error('usePostHog must be used within a PostHogProvider')
  }
  return context
}