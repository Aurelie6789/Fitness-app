import { useState } from 'react'
import { Check, Trash2, Dumbbell, Flame } from 'lucide-react'
import { T } from '../tokens'
import { useAppStore, thisWeekSessions, sessionsForDate, isoToday, KCAL_PER_MIN, type SportType, type SportSession } from '../store'
import TabBar, { type TabKey } from '../components/TabBar'
import DateNav from '../components/DateNav'

const TYPES: SportType[] = ['Dynamo', 'Pilate', 'Boxe', 'Course', 'Marche', 'Yoga', 'Autre']

const TYPE_EMOJI: Record<SportType, string> = {
  Dynamo: '🚴',
  Pilate: '🤸',
  Boxe:   '🥊',
  Course: '🏃',
  Marche: '🚶',
  Yoga:   '🧘',
  Autre:  '💪',
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// ── Week calendar strip ───────────────────────────────────────────────────
function WeekStrip({ sessions }: { sessions: SportSession[] }) {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const today = new Date()
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1

  const monday = new Date(today)
  monday.setDate(today.getDate() - todayIdx)

  return (
    <div className="flex gap-1.5">
      {days.map((d, i) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + i)
        const iso = date.toISOString().slice(0, 10)
        const hasSessions = sessions.some(s => s.date === iso)
        const isToday = i === todayIdx
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="font-mono text-[8.5px]" style={{ color: isToday ? T.accent : T.fgFaint }}>
              {d}
            </span>
            <div
              className="w-full h-[28px] rounded-[8px] flex items-center justify-center"
              style={{
                background: hasSessions ? T.accentTint : T.elevated,
                border: `1px solid ${isToday ? T.accent : hasSessions ? 'rgba(159,230,181,0.25)' : T.hairline}`,
              }}
            >
              {hasSessions && <div className="w-[6px] h-[6px] rounded-full" style={{ background: T.accent }} />}
            </div>
            <span className="font-mono text-[8px]" style={{ color: isToday ? T.fg : T.fgFaint }}>
              {date.getDate()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Sport screen ──────────────────────────────────────────────────────────
export default function SportScreen({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { sessions, addSession, toggleDone, removeSession } = useAppStore()

  const weekSessions = thisWeekSessions(sessions)
  const weekKcal     = weekSessions.reduce((s, x) => s + x.kcal, 0)
  const dynamo       = weekSessions.filter(s => s.type === 'Dynamo').length

  // ── Form state ────────────────────────────────────────────────────────
  const [type, setType]         = useState<SportType | null>(null)
  const [date, setDate]         = useState(isoToday())
  const [time, setTime]         = useState('17:30')
  const [duration, setDuration] = useState(45)
  const [planned, setPlanned]   = useState(false) // false = déjà fait, true = planifié

  const estimatedKcal = type ? Math.round(duration * KCAL_PER_MIN[type]) : 0

  function handleAdd() {
    if (!type) return
    const session: SportSession = {
      id: `${Date.now()}`,
      date,
      time,
      type,
      duration,
      kcal: estimatedKcal,
      done: !planned,
    }
    addSession(session)
    setType(null)
  }

  const [selectedDate, setSelectedDate] = useState(isoToday)
  const isToday = selectedDate === isoToday()
  const daySessions = sessionsForDate(sessions, selectedDate)

  return (
    <div className="min-h-dvh bg-bg text-fg font-tight relative"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="overflow-y-auto"
        style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="px-[22px] pt-4 pb-[10px]">
          <p className="font-mono text-[10px] uppercase" style={{ color: T.fgDim, letterSpacing: '1.6px' }}>
            Activité physique
          </p>
          <h1 className="font-display text-[32px] leading-none text-fg mt-1 uppercase">Sport</h1>
        </header>

        <DateNav date={selectedDate} onChange={setSelectedDate} />

        {/* ── Week summary ──────────────────────────────────────────── */}
        <section className="px-[18px]">
          <div className="rounded-card p-[16px]" style={{ background: T.surface, border: `1px solid ${T.hairline}` }}>

            {/* Stats row */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <p className="font-mono text-[9px] uppercase" style={{ color: T.fgFaint, letterSpacing: '1px' }}>Séances</p>
                <p className="font-display text-[28px] leading-none text-fg mt-1">{weekSessions.length}</p>
                <p className="font-mono text-[9px] mt-1" style={{ color: T.fgDim }}>cette semaine</p>
              </div>
              <div className="flex-1">
                <p className="font-mono text-[9px] uppercase" style={{ color: T.fgFaint, letterSpacing: '1px' }}>Dynamo</p>
                <p className="font-display text-[28px] leading-none mt-1" style={{ color: dynamo >= 2 ? T.accent : T.fg }}>
                  {dynamo}<span className="text-[14px]">/2</span>
                </p>
                <p className="font-mono text-[9px] mt-1" style={{ color: T.fgDim }}>objectif sem.</p>
              </div>
              <div className="flex-1">
                <p className="font-mono text-[9px] uppercase" style={{ color: T.fgFaint, letterSpacing: '1px' }}>Kcal</p>
                <p className="font-display text-[28px] leading-none text-fg mt-1">{weekKcal}</p>
                <p className="font-mono text-[9px] mt-1" style={{ color: T.fgDim }}>brûlées</p>
              </div>
            </div>

            {/* Week strip */}
            <WeekStrip sessions={weekSessions} />
          </div>
        </section>

        {/* ── Log / Plan ────────────────────────────────────────────── */}
        <section className="px-[18px] pt-4">
          <div className="rounded-card p-[16px]" style={{ background: T.surface, border: `1px solid ${T.hairline}` }}>
            <p className="font-mono text-[10px] uppercase mb-4" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>
              Ajouter une séance
            </p>

            {/* Type picker */}
            <div className="flex gap-2 flex-wrap mb-4">
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="px-3 py-[7px] rounded-pill font-tight text-[12px] font-medium transition-all"
                  style={{
                    background: type === t ? T.accent : T.elevated,
                    color: type === t ? T.accentInk : T.fgMid,
                    border: `1px solid ${type === t ? T.accent : T.hairline2}`,
                  }}
                >
                  {TYPE_EMOJI[t]} {t}
                </button>
              ))}
            </div>

            {/* Date + Time */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <p className="font-mono text-[9px] uppercase mb-1.5" style={{ color: T.fgDim, letterSpacing: '1px' }}>Date</p>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-[12px] px-3 py-[9px] font-mono text-[12px] outline-none"
                  style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fg, colorScheme: 'dark' }}
                />
              </div>
              <div className="w-[90px]">
                <p className="font-mono text-[9px] uppercase mb-1.5" style={{ color: T.fgDim, letterSpacing: '1px' }}>Heure</p>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full rounded-[12px] px-3 py-[9px] font-mono text-[12px] outline-none"
                  style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fg, colorScheme: 'dark' }}
                />
              </div>
            </div>

            {/* Duration stepper */}
            <div className="mb-4">
              <p className="font-mono text-[9px] uppercase mb-2" style={{ color: T.fgDim, letterSpacing: '1px' }}>Durée</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDuration(d => Math.max(10, d - 5))}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}
                >
                  <span className="font-display text-[18px] text-fg leading-none">−</span>
                </button>
                <div className="flex-1 text-center">
                  <span className="font-display text-[22px] text-fg">{formatDuration(duration)}</span>
                </div>
                <button
                  onClick={() => setDuration(d => Math.min(180, d + 5))}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}
                >
                  <span className="font-display text-[18px] text-fg leading-none">+</span>
                </button>
              </div>
              <p className="font-mono text-[9px] text-center mt-1.5" style={{ color: T.fgDim }}>
                {type ? `≈ ${estimatedKcal} kcal brûlées` : 'Choisis un sport d\'abord'}
              </p>
            </div>

            {/* Done / Planned toggle */}
            <div className="flex gap-2 mb-4">
              {[false, true].map(isPlanned => (
                <button
                  key={String(isPlanned)}
                  onClick={() => setPlanned(isPlanned)}
                  className="flex-1 py-[9px] rounded-pill font-tight text-[12px] font-medium"
                  style={{
                    background: planned === isPlanned ? T.accentTint : T.elevated,
                    color: planned === isPlanned ? T.accent : T.fgMid,
                    border: `1px solid ${planned === isPlanned ? 'rgba(159,230,181,0.3)' : T.hairline2}`,
                  }}
                >
                  {isPlanned ? 'Planifier' : 'Déjà fait'}
                </button>
              ))}
            </div>

            <button
              onClick={handleAdd}
              className="w-full py-[13px] rounded-pill flex items-center justify-center gap-2 font-tight font-semibold text-[14px] transition-opacity"
              disabled={!type}
              style={{ background: T.accent, color: T.accentInk, opacity: type ? 1 : 0.4 }}
            >
              <Dumbbell size={16} strokeWidth={2} />
              {planned ? 'Planifier la séance' : 'Enregistrer la séance'}
            </button>
          </div>
        </section>

        {/* ── Sessions for selected day ──────────────────────────────── */}
        <section className="px-[18px] pt-2 pb-2">
          <p className="font-mono text-[10px] uppercase px-1 mb-3" style={{ color: T.fgDim, letterSpacing: '1.4px' }}>
            {isToday ? "Aujourd'hui" : new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
          {daySessions.length === 0 ? (
            <div className="rounded-card px-4 py-5 flex items-center gap-3" style={{ background: T.surface, border: `1px solid ${T.hairline}` }}>
              <Flame size={18} color={T.fgFaint} strokeWidth={1.5} />
              <p className="font-tight text-[13px]" style={{ color: T.fgDim }}>
                {isToday ? 'Aucune séance aujourd\'hui' : 'Aucune séance ce jour-là'}
              </p>
            </div>
          ) : (
            <div className="rounded-card overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.hairline}` }}>
              {daySessions.map((s, i) => {
                const isLast = i === daySessions.length - 1
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-[13px]"
                    style={{ borderBottom: isLast ? 'none' : `1px solid ${T.hairline}` }}
                  >
                    <div
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-[16px]"
                      style={{ background: s.done ? T.accentTint : T.elevated }}
                    >
                      {TYPE_EMOJI[s.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-tight text-[13px] font-semibold text-fg" style={{ opacity: s.done ? 1 : 0.65 }}>
                        {s.type}
                        {!s.done && (
                          <span className="ml-2 font-mono text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                            style={{ background: T.elevated, color: T.amber, border: `1px solid rgba(255,178,58,0.3)` }}>
                            planifié
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[10px] mt-0.5" style={{ color: T.fgDim }}>
                        {s.time} · {formatDuration(s.duration)} · −{s.kcal} kcal
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleDone(s.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: s.done ? T.accentTint : T.elevated, border: `1px solid ${s.done ? 'rgba(159,230,181,0.3)' : T.hairline2}` }}
                      >
                        <Check size={13} color={s.done ? T.accent : T.fgFaint} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => removeSession(s.id)}
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

      <TabBar active="sport" onNavigate={onNavigate} />
    </div>
  )
}
