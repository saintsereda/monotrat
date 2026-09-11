import { type ReactNode, useState } from 'react'
import type { AppState } from '../../state/appStore'
import { actions } from '../../state/useApp'
import { ACCENTS } from '../color'
import { IconBadge, Tile } from '../components/Tile'
import { IconCart, IconGift, IconIncome, IconJar, IconLock } from '../components/icons'
import { Wordmark } from '../sections/Header'
import { Footer } from '../sections/InsightsSection'

function TeaserTile({ icon, color, value, label, exact }: { icon: ReactNode; color: string; value: string; label: string; exact: string }) {
  return (
    <div className="tile flex min-h-[190px] flex-col p-5 sm:min-h-[230px] sm:p-6">
      <IconBadge color={color} small>
        {icon}
      </IconBadge>
      <div className="mt-auto pt-6">
        <div className="text-[22px] leading-none font-bold tracking-tight sm:text-[26px]">{value}</div>
        <div className="mt-2 text-[13px] font-semibold">{label}</div>
      </div>
      <div className="num mt-4 text-[12px]" style={{ color }}>{exact}</div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Tile>
      <div className="num text-[13px] text-white/35">{String(n).padStart(2, '0')}</div>
      <div className="mt-6 text-[17px] font-semibold">{title}</div>
      <div className="mt-2 text-[13px] leading-relaxed text-white/55">{children}</div>
    </Tile>
  )
}

export function Onboarding({ state }: { state: AppState }) {
  const [token, setToken] = useState('')
  const [remember, setRemember] = useState(false)
  const connecting = state.phase === 'connecting'

  return (
    <div className="min-h-dvh bg-page">
      <header className="mx-auto flex h-16 max-w-[1160px] items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <button
          type="button"
          onClick={() => actions.startDemo()}
          className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.07)] transition-colors hover:bg-black hover:text-white"
        >
          Подивитись демо
        </button>
      </header>

      <main className="mx-auto max-w-[1160px] px-4 pb-20 sm:px-6">
        <section className="grid gap-10 pt-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:pt-16">
          <div>
            <h1 className="text-[42px] leading-[1.02] font-bold tracking-tight sm:text-[64px]">
              Куди ж поділись
              <br />
              гроші?
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-snug font-semibold text-black/65">
              Вставте токен monobank — і отримайте дашборд витрат: категорії, мерчанти, прогноз до кінця місяця, підписки й незвичні покупки.
            </p>

            <form
              className="tile mt-8 p-5 sm:p-7"
              onSubmit={(e) => {
                e.preventDefault()
                void actions.connect(token, remember)
              }}
            >
              <label htmlFor="token" className="text-[13px] font-semibold text-white/60">
                Токен з api.monobank.ua
              </label>
              <input
                id="token"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="uAbCdEfGh…"
                className="num mt-2 w-full rounded-2xl bg-icon px-4 py-4 text-[14px] text-white ring-1 ring-white/10 outline-none placeholder:text-white/25 focus:ring-mint"
              />
              <label className="mt-4 flex cursor-pointer items-center gap-3 text-[13px] font-semibold text-white/75">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[#50ffd8]" />
                Запам'ятати на цьому пристрої
              </label>
              {state.error ? (
                <p role="alert" className="mt-4 rounded-2xl bg-red/10 px-4 py-3 text-[13px] font-semibold text-red">
                  {state.error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={connecting}
                className="mt-5 w-full rounded-full bg-white py-4 text-[15px] font-bold text-black transition-colors hover:bg-mint disabled:opacity-60"
              >
                {connecting ? 'Підключаємося…' : 'Показати аналітику'}
              </button>
              <p className="mt-4 text-[12px] leading-relaxed text-white/45">
                Перший місяць з'явиться приблизно за хвилину, решта історії (до 13 місяців) дозавантажиться у фоні — monobank дозволяє один запит на хвилину.
              </p>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5" aria-hidden>
            <TeaserTile icon={<IconCart size={22} />} color={ACCENTS.pink} value="24,3 тис ₴" label="витрачено" exact="24 318,40 ₴" />
            <TeaserTile icon={<IconIncome size={22} />} color={ACCENTS.green} value="78 тис ₴" label="отримано" exact="78 000,00 ₴" />
            <TeaserTile icon={<IconGift size={22} />} color={ACCENTS.steel} value="412 ₴" label="кешбеку" exact="412,56 ₴" />
            <TeaserTile icon={<IconJar size={22} />} color={ACCENTS.mint} value="3 000 ₴" label="відкладено" exact="3 000,00 ₴" />
          </div>
        </section>

        <h2 className="mt-20 text-[22px] font-bold tracking-tight sm:text-[26px]">Як отримати токен</h2>
        <div className="mt-5 grid gap-3 sm:gap-5 md:grid-cols-3">
          <Step n={1} title="Відкрийте api.monobank.ua">
            <a href="https://api.monobank.ua/" target="_blank" rel="noreferrer" className="font-semibold text-mint underline underline-offset-2">
              api.monobank.ua
            </a>{' '}
            — офіційна сторінка monobank для персонального API.
          </Step>
          <Step n={2} title="Підтвердіть у застосунку">Відскануйте QR-код застосунком monobank і дозвольте доступ.</Step>
          <Step n={3} title="Скопіюйте токен">Натисніть «Активувати», скопіюйте токен і вставте його вище.</Step>
        </div>

        <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-5 md:grid-cols-2">
          <Tile>
            <div className="flex items-center gap-4">
              <IconBadge color={ACCENTS.mint} small>
                <IconLock size={22} />
              </IconBadge>
              <div className="text-[17px] font-semibold">Чому це безпечно</div>
            </div>
            <ul className="mt-5 space-y-2.5 text-[13px] leading-relaxed text-white/65">
              <li>• Токен лише читає виписку — ним не можна переказати гроші.</li>
              <li>• Запити йдуть напряму з вашого браузера в monobank — перевірте у DevTools → Network.</li>
              <li>• Немає сервера, аналітики чи сторонніх скриптів. Дані лежать тільки у вашому браузері.</li>
              <li>• Для лого маловідомих магазинів їхні назви (без сум і токена) шукаються в Brandfetch.</li>
              <li>• «Вийти і стерти дані» видаляє токен і всі транзакції з пристрою.</li>
            </ul>
          </Tile>
          <Tile>
            <div className="text-[17px] font-semibold">Що ви побачите</div>
            <ul className="mt-5 grid gap-2.5 text-[13px] leading-relaxed text-white/65 sm:grid-cols-2">
              <li>🛒 Витрати за категоріями</li>
              <li>🏆 Топ мерчантів і нові місця</li>
              <li>📈 Прогноз витрат і доходів</li>
              <li>📅 Найвитратніші дні й години</li>
              <li>🔁 Підписки та їх подорожчання</li>
              <li>⚠️ Незвичні покупки й сплески</li>
              <li>💸 Кешфлоу за 13 місяців</li>
              <li>✨ Цікаві факти про ваші звички</li>
            </ul>
          </Tile>
        </div>
      </main>
      <Footer />
    </div>
  )
}
