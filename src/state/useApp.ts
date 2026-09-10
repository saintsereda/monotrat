import { useMemo, useSyncExternalStore } from 'react'
import { createMonoClient, getCurrency } from '../api/mono'
import { type DashboardData, computeDashboard } from '../analytics/dashboard'
import { openStore } from '../store/db'
import { type AppState, createAppStore } from './appStore'

async function runExclusive(task: () => Promise<void>): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('monotrat-sync', { ifAvailable: true }, async (lock) => {
      if (!lock) return false
      await task()
      return true
    })
  }
  await task()
  return true
}

export const appStore = createAppStore({
  openStore,
  createClient: (token) => createMonoClient(token),
  getCurrency: () => getCurrency(),
  now: () => Date.now(),
  runExclusive,
})

export const actions = appStore.actions

export function useAppState(): AppState {
  return useSyncExternalStore(appStore.subscribe, appStore.getState)
}

export function useDashboard(state: AppState): DashboardData | null {
  const available = useMemo(() => new Set(state.available), [state.available])
  return useMemo(
    () =>
      state.phase === 'dashboard'
        ? computeDashboard(state.txs, { now: state.now, month: state.selectedMonth, includeTransfers: state.includeTransfers, available })
        : null,
    [state.phase, state.txs, state.now, state.selectedMonth, state.includeTransfers, available],
  )
}
