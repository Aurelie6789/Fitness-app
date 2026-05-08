import { useState } from 'react'
import { MessageCircle, Trash2, Plus, Flame } from 'lucide-react'
import { T } from '../tokens'
import { useAppStore, isoToday, mealsForDate } from '../store'
import TabBar, { type TabKey } from '../components/TabBar'

const MEAL_SLOTS = [
  { label: 'Petit-déjeuner', time: '08:00' },
  { label: 'Déjeuner',       time: '12:30' },
  { label: 'Collation',      time: '16:00' },
  { label: 'Dîner',          time: '19:30' },
]

function MacroBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function RepasScreen({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { meals, kcalTarget, addMeal, removeMeal } = useAppStore()
  const todayIso = isoToday()
  const todayMeals = mealsForDate(meals, todayIso)

  const totalKcal     = todayMeals.reduce((s, m) => s + m.kcal, 0)
  const totalProteins = todayMeals.reduce((s, m) => s + m.proteins, 0)
  const totalCarbs    = todayMeals.reduce((s, m) => s + m.carbs, 0)
  const totalFats     = todayMeals.reduce((s, m) => s + m.fats, 0)
  const totalFiber    = todayMeals.reduce((s, m) => s + (m.fiber ?? 0), 0)

  const kcalPct = Math.min(100, kcalTarget > 0 ? (totalKcal / kcalTarget) * 100 : 0)

  // ── Manual add form ──────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName]     = useState('')
  const [formKcal, setFormKcal]     = useState('')
  const [formProteins, setFormProteins] = useState('')
  const [formCarbs, setFormCarbs]   = useState('')
  const [formFats, setFormFats]     = useState('')
  const [formFiber, setFormFiber]   = useState('')
  const [formTime, setFormTime]     = useState('12:30')

  function handleAdd() {
    if (!formName.trim() || !formKcal) return
    addMeal({
      id: Date.now().toString(),
      date: todayIso,
      time: formTime,
      name: formName.trim(),
      kcal: Number(formKcal) || 0,
      proteins: Number(formProteins) || 0,
      carbs: Number(formCarbs) || 0,
      fats: Number(formFats) || 0,
      fiber: Number(formFiber) || 0,
      source: 'manual',
    })
    setFormName('')
    setFormKcal('')
    setFormProteins('')
    setFormCarbs('')
    setFormFats('')
    setFormFiber('')
    setShowForm(false)
  }

  return (
    <div className="min-h-dvh bg-bg text-fg font-tight relative"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="overflow-y-auto"
        style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="px-[22px] pt-4 pb-[14px]">
          <p className="font-mono text-[10px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.6px' }}>
            Alimentation
          </p>
          <h1 className="font-display text-[32px] leading-none text-fg mt-1 uppercase">Repas</h1>
        </header>

        {/* ── Daily summary ──────────────────────────────────────────── */}
        <section className="px-[18px]">
          <div className="rounded-card p-[16px]" style={{ background: T.surface, border: `1px solid ${T.hairline}` }}>

            {/* Kcal progress */}
            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-baseline gap-[5px]">
                <span className="font-display text-[32px] leading-none text-fg">{totalKcal}</span>
                <span className="font-mono text-[10px]" style={{ color: T.fgDim }}>kcal</span>
              </div>
              <span className="font-mono text-[11px]" style={{ color: T.fgDim }}>/ {kcalTarget}</span>
            </div>
            <div className="h-[4px] rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${kcalPct}%`,
                  background: kcalPct > 100 ? T.coral : T.accent,
                }}
              />
            </div>

            {/* Macros */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Protéines', value: totalProteins, target: 120, color: T.accent },
                { label: 'Glucides',  value: totalCarbs,    target: 150, color: T.amber },
                { label: 'Lipides',   value: totalFats,     target: 60,  color: T.coral },
                { label: 'Fibres',    value: totalFiber,    target: 25,  color: '#8B9FFF' },
              ].map(({ label, value, target, color }) => (
                <div key={label}>
                  <div className="flex flex-col mb-1 gap-[2px]">
                    <span className="font-mono text-[8.5px]" style={{ color: T.fgDim, letterSpacing: '0.5px' }}>{label}</span>
                    <span className="font-mono text-[11px]" style={{ color }}>{value}g</span>
                  </div>
                  <MacroBar value={value} max={target} color={color} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Ask Léa banner ─────────────────────────────────────────── */}
        <section className="px-[18px] pt-3">
          <button
            onClick={() => onNavigate('coach')}
            className="w-full flex items-center gap-3 rounded-card px-4 py-[14px] transition-opacity active:opacity-75"
            style={{ background: T.accentTint, border: `1px solid rgba(159,230,181,0.25)` }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[14px] shrink-0"
              style={{ background: T.accent, color: T.accentInk }}
            >
              L
            </div>
            <div className="flex-1 text-left">
              <p className="font-tight text-[13px] font-semibold" style={{ color: T.accent }}>Dire à Léa ce que tu as mangé</p>
              <p className="font-mono text-[10px] mt-[2px]" style={{ color: T.fgDim }}>Elle enregistre les calories automatiquement</p>
            </div>
            <MessageCircle size={16} color={T.accent} strokeWidth={1.75} />
          </button>
        </section>

        {/* ── Today's meals ──────────────────────────────────────────── */}
        <section className="px-[18px] pt-4">
          <div className="flex justify-between items-center px-1 mb-3">
            <span className="font-mono text-[10px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>
              Aujourd'hui
            </span>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1 px-3 py-[6px] rounded-pill font-tight text-[11px] font-medium"
              style={{
                background: showForm ? T.accentTint : T.elevated,
                color: showForm ? T.accent : T.fgMid,
                border: `1px solid ${showForm ? 'rgba(159,230,181,0.3)' : T.hairline2}`,
              }}
            >
              <Plus size={11} strokeWidth={2.5} />
              Manuel
            </button>
          </div>

          {/* Manual add form */}
          {showForm && (
            <div className="rounded-card p-4 mb-3" style={{ background: T.surface, border: `1px solid ${T.hairline}` }}>
              <p className="font-mono text-[9px] uppercase mb-3" style={{ color: T.fgDim, letterSpacing: '1px' }}>Ajouter manuellement</p>

              {/* Slot picker */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {MEAL_SLOTS.map(s => (
                  <button
                    key={s.time}
                    onClick={() => setFormTime(s.time)}
                    className="px-2.5 py-[5px] rounded-pill font-tight text-[11px]"
                    style={{
                      background: formTime === s.time ? T.accent : T.elevated,
                      color: formTime === s.time ? T.accentInk : T.fgMid,
                      border: `1px solid ${formTime === s.time ? T.accent : T.hairline2}`,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Nom du repas"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full rounded-[12px] px-3 py-[9px] font-tight text-[13px] outline-none mb-2"
                style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fg }}
              />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="font-mono text-[9px] mb-1" style={{ color: T.fgDim }}>Kcal *</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={formKcal}
                    onChange={e => setFormKcal(e.target.value)}
                    className="w-full rounded-[12px] px-3 py-[8px] font-mono text-[13px] outline-none"
                    style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fg }}
                  />
                </div>
                <div>
                  <p className="font-mono text-[9px] mb-1" style={{ color: T.fgDim }}>Protéines (g)</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={formProteins}
                    onChange={e => setFormProteins(e.target.value)}
                    className="w-full rounded-[12px] px-3 py-[8px] font-mono text-[13px] outline-none"
                    style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fg }}
                  />
                </div>
                <div>
                  <p className="font-mono text-[9px] mb-1" style={{ color: T.fgDim }}>Glucides (g)</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={formCarbs}
                    onChange={e => setFormCarbs(e.target.value)}
                    className="w-full rounded-[12px] px-3 py-[8px] font-mono text-[13px] outline-none"
                    style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fg }}
                  />
                </div>
                <div>
                  <p className="font-mono text-[9px] mb-1" style={{ color: T.fgDim }}>Lipides (g)</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={formFats}
                    onChange={e => setFormFats(e.target.value)}
                    className="w-full rounded-[12px] px-3 py-[8px] font-mono text-[13px] outline-none"
                    style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fg }}
                  />
                </div>
                <div>
                  <p className="font-mono text-[9px] mb-1" style={{ color: T.fgDim }}>Fibres (g)</p>
                  <input
                    type="number"
                    placeholder="0"
                    value={formFiber}
                    onChange={e => setFormFiber(e.target.value)}
                    className="w-full rounded-[12px] px-3 py-[8px] font-mono text-[13px] outline-none"
                    style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fg }}
                  />
                </div>
              </div>

              <button
                onClick={handleAdd}
                disabled={!formName.trim() || !formKcal}
                className="w-full py-[11px] rounded-pill font-tight font-semibold text-[13px] transition-opacity"
                style={{ background: T.accent, color: T.accentInk, opacity: formName.trim() && formKcal ? 1 : 0.4 }}
              >
                Ajouter
              </button>
            </div>
          )}

          {/* Meals list */}
          {todayMeals.length === 0 ? (
            <div
              className="rounded-card px-4 py-6 text-center"
              style={{ background: T.surface, border: `1px solid ${T.hairline}` }}
            >
              <Flame size={22} color={T.fgFaint} strokeWidth={1.5} className="mx-auto mb-2" />
              <p className="font-tight text-[13px]" style={{ color: T.fgDim }}>
                Aucun repas enregistré aujourd'hui
              </p>
            </div>
          ) : (
            <div className="rounded-card overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.hairline}` }}>
              {todayMeals.map((m, i) => {
                const isLast = i === todayMeals.length - 1
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-[13px]"
                    style={{ borderBottom: isLast ? 'none' : `1px solid ${T.hairline}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-tight text-[13px] font-semibold text-fg truncate">{m.name}</p>
                        {m.source === 'coach' && (
                          <span
                            className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: T.accentTint, color: T.accent, border: `1px solid rgba(159,230,181,0.25)` }}
                          >
                            Léa
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: T.fgDim }}>
                        {m.time} · {m.proteins}g P · {m.carbs}g G · {m.fats}g L · {m.fiber ?? 0}g F
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-display text-[16px] text-fg">{m.kcal}</span>
                      <span className="font-mono text-[9px]" style={{ color: T.fgDim }}>kcal</span>
                      <button
                        onClick={() => removeMeal(m.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}
                      >
                        <Trash2 size={12} color={T.fgFaint} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>

      <TabBar active="meals" onNavigate={onNavigate} />
    </div>
  )
}
