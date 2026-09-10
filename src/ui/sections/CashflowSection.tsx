import type { DashboardData } from '../../analytics/dashboard'
import { formatUah, shortMonth } from '../../analytics/format'
import { ACCENTS } from '../color'
import { Pending, SectionTitle, Tile, TileHeading } from '../components/Tile'
import { Bars } from '../charts/Bars'

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-3xl bg-icon p-4">
      <div className="text-[12px] font-semibold text-white/50">{label}</div>
      <div className="num mt-2 text-[16px]" style={color ? { color } : undefined}>
        {formatUah(value)}
      </div>
    </div>
  )
}

export function CashflowSection({ data, month }: { data: DashboardData; month: string }) {
  const points = data.cashflow
  const n = Math.max(points.length, 1)
  const avgSpent = points.reduce((s, p) => s + p.spent, 0) / n
  const avgIncome = points.reduce((s, p) => s + p.income, 0) / n
  const net = points.reduce((s, p) => s + p.net, 0)

  return (
    <section>
      <SectionTitle>Доходи й витрати по місяцях</SectionTitle>
      <Tile>
        <TileHeading
          aside={
            <div className="flex gap-4 text-[12px] font-semibold text-white/60">
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-green" />доходи</span>
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-pink" />витрати</span>
            </div>
          }
        >
          {points.length} {points.length === 1 ? 'місяць' : 'міс'} історії
        </TileHeading>
        {points.length >= 2 ? (
          <>
            <Bars points={points.map((p) => ({ key: p.month, label: shortMonth(p.month), income: p.income, spent: p.spent }))} activeKey={month} />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat label="Середні витрати на місяць" value={avgSpent} color={ACCENTS.pink} />
              <Stat label="Середні доходи на місяць" value={avgIncome} color={ACCENTS.green} />
              <Stat label={net >= 0 ? 'Лишилось за весь період' : 'Перевитрата за весь період'} value={net} color={net >= 0 ? ACCENTS.mint : ACCENTS.red} />
            </div>
          </>
        ) : (
          <Pending />
        )}
      </Tile>
    </section>
  )
}
