import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { posthog } from '@/lib/analytics/posthog'

export function usePageTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Track page view
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        pathname,
        search_params: searchParams.toString()
      })
    }
  }, [pathname, searchParams])
}