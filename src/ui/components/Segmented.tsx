export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  value, options, onChange, dark = false, label,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  dark?: boolean
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-full p-1 ${dark ? 'bg-white/10' : 'bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'}`}>
      {options.map((o) => {
        const active = o.value === value
        const tone = active
          ? dark ? 'bg-white text-black' : 'bg-black text-white'
          : dark ? 'text-white/60 hover:text-white' : 'text-black/55 hover:text-black'
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${tone}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
