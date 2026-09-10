import { useEffect, useRef, useState } from 'react'
import { plural } from '../../analytics/format'
import type { AppState } from '../../state/appStore'
import { actions } from '../../state/useApp'
import { HISTORY_MONTHS } from '../../sync/plan'
import { REQUEST_INTERVAL_MS } from '../../sync/scheduler'

function useClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

export function Wordmark() {
  return <span className="text-[22px] font-bold tracking-tight">monotrat</span>
}

export function SyncStatus({ state }: { state: AppState }) {
  const { progress, mode, syncElsewhere, available } = state
  const now = useClock(progress.nextRequestAt !== null)
  const running = progress.state === 'waiting' || progress.state === 'fetching' || progress.state === 'rateLimited'
  const secs = progress.nextRequestAt ? Math.max(0, Math.ceil((progress.nextRequestAt - now) / 1000)) : 0
  const remaining = Math.max(progress.total - progress.done, 0)
  const parallel = progress.limitMode === 'perAccount' ? Math.max(1, state.accounts.length) : 1
  const minutes = Math.max(1, Math.ceil((remaining * REQUEST_INTERVAL_MS) / 60_000 / parallel))

  let dot = 'bg-green'
  let text = 'Усе актуально'
  let retry = false
  if (mode === 'demo') {
    dot = 'bg-steel'
    text = 'Демо-дані'
  } else if (syncElsewhere) {
    dot = 'bg-steel'
    text = 'Синхронізує інша вкладка'
  } else if (progress.state === 'rateLimited') {
    dot = 'bg-brand animate-pulse'
    text = `monobank просить почекати · ${secs} с`
  } else if (running) {
    dot = 'bg-mint animate-pulse'
    const history = `Історія ${available.length} з ${HISTORY_MONTHS} міс`
    text = progress.state === 'fetching' ? `${history} · отримуємо виписку…` : `${history} · ще ~${minutes} хв · запит через ${secs} с`
  } else if (progress.state === 'done' && progress.failed > 0) {
    dot = 'bg-red'
    text = `Не вдалося завантажити ${progress.failed} ${plural(progress.failed, ['вікно', 'вікна', 'вікон'])}`
    retry = true
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 100

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.07)]">
      <span className={`size-2 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{text}</span>
      {running ? (
        <span className="hidden h-1 w-14 shrink-0 overflow-hidden rounded-full bg-black/10 sm:block">
          <span className="block h-full rounded-full bg-black" style={{ width: `${pct}%` }} />
        </span>
      ) : null}
      {retry ? (
        <button type="button" onClick={() => actions.resync()} className="shrink-0 underline underline-offset-2">
          Спробувати ще
        </button>
      ) : null}
    </div>
  )
}

export function Header({ state }: { state: AppState }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Wordmark />
          <div className="hidden min-w-0 sm:block">
            <SyncStatus state={state} />
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Налаштування"
            className="grid size-10 place-items-center rounded-full bg-page text-lg font-bold transition-colors hover:bg-black hover:text-white"
          >
            ⋯
          </button>
          {open ? (
            <div className="absolute top-12 right-0 w-[300px] rounded-[28px] bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[20px] px-4 py-3 hover:bg-page">
                <span>
                  <span className="block text-sm font-semibold">Враховувати перекази людям</span>
                  <span className="mt-0.5 block text-xs text-black/50">оренда, борги, перекази собі в інший банк</span>
                </span>
                <input
                  type="checkbox"
                  checked={state.includeTransfers}
                  onChange={(e) => actions.setIncludeTransfers(e.target.checked)}
                  className="size-5 shrink-0 accent-black"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  void actions.logout()
                }}
                className="w-full rounded-[20px] px-4 py-3 text-left text-sm font-semibold text-brand hover:bg-page"
              >
                {state.mode === 'demo' ? 'Вийти з демо' : 'Вийти і стерти дані'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="px-4 pb-3 sm:hidden">
        <SyncStatus state={state} />
      </div>
    </header>
  )
}
