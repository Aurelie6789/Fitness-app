import { useState } from 'react'
import { Flame, Settings, Zap, ArrowDown, Check, Scale, Activity, Utensils, X, AlertTriangle } from 'lucide-react'
import { T } from '../tokens'
import { useAppStore, programWeek, todayLabel, isoToday, sessionsForDate, thisWeekSessions, mealsForDate, type Phase } from '../store'
import TabBar, { type TabKey } from '../components/TabBar'

// ── Phrases de boost ──────────────────────────────────────────────────────
type Phrase = { pre: string; italic: string; post: string }
const PHRASES: Phrase[] = [
  { pre: "Tu n'as pas\nà être",        italic: "parfaite.",   post: "\nJuste là."       },
  { pre: "Avance,\nne sois pas",       italic: "parfaite.",   post: "\nJuste avance."   },
  { pre: "Chaque jour\nest un",        italic: "nouveau",     post: "\ndépart."         },
  { pre: "Sois douce\navec toi-",      italic: "même.",       post: ""                  },
  { pre: "Progresse,\nne sois pas",    italic: "bloquée.",    post: "\nBouge."          },
  { pre: "Un pas\nà la",               italic: "fois.",       post: "\nC'est assez."    },
  { pre: "Tu es plus\nforte que tu",   italic: "crois.",      post: ""                  },
  { pre: "Ce que tu fais\naujourd'hui", italic: "compte.",    post: ""                  },
  { pre: "Hier c'est\nfait.",          italic: "Aujourd'hui", post: "\nrepart."         },
  { pre: "Petits pas,\ngrands",        italic: "changements.",post: ""                  },
  { pre: "Fais-le\npour",              italic: "toi.",        post: "\nPas pour eux."   },
  { pre: "Ce corps\nmérite d'être",    italic: "chéri.",      post: ""                  },
  { pre: "La force,\nc'est de",        italic: "recommencer.",post: ""                  },
  { pre: "Douceur\nn'est pas",         italic: "faiblesse.",  post: ""                  },
  { pre: "L'énergie suit\nl'",         italic: "intention.",  post: "\nCommence."       },
  { pre: "Ton corps\nte dit",          italic: "merci",       post: "\nchaque jour."    },
  { pre: "Zoé te voit\nêtre",          italic: "courageuse.", post: ""                  },
  { pre: "Pas besoin\nd'être prête,",  italic: "commence",    post: "\nquand même."     },
  { pre: "La régularité\nbat la",      italic: "perfection.", post: ""                  },
  { pre: "Tu construis\nquelque chose", italic: "durable.",   post: ""                  },
]

// ── SVG ring progress ─────────────────────────────────────────────────────
function Ring({ pct, size = 44, color = T.accent, strokeW = 4.5 }: {
  pct: number; size?: number; color?: string; strokeW?: number
}) {
  const r = (size - strokeW) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

// ── Week dots (sport tile) ────────────────────────────────────────────────
function WeekDots({ count }: { count: number }) {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const today = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  return (
    <div className="flex gap-[5px] items-center mt-auto pt-[10px]">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-[3px]">
          <div
            className="w-[5px] h-[5px] rounded-full"
            style={{
              background: i < count ? T.accent : i === today ? T.hairline2 : T.fgFaint,
              boxShadow: i < count ? `0 0 6px ${T.accent}` : 'none',
            }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Plan row ──────────────────────────────────────────────────────────────
type PlanRowProps = {
  time: string; title: string; sub: string; kcal: string
  done?: boolean; active?: boolean; last?: boolean
  type?: 'sport' | 'meal'
  onToggle?: () => void
}
function PlanRow({ time, title, sub, kcal, done, active, last, type = 'sport', onToggle }: PlanRowProps) {
  const isMeal = type === 'meal'
  return (
    <div
      className="flex items-center gap-3 px-4 py-[14px]"
      style={{
        borderBottom: last ? 'none' : `1px solid ${T.hairline}`,
        background: active ? T.accentTint : 'transparent',
      }}
      onClick={onToggle}
    >
      {/* Icon */}
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
        style={{ background: isMeal ? 'rgba(255,178,58,0.12)' : T.accentTint }}
      >
        {isMeal
          ? <Utensils size={13} color={T.amber} strokeWidth={1.75} />
          : <Activity size={13} color={T.accent} strokeWidth={1.75} />
        }
      </div>

      <div className="w-[38px] shrink-0">
        <span className="font-mono text-[10px] tracking-[0.5px]"
          style={{ color: active ? T.accent : T.fgDim }}>
          {time}
        </span>
      </div>

      <div className="flex-1 min-w-0" style={{ opacity: done ? 0.55 : 1 }}>
        <p
          className="font-tight text-[13px] font-semibold text-fg leading-snug truncate"
          style={{ textDecoration: done ? 'line-through' : 'none', textDecorationColor: T.fgFaint }}
        >
          {title}
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: T.fgDim }}>{sub}</p>
      </div>

      {kcal && (
        <span
          className="font-mono text-[12px] leading-none shrink-0"
          style={{ color: kcal.startsWith('−') ? T.accent : T.amber }}
        >
          {kcal}
        </span>
      )}
      {done   && <Check size={14} color={T.accent} strokeWidth={2} className="shrink-0" />}
      {active && !isMeal && (
        <div className="w-2 h-2 rounded-full shrink-0"
          style={{ background: T.accent, boxShadow: `0 0 10px ${T.accent}` }} />
      )}
    </div>
  )
}

// ── Settings sheet ───────────────────────────────────────────────────────
const PHASES: Phase[] = ['déficit', 'maintenance', 'rééquilibrage']

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { phase, kcalTarget, targetKg, setPhase, setKcalTarget, setTargetKg, resetData } = useAppStore()

  const [localKcal, setLocalKcal]       = useState(String(kcalTarget))
  const [localTarget, setLocalTarget]   = useState(String(targetKg))
  const [confirmReset, setConfirmReset] = useState(false)

  function save() {
    const k = parseInt(localKcal)
    const t = parseFloat(localTarget)
    if (k > 0) setKcalTarget(k)
    if (t > 0) setTargetKg(t)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[24px] px-5 pt-5"
        style={{
          background: T.elevated,
          border: `1px solid ${T.hairline2}`,
          paddingBottom: 'calc(32px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-tight text-[16px] font-semibold text-fg">Paramètres</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: T.surface }}
          >
            <X size={15} color={T.fgMid} strokeWidth={2} />
          </button>
        </div>

        {/* Phase */}
        <div className="mb-5">
          <p className="font-mono text-[9px] uppercase mb-2" style={{ color: T.fgDim, letterSpacing: '1.2px' }}>Phase programme</p>
          <div className="flex gap-2">
            {PHASES.map(p => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className="flex-1 py-[9px] rounded-pill font-tight text-[12px] capitalize"
                style={{
                  background: phase === p ? T.accent : T.surface,
                  color: phase === p ? T.accentInk : T.fgMid,
                  border: `1px solid ${phase === p ? T.accent : T.hairline2}`,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Objectifs numériques */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <p className="font-mono text-[9px] uppercase mb-1.5" style={{ color: T.fgDim, letterSpacing: '1px' }}>Objectif kcal / jour</p>
            <input
              type="number"
              value={localKcal}
              onChange={e => setLocalKcal(e.target.value)}
              className="w-full rounded-[12px] px-3 py-[9px] font-mono text-[14px] outline-none"
              style={{ background: T.surface, border: `1px solid ${T.hairline2}`, color: T.fg }}
            />
          </div>
          <div className="flex-1">
            <p className="font-mono text-[9px] uppercase mb-1.5" style={{ color: T.fgDim, letterSpacing: '1px' }}>Poids cible (kg)</p>
            <input
              type="number"
              step="0.1"
              value={localTarget}
              onChange={e => setLocalTarget(e.target.value)}
              className="w-full rounded-[12px] px-3 py-[9px] font-mono text-[14px] outline-none"
              style={{ background: T.surface, border: `1px solid ${T.hairline2}`, color: T.fg }}
            />
          </div>
        </div>

        <button
          onClick={save}
          className="w-full py-[13px] rounded-pill font-tight font-semibold text-[14px] mb-3"
          style={{ background: T.accent, color: T.accentInk }}
        >
          Enregistrer
        </button>

        {/* Reset */}
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-[11px] rounded-pill font-tight text-[13px]"
            style={{ color: T.coral, border: `1px solid rgba(255,106,77,0.25)` }}
          >
            Réinitialiser les données
          </button>
        ) : (
          <div
            className="rounded-card p-3"
            style={{ background: 'rgba(255,106,77,0.08)', border: `1px solid rgba(255,106,77,0.25)` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} color={T.coral} strokeWidth={2} />
              <p className="font-tight text-[12px]" style={{ color: T.coral }}>
                Séances, repas et pesées supprimés. Irréversible.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { resetData(); onClose() }}
                className="flex-1 py-[9px] rounded-pill font-tight font-semibold text-[12px]"
                style={{ background: T.coral, color: '#fff' }}
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-[9px] rounded-pill font-tight text-[12px]"
                style={{ background: T.surface, color: T.fgMid, border: `1px solid ${T.hairline2}` }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Home screen ───────────────────────────────────────────────────────────
export default function HomeScreen({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const [phrase] = useState<Phrase>(() => PHRASES[Math.floor(Math.random() * PHRASES.length)])
  const [showSettings, setShowSettings] = useState(false)
  const { phase, programStart, weightHistory, sessions, meals, kcalTarget, toggleDone } = useAppStore()

  const week    = programWeek(programStart)
  const today   = todayLabel()
  const todayIso = isoToday()

  const todayMeals = mealsForDate(meals, todayIso)
  const todayKcal  = todayMeals.reduce((s, m) => s + m.kcal, 0)

  const latestWeight = weightHistory.at(-1)?.kg ?? 0
  const startWeight  = weightHistory[0]?.kg ?? 0
  const delta        = +(latestWeight - startWeight).toFixed(2)

  const weekSessions   = thisWeekSessions(sessions)
  const weekCount      = weekSessions.length
  const todaySessions  = sessionsForDate(sessions, todayIso)

  // Current hour for "active" detection
  const nowHour = new Date().getHours()

  // Day label for programme header
  const dayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long' })
    .replace(/^\w/, c => c.toUpperCase())

  // Build combined programme rows: sport sessions + meals, sorted by time
  type PRow = {
    id: string; time: string; title: string; sub: string; kcal: string
    done?: boolean; active?: boolean; type: 'sport' | 'meal'; last: boolean
    onToggle?: () => void
  }

  const sportRows: PRow[] = todaySessions.map(s => ({
    id: s.id,
    time: s.time,
    title: s.type,
    sub: `${s.duration} min · sport`,
    kcal: `−${s.kcal}`,
    done: s.done,
    active: !s.done && parseInt(s.time.split(':')[0]) <= nowHour,
    type: 'sport' as const,
    last: false,
    onToggle: () => toggleDone(s.id),
  }))

  const mealRows: PRow[] = todayMeals.map(m => ({
    id: m.id,
    time: m.time,
    title: m.name,
    sub: `${m.proteins}g P · ${m.carbs}g G · ${m.fats}g L · ${m.fiber ?? 0}g F`,
    kcal: `+${m.kcal}`,
    type: 'meal' as const,
    last: false,
  }))

  const programmeRows = [...sportRows, ...mealRows]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((r, i, arr) => ({ ...r, last: i === arr.length - 1 }))

  const doneCount = programmeRows.filter(r => r.done).length

  // Days with at least one meal or sport session recorded
  const activeDays = new Set([...meals.map(m => m.date), ...sessions.map(s => s.date)]).size

  return (
    <div className="min-h-dvh bg-bg text-fg font-tight relative"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="overflow-y-auto"
        style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }}>

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <header className="flex justify-between items-center px-[22px] pt-2 pb-[14px]">
          <div>
            <p className="text-[11px]" style={{ color: T.fgDim, letterSpacing: '0.4px' }}>{today}</p>
            <p className="text-[13px] font-semibold text-fg mt-[1px]">Aurélie</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-[6px] px-3 py-2 rounded-pill bg-surface"
              style={{ border: `1px solid ${T.hairline2}` }}>
              <Flame size={15} color={T.coral} strokeWidth={1.75} />
              <span className="font-display text-[16px] text-fg leading-none">{activeDays}</span>
              <span className="text-[10px] uppercase tracking-[1px]" style={{ color: T.fgDim }}>jours</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="w-[38px] h-[38px] rounded-full flex items-center justify-center bg-elevated"
              style={{ border: `1px solid ${T.hairline2}` }} aria-label="Paramètres">
              <Settings size={18} color={T.fg} strokeWidth={1.6} />
            </button>
          </div>
        </header>

        {/* ── Hero card ─────────────────────────────────────────────── */}
        <section className="px-[18px]">
          <div className="relative rounded-card-lg px-[22px] pt-[22px] pb-5 overflow-hidden"
            style={{ background: T.accent, color: T.accentInk }}>
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage:
                'linear-gradient(rgba(14,13,11,0.18) 1px,transparent 1px),' +
                'linear-gradient(90deg,rgba(14,13,11,0.18) 1px,transparent 1px)',
              backgroundSize: '14px 14px',
            }} />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase" style={{ letterSpacing: '1.6px', opacity: 0.55 }}>
                Semaine {String(week).padStart(2, '0')} / Phase {phase}
              </p>
              <div className="font-display uppercase mt-[10px]"
                style={{ fontSize: 46, lineHeight: 1.0, letterSpacing: '-0.02em' }}>
                {phrase.pre.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < phrase.pre.split('\n').length - 1 ? <br /> : ' '}</span>
                ))}
                <em style={{ fontFamily: '"Playfair Display","Times New Roman",serif', fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>
                  {phrase.italic}
                </em>
                {phrase.post.split('\n').map((line, i) => (
                  <span key={i}>{i === 0 ? '' : <><br />{line}</>}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => onNavigate('coach')}
                  className="flex items-center gap-[6px] px-[14px] py-2 rounded-pill text-[12px] font-semibold"
                  style={{ background: T.accentInk, color: T.accent, letterSpacing: '0.3px', boxShadow: `0 4px 14px ${T.accentGlow}` }}>
                  <Zap size={13} strokeWidth={2} />
                  Parler à Léa
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats tiles ───────────────────────────────────────────── */}
        <section className="px-[18px] pt-[14px]">
          <div className="flex justify-between items-end mb-[10px] px-1">
            <span className="font-mono text-[10px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>
              Aujourd'hui
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">

            {/* Kcal */}
            <div className="bg-surface rounded-card p-[13px] flex flex-col"
              style={{ border: `1px solid ${T.hairline}`, minHeight: 128 }}
              onClick={() => onNavigate('meals')}>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9.5px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>kcal</span>
                <Flame size={13} color={T.fgMid} strokeWidth={1.75} />
              </div>
              <p className="font-display text-[24px] leading-none text-fg mt-[14px] whitespace-nowrap">
                {todayKcal.toLocaleString('fr-FR')}
              </p>
              <div className="mt-auto pt-[10px]">
                <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, kcalTarget > 0 ? (todayKcal / kcalTarget) * 100 : 0)}%`, background: T.accent }}
                  />
                </div>
                <p className="font-mono text-[8.5px] mt-[5px]" style={{ color: T.fgDim, letterSpacing: '0.4px' }}>
                  / {kcalTarget.toLocaleString('fr-FR')} cible
                </p>
              </div>
            </div>

            {/* Poids */}
            <div className="bg-surface rounded-card p-[13px] flex flex-col"
              style={{ border: `1px solid ${T.hairline}`, minHeight: 128 }}
              onClick={() => onNavigate('weight')}>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9.5px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>poids</span>
                <Scale size={13} color={T.fgMid} strokeWidth={1.75} />
              </div>
              <p className="font-display text-[24px] leading-none text-fg mt-[14px] whitespace-nowrap">
                {latestWeight.toFixed(2).replace('.', ',')}
              </p>
              <div className="mt-auto pt-[10px]">
                <div className="flex items-center gap-[3px] font-mono text-[10px] whitespace-nowrap" style={{ color: T.accent }}>
                  <ArrowDown size={10} strokeWidth={2} className="shrink-0" />
                  <span>{delta < 0 ? '−' : '+'}{Math.abs(delta).toFixed(2).replace('.', ',')} kg</span>
                </div>
              </div>
            </div>

            {/* Sport */}
            <div className="bg-surface rounded-card p-[13px] flex flex-col"
              style={{ border: `1px solid ${T.hairline}`, minHeight: 128 }}
              onClick={() => onNavigate('sport')}>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9.5px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>sport</span>
                <Activity size={13} color={T.fgMid} strokeWidth={1.75} />
              </div>
              <p className="font-display text-[24px] leading-none text-fg mt-[14px] whitespace-nowrap">
                {weekCount}
              </p>
              <WeekDots count={weekCount} />
            </div>

          </div>
        </section>

        {/* ── Programme du jour ─────────────────────────────────────── */}
        <section className="px-[18px] pt-5 pb-2">
          <div className="flex justify-between items-center px-1 mb-[10px]">
            <span className="font-mono text-[10px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>
              Programme — {dayLabel}
            </span>
            {programmeRows.length > 0 && (
              <span className="font-mono text-[10px]" style={{ color: T.fgDim }}>
                {doneCount} / {programmeRows.length}
              </span>
            )}
          </div>

          <div className="bg-surface rounded-card overflow-hidden" style={{ border: `1px solid ${T.hairline}` }}>
            {programmeRows.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="font-tight text-[13px]" style={{ color: T.fgDim }}>
                  Rien d'enregistré aujourd'hui
                </p>
                <div className="flex justify-center gap-2 mt-3">
                  <button
                    onClick={() => onNavigate('coach')}
                    className="px-4 py-[8px] rounded-pill font-tight text-[12px] font-semibold"
                    style={{ background: T.accentTint, color: T.accent, border: `1px solid rgba(159,230,181,0.2)` }}
                  >
                    + Repas
                  </button>
                  <button
                    onClick={() => onNavigate('sport')}
                    className="px-4 py-[8px] rounded-pill font-tight text-[12px] font-semibold"
                    style={{ background: T.accentTint, color: T.accent, border: `1px solid rgba(159,230,181,0.2)` }}
                  >
                    + Séance
                  </button>
                </div>
              </div>
            ) : (
              programmeRows.map((r) => (
                <PlanRow key={r.id} {...r} />
              ))
            )}
          </div>
        </section>

      </div>

      <TabBar active="home" onNavigate={onNavigate} />

      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
    </div>
  )
}
