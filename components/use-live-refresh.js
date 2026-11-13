'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Keeps server-rendered live data fresh without reloading the page:
 * re-fetches the server components every `ms` while the tab is visible and
 * immediately when it becomes visible again.
 */
export function useLiveRefresh(ms = 20000) {
  const router = useRouter()
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') router.refresh() }
    const iv = setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', tick) }
  }, [router, ms])
}
