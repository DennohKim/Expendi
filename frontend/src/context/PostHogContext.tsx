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

  return (
    <PostHogContext.Provider value={{ posthog }}>
      <PostHogProviderContent>{children}</PostHogProviderContent>
    </PostHogContext.Provider>
  )
}

function PostHogProviderContent({ children }: { children: ReactNode }) {
  // Handle user identification automatically
  usePostHogIdentification()
  
  // Handle page view tracking
  usePageTracking()

  return <>{children}</>
}

export function usePostHog() {
  const context = useContext(PostHogContext)
  if (!context) {
    throw new Error('usePostHog must be used within a PostHogProvider')
  }
  return context
}