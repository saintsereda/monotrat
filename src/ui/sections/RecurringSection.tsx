import type { DashboardData } from '../../analytics/dashboard'
import { dayLabel, formatCompact, formatUah, formatUahExact } from '../../analytics/format'
import type { Cadence } from '../../analytics/recurring'
import { dayKey } from '../../analytics/time'
import { ACCENTS } from '../color'
import { Avatar } from '../components/Bits'
import { IconBadge, Pending, SectionTitle, Tile, TileHeading } from '../components/Tile'
import { IconRepeat } from '../components/icons'

const CADENCE: Record<Cadence, string> = { weekly: 'щотижня', monthly: 'щомісяця', yearly: 'щороку' }

export function RecurringSection({ data }: { data: DashboardData }) {
  const items = data.recurring
  const monthly = items.reduce((s, r) => s + r.monthlyCost, 0)

  return (
    <section>
      <SectionTitle>Підписки й регулярні платежі</SectionTitle>
      {items.length ? (
        <div className="grid gap-3 sm:gap-5 lg:grid-cols-3">
          <Tile className="lg:col-span-2">
            <ul className="divide-y divide-white/[0.07]">
              {items.map((r) => (
                <li key={r.merchantKey} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Avatar label={r.label} category={r.category} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold">{r.label}</span>
                      {r.priceUp ? <span className="rounded-full bg-red/15 px-2 py-0.5 text-[11px] font-semibold text-red">подорожчала</span> : null}
                    </span>
                    <span className="block text-[12px] text-white/45">
                      {CADENCE[r.cadence]} · наступний ~{dayLabel(dayKey(r.nextTime))}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[14px]">{formatUah(r.lastAmount)}</span>
                </li>
              ))}
            </ul>
          </Tile>
          <Tile className="flex flex-col">
            <IconBadge color={ACCENTS.mint}>
              <IconRepeat />
            </IconBadge>
            <div className="mt-auto pt-10">
              <div className="text-[30px] leading-none font-bold tracking-tight">{formatCompact(monthly)}</div>
              <div className="mt-2 text-sm font-semibold">на місяць</div>
            </div>
            <div className="num mt-4 text-[14px] text-mint">{formatUahExact(monthly * 12)} на рік</div>
            {data.recurringIncome.length ? (
              <div className="mt-6 border-t border-white/[0.07] pt-4">
                <div className="mb-2 text-[12px] font-semibold text-white/45">Регулярні надходження</div>
                {data.recurringIncome.slice(0, 3).map((r) => (
                  <div key={r.merchantKey} className="flex justify-between gap-3 py-1 text-[13px]">
                    <span className="truncate font-semibold">{r.label}</span>
                    <span className="num text-green">+{formatUah(r.amount)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Tile>
        </div>
      ) : (
        <Tile>
          <TileHeading>Поки не знайшли регулярних платежів</TileHeading>
          <Pending>Потрібна історія хоча б за 2–3 місяці — дозавантажуємо</Pending>
        </Tile>
      )}
    </section>
  )
}
