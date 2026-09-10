import { useEffect } from 'react'
import { actions, useAppState } from './state/useApp'
import { Wordmark } from './ui/sections/Header'
import { Dashboard } from './ui/screens/Dashboard'
import { Onboarding } from './ui/screens/Onboarding'

export default function App() {
  const state = useAppState()

  useEffect(() => {
    // `?demo` opens the demo straight away — handy for sharing a link
    if (new URLSearchParams(window.location.search).has('demo')) actions.startDemo()
    else void actions.boot()
    const onOnline = () => actions.resync()
    window.addEventListener('online', onOnline)
    const tick = window.setInterval(() => actions.tick(), 5 * 60_000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.clearInterval(tick)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [state.phase])

  if (state.phase === 'dashboard') return <Dashboard state={state} />
  if (state.phase === 'boot') {
    return (
      <div className="grid min-h-dvh place-items-center bg-page">
        <Wordmark />
      </div>
    )
  }
  return <Onboarding state={state} />
}
