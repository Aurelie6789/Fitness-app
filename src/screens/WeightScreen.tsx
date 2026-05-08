import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Scale } from 'lucide-react'
import { T } from '../tokens'
import { useAppStore } from '../store'
import TabBar, { type TabKey } from '../components/TabBar'

// ── SVG line chart ────────────────────────────────────────────────────────
function WeightChart({ entries, targetKg }: {
  entries: { date: string; kg: number }[]
  targetKg: number
}) {
  if (entries.length === 0) return null

  const W = 300
  const H = 120
  const PAD = { top: 12, right: 20, bottom: 24, left: 36 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const kgs = entries.map(e => e.kg)
  const yMax = Math.max(...kgs) + 0.8
  const yMin = Math.min(...kgs, targetKg) - 0.5

  const dates = entries.map(e => new Date(e.date).getTime())
  const xMin = dates[0]
  const xMax = dates[dates.length - 1] + 5 * 86_400_000

  const toX = (ts: number) => PAD.left + ((ts - xMin) / (xMax - xMin)) * innerW
  const toY = (kg: number) => PAD.top + ((yMax - kg) / (yMax - yMin)) * innerH

  const pts = entries.map(e => ({ x: toX(new Date(e.date).getTime()), y: toY(e.kg) }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${pts[0].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`

  const targetY = toY(targetKg)

  // Y-axis labels
  const yLabels = [yMax, (yMax + yMin) / 2, yMin].map(v => ({
    y: toY(v),
    label: v.toFixed(1).replace('.', ','),
  }))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {/* Grid lines */}
      {yLabels.map((l, i) => (
        <line key={i} x1={PAD.left} y1={l.y} x2={W - PAD.right} y2={l.y}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}

      {/* Target line */}
      <line x1={PAD.left} y1={targetY} x2={W - PAD.right} y2={targetY}
        stroke={T.accent} strokeWidth={1} strokeDasharray="4 3" opacity={0.35} />
      <text x={PAD.left - 4} y={targetY + 3.5} fontSize={7.5}
        fill={T.accent} opacity={0.55} textAnchor="end" fontFamily="JetBrains Mono, monospace">
        {targetKg}
      </text>

      {/* Area fill */}
      <path d={areaPath} fill={`url(#wgrad)`} />
      <defs>
        <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity={0.18} />
          <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Line */}
      <path d={linePath} fill="none" stroke={T.accent} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={T.surface} stroke={T.accent} strokeWidth={2} />
      ))}

      {/* Y-axis labels */}
      {yLabels.map((l, i) => (
        <text key={i} x={PAD.left - 4} y={l.y + 3.5} fontSize={7.5}
          fill={T.fgDim} textAnchor="end" fontFamily="JetBrains Mono, monospace" opacity={0.7}>
          {l.label}
        </text>
      ))}

      {/* X-axis date labels */}
      {entries.map((e, i) => {
        if (i !== 0 && i !== entries.length - 1 && entries.length > 2) return null
        const x = toX(new Date(e.date).getTime())
        const label = new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        return (
          <text key={i} x={x} y={H - PAD.bottom + 12} fontSize={7.5}
            fill={T.fgDim} textAnchor="middle" fontFamily="JetBrains Mono, monospace" opacity={0.7}>
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Weight screen ─────────────────────────────────────────────────────────
export default function WeightScreen({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { weightHistory, targetKg, addWeight } = useAppStore()

  const latest = weightHistory.at(-1)
  const start = weightHistory[0]
  const todayStr = new Date().toISOString().slice(0, 10)
  const alreadyToday = latest?.date === todayStr

  const [input, setInput] = useState<number>(latest?.kg ?? 75)
  const [saved, setSaved] = useState(false)

  const totalToLose = (start?.kg ?? 0) - targetKg
  const lost = (start?.kg ?? 0) - (latest?.kg ?? 0)
  const remaining = (latest?.kg ?? 0) - targetKg
  const pct = totalToLose > 0 ? Math.min(1, lost / totalToLose) : 0

  function handleSave() {
    addWeight({ date: todayStr, kg: +input.toFixed(2) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function step(dir: 1 | -1) {
    setInput(prev => +(prev + dir * 0.05).toFixed(2))
  }

  const sorted = [...weightHistory].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div
      className="min-h-dvh bg-bg text-fg font-tight relative"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className="overflow-y-auto"
        style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }}
      >

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="px-[22px] pt-4 pb-[14px]">
          <p className="font-mono text-[10px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.6px' }}>
            Suivi du poids
          </p>
          <h1 className="font-display text-[32px] leading-none text-fg mt-1 uppercase">
            Pesée
          </h1>
        </header>

        {/* ── Progress card ────────────────────────────────────────────── */}
        <section className="px-[18px]">
          <div
            className="rounded-card p-[18px]"
            style={{ background: T.surface, border: `1px solid ${T.hairline}` }}
          >
            {/* Current weight */}
            <div className="flex items-end gap-2 mb-[14px]">
              <span className="font-display text-[48px] leading-none text-fg">
                {(latest?.kg ?? 0).toFixed(2).replace('.', ',')}
              </span>
              <span className="font-mono text-[13px] mb-[8px]" style={{ color: T.fgDim }}>kg</span>
              <div
                className="flex items-center gap-1 mb-[8px] ml-auto font-mono text-[11px]"
                style={{ color: T.accent }}
              >
                <ArrowDown size={12} strokeWidth={2} />
                <span>−{lost.toFixed(2).replace('.', ',')} kg</span>
              </div>
            </div>

            {/* Progress bar start → now → target */}
            <div className="relative h-[6px] rounded-full overflow-hidden mb-[10px]"
              style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  width: `${pct * 100}%`,
                  background: `linear-gradient(90deg, ${T.accentDeep}, ${T.accent})`,
                }}
              />
            </div>

            {/* Start / remaining / target */}
            <div className="flex justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase" style={{ color: T.fgFaint, letterSpacing: '1px' }}>Départ</p>
                <p className="font-display text-[14px] text-fg">{start?.kg.toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-[9px] uppercase" style={{ color: T.fgFaint, letterSpacing: '1px' }}>Restant</p>
                <p className="font-display text-[14px]" style={{ color: T.amber }}>
                  {remaining.toFixed(2).replace('.', ',')} kg
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] uppercase" style={{ color: T.fgFaint, letterSpacing: '1px' }}>Objectif</p>
                <p className="font-display text-[14px] text-fg">{targetKg}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Log today ────────────────────────────────────────────────── */}
        <section className="px-[18px] pt-4">
          <div
            className="rounded-card p-[18px]"
            style={{ background: T.surface, border: `1px solid ${T.hairline}` }}
          >
            <p className="font-mono text-[10px] uppercase mb-4" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>
              {alreadyToday ? "Pesée du jour ✓" : "Peser aujourd'hui"}
            </p>

            <div className="flex items-center justify-between gap-3">
              {/* Minus */}
              <button
                onClick={() => step(-1)}
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}
              >
                <span className="font-display text-[22px] leading-none text-fg">−</span>
              </button>

              {/* Number */}
              <div className="text-center">
                <p className="font-display text-[44px] leading-none text-fg">
                  {input.toFixed(2).replace('.', ',')}
                </p>
                <p className="font-mono text-[10px] mt-1" style={{ color: T.fgDim }}>kg</p>
              </div>

              {/* Plus */}
              <button
                onClick={() => step(1)}
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}
              >
                <span className="font-display text-[22px] leading-none text-fg">+</span>
              </button>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-5 py-[13px] rounded-pill flex items-center justify-center gap-2 font-tight font-semibold text-[14px]"
              style={{
                background: saved ? T.accentDeep : T.accent,
                color: T.accentInk,
                transition: 'background 0.2s',
              }}
            >
              {saved
                ? <><Check size={16} strokeWidth={2.5} /> Enregistré</>
                : <><Scale size={16} strokeWidth={2} /> Enregistrer</>
              }
            </button>
          </div>
        </section>

        {/* ── Chart ────────────────────────────────────────────────────── */}
        <section className="px-[18px] pt-4">
          <div
            className="rounded-card px-[14px] pt-[16px] pb-[10px]"
            style={{ background: T.surface, border: `1px solid ${T.hairline}` }}
          >
            <p className="font-mono text-[10px] uppercase mb-3" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>
              Courbe
            </p>
            <WeightChart entries={weightHistory} targetKg={targetKg} />
          </div>
        </section>

        {/* ── History ──────────────────────────────────────────────────── */}
        <section className="px-[18px] pt-4">
          <p className="font-mono text-[10px] uppercase px-1 mb-3" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>
            Historique
          </p>
          <div
            className="rounded-card overflow-hidden"
            style={{ background: T.surface, border: `1px solid ${T.hairline}` }}
          >
            {sorted.map((entry, i) => {
              const prev = sorted[i + 1]
              const diff = prev ? entry.kg - prev.kg : null
              const isLast = i === sorted.length - 1
              return (
                <div
                  key={entry.date}
                  className="flex items-center px-4 py-[13px]"
                  style={{ borderBottom: isLast ? 'none' : `1px solid ${T.hairline}` }}
                >
                  <span className="font-mono text-[11px] flex-1" style={{ color: T.fgMid }}>
                    {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="font-display text-[18px] text-fg mr-3">
                    {entry.kg.toFixed(2).replace('.', ',')}
                  </span>
                  <span
                    className="font-mono text-[10px] w-[52px] text-right"
                    style={{ color: diff !== null && diff <= 0 ? T.accent : T.coral }}
                  >
                    {diff !== null && Math.abs(diff) >= 0.01
                      ? `${diff <= 0 ? '−' : '+'}${Math.abs(diff).toFixed(2).replace('.', ',')}`
                      : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

      </div>

      <TabBar active="weight" onNavigate={onNavigate} />
    </div>
  )
}
