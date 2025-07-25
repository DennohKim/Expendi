'use client'

import React from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { Button } from '@/components/ui/button'

export function PostHogTestButton() {
  const { track } = useAnalytics()

  const handleTest = () => {
    track('posthog_test_event', {
      test_property: 'test_value',
      timestamp: new Date().toISOString(),
      location: 'test_button'
    })
    
    console.log('PostHog test event sent!')
    alert('PostHog test event sent! Check the console and your PostHog dashboard.')
  }

  return (
    <Button onClick={handleTest} variant="outline" className="m-4">
      Test PostHog Integration
    </Button>
  )
}