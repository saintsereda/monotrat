import type { DashboardData } from '../../analytics/dashboard'
import { SectionTitle, Tile } from '../components/Tile'

export function InsightsSection({ data }: { data: DashboardData }) {
  if (!data.insights.length) return null
  return (
    <section>
      <SectionTitle>Цікаві факти</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {data.insights.map((i) => (
          <Tile key={i.id} className="flex min-h-[200px] flex-col">
            <div className="grid size-12 place-items-center rounded-2xl bg-icon text-[24px]">{i.emoji}</div>
            <div className="mt-auto pt-6">
              <div className="truncate text-[20px] leading-tight font-bold tracking-tight sm:text-[22px]">{i.value}</div>
              <div className="mt-1.5 text-[13px] font-semibold">{i.title}</div>
              <div className="mt-1 text-[12px] leading-snug text-white/45">{i.detail}</div>
            </div>
          </Tile>
        ))}
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1160px] px-4 pb-10 sm:px-6">
      <div className="flex flex-col gap-2 border-t border-black/10 pt-6 text-[13px] text-black/50 sm:flex-row sm:justify-between">
        <span>Неофіційний проєкт, не пов'язаний з monobank.</span>
        <span>Токен і транзакції зберігаються тільки у вашому браузері.</span>
      </div>
    </footer>
  )
}
