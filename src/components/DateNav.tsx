import { ChevronLeft, ChevronRight } from 'lucide-react'
import { T } from '../tokens'
import { isoToday } from '../store'

interface Props {
  date: string
  onChange: (date: string) => void
}

export default function DateNav({ date, onChange }: Props) {
  const today = isoToday()
  const isToday = date === today

  const label = isToday
    ? "Aujourd'hui"
    : new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
      })

  function shift(n: number) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + n)
    onChange(d.toISOString().slice(0, 10))
  }

  return (
    <div className="flex items-center justify-between px-[18px] py-[10px]">
      <button
        onClick={() => shift(-1)}
        className="w-8 h-8 flex items-center justify-center rounded-full"
        style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}
      >
        <ChevronLeft size={16} color={T.fgMid} strokeWidth={2} />
      </button>

      <div className="flex items-center gap-2">
        <span className="font-tight text-[14px] font-semibold text-fg capitalize">{label}</span>
        {!isToday && (
          <button
            onClick={() => onChange(today)}
            className="px-2 py-[3px] rounded-pill font-mono text-[9px]"
            style={{ background: T.accentTint, color: T.accent, border: `1px solid rgba(159,230,181,0.25)` }}
          >
            ↩ auj.
          </button>
        )}
      </div>

      <button
        onClick={() => shift(1)}
        disabled={isToday}
        className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity"
        style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, opacity: isToday ? 0.25 : 1 }}
      >
        <ChevronRight size={16} color={T.fgMid} strokeWidth={2} />
      </button>
    </div>
  )
}
