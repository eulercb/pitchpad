import { useEffect } from 'react'

// Keep the screen awake during an active session (§9.3). Releases when inactive
// or the tab is hidden, and re-acquires on visibilitychange. Absent API = no-op.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let released = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        // The effect may have been torn down while the request was in flight —
        // if so, release immediately instead of leaking a held lock.
        if (released) {
          void lock.release().catch(() => {})
          return
        }
        sentinel = lock
        sentinel.addEventListener('release', () => {
          sentinel = null
        })
      } catch {
        /* request can reject if the tab isn't visible; retry on visibilitychange */
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinel && !released) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
