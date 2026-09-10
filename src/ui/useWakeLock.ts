import { useEffect } from 'react'

/** Keeps the screen on while `active` (history sync) — a locked phone pauses the tab and the sync with it. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) void next.release()
        else sentinel = next
      } catch {
        // not allowed (battery saver, iframe, …) — sync still works while the screen is on
      }
    }
    const onVisibility = () => void acquire()

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release()
    }
  }, [active])
}
