import { useMemo } from 'react'
import { monthLabel, monthLocative, monthName } from '../../analytics/format'
import { monthKey, parseMonth } from '../../analytics/time'
import type { AppState } from '../../state/appStore'
import { actions, useDashboard } from '../../state/useApp'
import { ErrorBoundary } from '../components/Bits'
import { useWakeLock } from '../useWakeLock'
import { AnomaliesSection } from '../sections/AnomaliesSection'
import { CalendarSection } from '../sections/CalendarSection'
import { CashflowSection } from '../sections/CashflowSection'
import { CategoriesSection } from '../sections/CategoriesSection'
import { ForecastSection } from '../sections/ForecastSection'
import { Header } from '../sections/Header'
import { HeroTiles } from '../sections/HeroTiles'
import { Footer, InsightsSection } from '../sections/InsightsSection'
import { MerchantsSection } from '../sections/MerchantsSection'
import { RecurringSection } from '../sections/RecurringSection'

function MonthPicker({ months, value, currentYear }: { months: string[]; value: string; currentYear: number }) {
  return (
    <div className="-mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {months.map((m) => {
        const active = m === value
        const { year } = parseMonth(m)
        return (
          <button
            key={m}
            type="button"
            onClick={() => actions.selectMonth(m)}
            aria-pressed={active}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${active ? 'bg-black text-white' : 'bg-white text-black/60 shadow-[0_0_0_1px_rgba(0,0,0,0.06)] hover:text-black'}`}
          >
            {year === currentYear ? monthName(m) : monthLabel(m)}
          </button>
        )
      })}
    </div>
  )
}

export function Dashboard({ state }: { state: AppState }) {
  const data = useDashboard(state)
  const { state: sync } = state.progress
  const syncing = state.mode === 'live' && (sync === 'waiting' || sync === 'fetching' || sync === 'rateLimited')
  useWakeLock(syncing)
  const current = monthKey(state.now)
  const months = useMemo(() => [...new Set([current, ...state.available])].sort().reverse(), [current, state.available])
  const { year } = parseMonth(state.selectedMonth)

  return (
    <div className="min-h-dvh bg-page">
      <Header state={state} />
      <main className="mx-auto max-w-[1160px] px-4 pb-24 sm:px-6">
        {state.mode === 'demo' ? (
          <div className="mt-6 flex flex-col gap-3 rounded-[28px] bg-black px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold">🧪 Це демо з вигаданими даними — так виглядатиме ваш дашборд.</span>
            <button type="button" onClick={() => void actions.logout()} className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black transition-colors hover:bg-mint">
              Підключити свій monobank
            </button>
          </div>
        ) : null}
        {syncing ? (
          <div className="mt-6 rounded-[28px] bg-white px-5 py-4 text-[13px] leading-snug font-semibold text-black/70 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            ⏳ Довантажуємо історію з monobank. Тримайте вкладку відкритою: у фоні чи із заблокованим екраном (особливо на iPhone) браузер ставить завантаження на паузу.
          </div>
        ) : null}
        {!state.persistent ? (
          <div className="mt-6 rounded-[28px] bg-white px-5 py-4 text-sm font-semibold text-black/70 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
            Браузер не дозволяє зберігати дані (приватний режим?) — після закриття вкладки історію доведеться завантажувати заново.
          </div>
        ) : null}

        <div className="pt-10 sm:pt-14">
          <h1 className="text-[34px] font-bold tracking-tight sm:text-[44px]">Дашборд</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-snug font-semibold">
            Ваші гроші у {monthLocative(state.selectedMonth)} {year} — усе рахується просто в браузері й нікуди не відправляється.
          </p>
        </div>
        <MonthPicker months={months} value={state.selectedMonth} currentYear={parseMonth(current).year} />

        {data ? (
          <>
            <ErrorBoundary>
              <HeroTiles data={data} month={state.selectedMonth} now={state.now} />
            </ErrorBoundary>
            <ErrorBoundary>
              <ForecastSection data={data} month={state.selectedMonth} />
            </ErrorBoundary>
            <ErrorBoundary>
              <CategoriesSection key={state.selectedMonth} data={data} />
            </ErrorBoundary>
            <ErrorBoundary>
              <MerchantsSection data={data} />
            </ErrorBoundary>
            <ErrorBoundary>
              <CalendarSection data={data} />
            </ErrorBoundary>
            <ErrorBoundary>
              <RecurringSection data={data} />
            </ErrorBoundary>
            <ErrorBoundary>
              <AnomaliesSection data={data} />
            </ErrorBoundary>
            <ErrorBoundary>
              <CashflowSection data={data} month={state.selectedMonth} />
            </ErrorBoundary>
            <ErrorBoundary>
              <InsightsSection data={data} />
            </ErrorBoundary>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  )
}
