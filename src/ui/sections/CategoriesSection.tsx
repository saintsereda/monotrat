import { useState } from 'react'
import type { CategoryShare } from '../../analytics/breakdown'
import { CATEGORIES } from '../../analytics/categories'
import type { DashboardData } from '../../analytics/dashboard'
import { formatDelta, formatPercent, formatUah, plural } from '../../analytics/format'
import type { CategoryId } from '../../analytics/types'
import { Pending, SectionTitle, Tile, TileHeading } from '../components/Tile'
import { Donut } from '../charts/Donut'

function Movers({ title, items, empty }: { title: string; items: CategoryShare[]; empty: string }) {
  return (
    <Tile>
      <TileHeading>{title}</TileHeading>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((s) => {
            const meta = CATEGORIES[s.id]
            const diff = s.amount - (s.avg3 ?? 0)
            return (
              <li key={s.id} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full text-[16px]" style={{ background: `${meta.color}26` }}>
                  {meta.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{meta.label}</span>
                  <span className="block text-[12px] text-white/45">зазвичай {formatUah(s.avg3 ?? 0)}</span>
                </span>
                <span className="text-right">
                  <span className={`num block text-[13px] ${diff > 0 ? 'text-red' : 'text-green'}`}>
                    {diff > 0 ? '+' : '−'}
                    {formatUah(Math.abs(diff))}
                  </span>
                  <span className="num block text-[11px] text-white/45">{formatDelta(s.delta)}</span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-white/50">{empty}</p>
      )}
    </Tile>
  )
}

export function CategoriesSection({ data }: { data: DashboardData }) {
  const shares = data.categories.filter((s) => s.amount > 0)
  const [activeId, setActiveId] = useState<CategoryId | null>(null)
  const active = shares.find((s) => s.id === activeId) ?? shares[0]

  return (
    <section>
      <SectionTitle>Витрати за категоріями</SectionTitle>
      {active ? (
        <Tile
          className="overflow-hidden"
          style={{ background: 'radial-gradient(115% 95% at 78% 50%, #042418 0%, #010805 42%, #000 72%)' }}
        >
          <div className="flex flex-col-reverse gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-4 lg:py-6">
            <ul className="w-full lg:max-w-[460px]">
              {shares.map((s) => {
                const meta = CATEGORIES[s.id]
                const on = s.id === active.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveId(s.id)}
                      onFocus={() => setActiveId(s.id)}
                      onClick={() => setActiveId(s.id)}
                      className={`flex w-full items-center justify-between gap-4 rounded-lg px-4 py-[7px] text-left text-[13px] font-semibold transition-colors ${on ? 'bg-row text-row-text' : 'text-white/65 hover:text-white'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="w-5 text-center text-[14px]">{meta.emoji}</span>
                        <span className="truncate">{meta.label}</span>
                      </span>
                      <span className="num shrink-0">{formatPercent(s.share)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-col items-center gap-5 self-center">
              <Donut
                items={shares.map((s) => ({ id: s.id, value: s.amount }))}
                activeId={active.id}
                onSelect={(id) => setActiveId(id as CategoryId)}
                size={290}
              >
                <div>
                  <div className="text-[34px] leading-none">{CATEGORIES[active.id].emoji}</div>
                  <div className="num mt-3 text-[22px] text-emerald">{formatPercent(active.share)}</div>
                </div>
              </Donut>
              <div className="text-center">
                <div className="text-[16px] font-semibold text-emerald">{CATEGORIES[active.id].label}</div>
                <div className="num mt-1 text-[14px] text-white">{formatUah(active.amount)}</div>
                <div className="mt-1 text-[12px] text-white/45">
                  {active.count} {plural(active.count, ['операція', 'операції', 'операцій'])}
                  {active.delta !== null ? ` · ${formatDelta(active.delta)} до звичного` : ''}
                </div>
              </div>
            </div>
          </div>
        </Tile>
      ) : (
        <Tile>
          <Pending>Цього місяця витрат ще немає</Pending>
        </Tile>
      )}
      <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-5 md:grid-cols-2">
        <Movers title="Найбільше зросли" items={data.movers.up} empty="Жодна категорія не зросла помітно — стабільно 👌" />
        <Movers title="Найбільше впали" items={data.movers.down} empty="Помітних скорочень поки немає" />
      </div>
    </section>
  )
}
