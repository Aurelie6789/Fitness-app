import { useState, useRef, useEffect, useMemo } from 'react'
import { Send } from 'lucide-react'
import { T } from '../tokens'
import { useAppStore, programWeek, todayLabel, isoToday, type Phase, type MealEntry, type SportSession, type ChatMessage } from '../store'
import TabBar, { type TabKey } from '../components/TabBar'

// ── System prompt ─────────────────────────────────────────────────────────
const BASE_PROMPT = `Tu es Léa, coach personnelle d'Aurélie. Tu combines trois expertises :

1. NUTRITION : tu connais les macros, l'index glycémique, la densité nutritionnelle. Tu donnes des alternatives concrètes, jamais de vagues conseils. Tu favorises la perte de poids mais aussi la bonne santé générale.

2. SPORT : tu adaptes les recommandations à son niveau (débutante en reprise), tu encourages sans sur-charger.

3. PSYCHOLOGIE & MOTIVATION : c'est aussi une de tes compétences clés. Tu connais le pattern "foutu pour foutu" d'Aurélie — un écart → abandon total. Tu la comprends et t'adaptes à sa psychologie, tu respectes la règle d'or : jamais deux écarts consécutifs. Quand elle veut craquer, tu ne diabolises pas, tu proposes une alternative ou un cadre ("ok ce soir, mais demain on repart"). Tu identifies quand c'est de la fatigue, du stress ou de la vraie faim, et tu réponds différemment selon le cas. Tu l'accompagnes pour réussir à trouver l'équilibre entre le plaisir, qui est important pour elle, et ses objectifs. Tu lui rappelles pourquoi elle fait ça : pour sa santé, son énergie, pour que sa fille soit fière d'elle, pour se montrer à elle-même qu'elle en est capable.

PROFIL AURÉLIE :
- 37 ans, Chief of Staff Bain & Company, Paris 8e, mariée à Maxime, fille Zoé 2 ans
- 165 cm, départ 79,75 kg (28 avril 2026), objectif 61 kg
- MG : 39,9 % ↓ | MM : 33,5 % ↑ | TMB 1548 kcal
- Souvent des déjeuners pro, restos et évènements perso
- Maxime cuisine souvent (pas toujours adapté)
- Elle aimerait faire Dynamo 2x/semaine + marche quotidienne 10k pas + courir un semi ou marathon un jour

RÈGLES :
- Féculents : jamais le soir sauf exception planifiée
- 1 repas plaisir/semaine, assumé, sans culpabilité
- Jamais 2 écarts consécutifs

TON STYLE :
- Directe, chaleureuse, jamais moralisatrice
- Courte par défaut, développe si elle demande
- Si elle veut craquer : alternative concrète + levier psychologique adapté
- Si elle a craqué : "c'est fait, repas suivant on repart" — jamais de culpabilisation
- Toujours en français
- Tu as accès au journal des 7 derniers jours (repas + sport). Utilise-le activement : félicite les séances faites, note les patterns alimentaires, adapte tes conseils à ce qui s'est réellement passé
- Quand c'est le début d'une nouvelle journée, ouvre la conversation en faisant un bilan rapide d'hier si les données le permettent

CONSEILS PROACTIFS (important) :
- Si Aurélie décrit un repas calorique ou déséquilibré, signale-le gentiment et propose une alternative concrète AVANT qu'elle mange ("avocat + saumon c'est déjà riche en bonnes graisses — la mangue ajoute du sucre, tu pourrais la remplacer par du concombre ou juste en mettre moins")
- Repère les combinaisons problématiques : graisses + sucres rapides, féculents le soir, portions restaurant systématiquement grandes
- Ne laisse pas passer un repas clairement hors-cible sans le noter — mais en une phrase, sans drama

EXTRACTION REPAS :
Quand Aurélie décrit ce qu'elle a mangé ou va manger, décompose CHAQUE aliment / boisson séparément et ajoute un tag JSON par item à la fin du message :
[REPAS: {"date":"YYYY-MM-DD","time":"HH:MM","name":"nom précis de l'aliment","kcal":X,"proteins":X,"carbs":X,"fats":X,"fiber":X}]

Règles d'extraction :
- CRUCIAL : ne tague QUE les aliments mentionnés dans le DERNIER message d'Aurélie. Ne re-tague JAMAIS des aliments déjà mentionnés dans des messages précédents de la conversation
- Un tag par aliment/boisson (ex: "pain au chocolat" → 1 tag, "café au lait" → 1 tag avec le lait inclus)
- date : aujourd'hui par défaut (format YYYY-MM-DD). Si elle dit "hier soir" ou "hier" → utilise la date d'hier. Si elle précise une date, utilise-la
- time : heure logique selon le contexte ("08:00" petit-dej, "12:30" déjeuner, "19:30" dîner) ou heure actuelle si "je viens de manger"
- Estime les quantités standards si non précisées (1 pain au chocolat boulangerie = 70g, 1 café au lait = 200ml avec 150ml lait demi-écrémé)
- Macros en grammes, arrondis à l'entier (inclure les fibres dans le champ "fiber")
- IMPORTANT — sois CONSERVATRICE (plutôt surestimer que sous-estimer) :
  • Portions réelles de boulangerie/restaurant sont souvent 20–30% plus grandes que les valeurs "standard"
  • Ajoute systématiquement le beurre, huile, sauces cachés en cuisson restaurant (+15–25% de lipides/kcal)
  • Pour un repas au restaurant sans détail précis, applique un coefficient ×1.25 sur tes estimations
  • Exemple : tartare de saumon resto → vise 380–420 kcal, pas 280
  • En cas de doute sur la taille d'une portion, prends la grande
- N'ajoute ces tags QUE si elle décrit clairement des aliments consommés ou à consommer

SUPPRESSION REPAS :
Si Aurélie demande de supprimer ou corriger un repas enregistré à tort, ajoute à la fin :
[SUPPRIMER_REPAS: {"name":"nom exact tel qu'enregistré"}]

Si tu recommandes un changement de phase programme, ajoute en fin de message : [PHASE: nom_phase]
Les phases possibles : déficit, maintenance, rééquilibrage`

function buildSystemPrompt(
  phase: Phase,
  week: number,
  kcalTarget: number,
  currentKg: number,
  lost: number,
  weightHistory: { date: string; kg: number }[],
  allMeals: MealEntry[],
  allSessions: SportSession[],
): string {
  const recentWeight = weightHistory.slice(-5).map(e => `  ${e.date} : ${e.kg.toFixed(2)} kg`).join('\n')
  const today = isoToday()

  // Build 7-day journal
  const journalLines: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
    const dayMeals = allMeals.filter(m => m.date === iso)
    const daySessions = allSessions.filter(s => s.date === iso)
    if (dayMeals.length === 0 && daySessions.length === 0) continue

    const totalKcal = dayMeals.reduce((s, m) => s + m.kcal, 0)
    const marker = iso === today ? '→ ' : '  '
    const dayLabel = `${marker}${label}${iso === today ? " (aujourd'hui)" : ''}`
    const mealsLine = dayMeals.length > 0
      ? `    Repas : ${totalKcal} kcal — ${dayMeals.map(m => `${m.name} (${m.kcal}kcal P${m.proteins}g)`).join(', ')}`
      : `    Repas : non enregistrés`
    const sportLines = daySessions.map(s =>
      `    Sport : ${s.type} ${s.duration}min${s.done ? ' ✓ fait' : ' (planifié)'}  ~${s.kcal} kcal brûlés`
    )
    journalLines.push([dayLabel, mealsLine, ...sportLines].join('\n'))
  }
  const journal = journalLines.length > 0 ? journalLines.join('\n\n') : '  (aucune donnée enregistrée encore)'

  return `${BASE_PROMPT}

DONNÉES ACTUELLES (${todayLabel()}) :
- Semaine ${week} du programme
- Poids actuel : ${currentKg.toFixed(2).replace('.', ',')} kg (−${lost.toFixed(2).replace('.', ',')} kg depuis le départ)
- Phase : ${phase} | Cible : ${kcalTarget} kcal/jour
- Historique poids récent :
${recentWeight}

JOURNAL 7 DERNIERS JOURS :
${journal}`
}

// ── Phase detection ───────────────────────────────────────────────────────
const PHASE_RE = /\[PHASE:\s*(déficit|maintenance|rééquilibrage)\]/i

function extractPhase(text: string): Phase | null {
  const m = text.match(PHASE_RE)
  return m ? (m[1].toLowerCase() as Phase) : null
}
function stripPhaseTag(text: string): string {
  return text.replace(PHASE_RE, '').trim()
}

// ── Meal detection (multiple items) ──────────────────────────────────────
function resolveDate(raw: string | undefined, todayIso: string): string {
  if (!raw) return todayIso
  if (raw === 'hier') {
    const d = new Date(todayIso + 'T12:00:00'); d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return todayIso
}

function extractMeals(text: string, dateIso: string): MealEntry[] {
  const results: MealEntry[] = []
  const re = /\[REPAS:\s*(\{[^}]+\})\]/g
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    try {
      const data = JSON.parse(m[1])
      results.push({
        id: `${Date.now()}-${i++}`,
        date: resolveDate(data.date, dateIso),
        time: data.time ?? '12:00',
        name: data.name ?? 'Aliment',
        kcal: Number(data.kcal) || 0,
        proteins: Number(data.proteins) || 0,
        carbs: Number(data.carbs) || 0,
        fats: Number(data.fats) || 0,
        fiber: Number(data.fiber) || 0,
        source: 'coach',
      })
    } catch { /* skip malformed */ }
  }
  return results
}

// ── Meal deletion detection ───────────────────────────────────────────────
function extractDeletion(text: string): string | null {
  const m = text.match(/\[SUPPRIMER_REPAS:\s*(\{[^}]+\})\]/)
  if (!m) return null
  try { return JSON.parse(m[1]).name ?? null } catch { return null }
}
function stripDeletionTag(text: string): string {
  return text.replace(/\[SUPPRIMER_REPAS:\s*\{[^}]+\}\]/g, '').trim()
}
function stripMealTags(text: string): string {
  return text.replace(/\[REPAS:\s*\{[^}]+\}\]/g, '').trim()
}

// ── Streaming API call ────────────────────────────────────────────────────
async function streamLea(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  onChunk: (t: string) => void,
) {
  const isDev = import.meta.env.DEV
  const url = isDev ? '/anthropic/v1/messages' : '/api/chat'

  if (isDev) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'sk-ant-REMPLACE_MOI') throw new Error('CLE_MANQUANTE')
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: isDev ? {
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    } : {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }

  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === '[DONE]') continue
      try {
        const ev = JSON.parse(raw)
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          onChunk(ev.delta.text)
        }
      } catch { /* skip malformed */ }
    }
  }
}

// ── Simple markdown renderer (bold, italic, bullets) ─────────────────────
function renderMd(text: string) {
  return text.split('\n').map((line, li) => {
    // Bullet lines
    const isBullet = /^[-•*]\s/.test(line)
    const content = isBullet ? line.replace(/^[-•*]\s/, '') : line

    // Inline bold/italic
    const parts: React.ReactNode[] = []
    const re = /\*\*(.+?)\*\*|\*(.+?)\*/g
    let last = 0; let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      if (m.index > last) parts.push(content.slice(last, m.index))
      if (m[1] !== undefined) parts.push(<strong key={m.index}>{m[1]}</strong>)
      else if (m[2] !== undefined) parts.push(<em key={m.index}>{m[2]}</em>)
      last = m.index + m[0].length
    }
    if (last < content.length) parts.push(content.slice(last))

    return isBullet
      ? <div key={li} className="flex gap-[6px] items-start"><span style={{ color: T.accent }} className="mt-[2px] shrink-0">·</span><span>{parts}</span></div>
      : <p key={li} className={li > 0 ? 'mt-[4px]' : ''}>{parts}</p>
  })
}

// ── Bubble components ─────────────────────────────────────────────────────
function LeaBubble({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-display text-[13px] mb-[2px]"
        style={{ background: T.accent, color: T.accentInk }}
      >
        L
      </div>
      <div
        className="max-w-[78%] rounded-[18px] rounded-bl-[4px] px-[14px] py-[10px]"
        style={{ background: T.surface, border: `1px solid ${T.hairline2}` }}
      >
        {streaming && !text ? (
          <div className="flex gap-1 items-center h-[18px]">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-[5px] h-[5px] rounded-full"
                style={{
                  background: T.fgDim,
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="font-tight text-[14px] leading-[1.5] text-fg">{renderMd(text)}</div>
        )}
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end mb-3">
      <div
        className="max-w-[78%] rounded-[18px] rounded-br-[4px] px-[14px] py-[10px]"
        style={{ background: T.accentTint, border: `1px solid rgba(159,230,181,0.15)` }}
      >
        <p className="font-tight text-[14px] leading-[1.5] text-fg whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  )
}

// ── Meal confirmation card (multi-items) ──────────────────────────────────
function MealCard({ meals, onAccept, onDismiss }: {
  meals: MealEntry[]; onAccept: () => void; onDismiss: () => void
}) {
  const totalKcal = meals.reduce((s, m) => s + m.kcal, 0)
  const totalP    = meals.reduce((s, m) => s + m.proteins, 0)
  const totalC    = meals.reduce((s, m) => s + m.carbs, 0)
  const totalF    = meals.reduce((s, m) => s + m.fats, 0)

  return (
    <div
      className="mx-1 mb-4 rounded-card p-4"
      style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}
    >
      <p className="font-mono text-[10px] uppercase mb-3" style={{ color: T.fgDim, letterSpacing: '1.2px' }}>
        Enregistrer {meals.length > 1 ? `ces ${meals.length} aliments` : 'cet aliment'} ?
      </p>

      {/* Item list */}
      <div className="mb-3 flex flex-col gap-[6px]">
        {meals.map((m, i) => (
          <div key={i} className="flex items-baseline justify-between">
            <span className="font-tight text-[13px] text-fg flex-1 mr-2 truncate">{m.name}</span>
            <span className="font-mono text-[11px] shrink-0" style={{ color: T.fgDim }}>
              {m.kcal} kcal · P{m.proteins}g G{m.carbs}g L{m.fats}g F{m.fiber}g
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      {meals.length > 1 && (
        <div
          className="flex items-center justify-between py-[8px] px-3 rounded-[10px] mb-3"
          style={{ background: T.surface }}
        >
          <span className="font-mono text-[10px] uppercase" style={{ color: T.fgDim, letterSpacing: '0.8px' }}>Total</span>
          <span className="font-mono text-[12px]" style={{ color: T.accent }}>
            {totalKcal} kcal · P{totalP}g G{totalC}g L{totalF}g
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 py-[10px] rounded-pill font-tight font-semibold text-[13px]"
          style={{ background: T.accent, color: T.accentInk }}
        >
          Enregistrer
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-[10px] rounded-pill font-tight text-[13px]"
          style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fgMid }}
        >
          Ignorer
        </button>
      </div>
    </div>
  )
}

// ── Phase change confirmation ─────────────────────────────────────────────
function PhaseCard({ phase, onAccept, onDismiss }: {
  phase: Phase; onAccept: () => void; onDismiss: () => void
}) {
  return (
    <div
      className="mx-1 mb-4 rounded-card p-4"
      style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}
    >
      <p className="font-mono text-[10px] uppercase mb-2" style={{ color: T.fgDim, letterSpacing: '1.2px' }}>
        Recommandation de Léa
      </p>
      <p className="font-tight text-[14px] text-fg mb-3">
        Passer en phase <span className="font-semibold" style={{ color: T.accent }}>{phase}</span>
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 py-[10px] rounded-pill font-tight font-semibold text-[13px]"
          style={{ background: T.accent, color: T.accentInk }}
        >
          Accepter
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-[10px] rounded-pill font-tight text-[13px]"
          style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fgMid }}
        >
          Pas maintenant
        </button>
      </div>
    </div>
  )
}

// ── Dynamic greeting ──────────────────────────────────────────────────────
function buildGreeting(week: number, lost: number): string {
  const hour = new Date().getHours()
  const lostStr = lost.toFixed(2).replace('.', ',')
  if (hour < 10) return `Bonjour Aurélie ! Semaine ${week}, −${lostStr} kg. Comment tu vas ce matin ?`
  if (hour < 14) return `Coucou ! Semaine ${week}, −${lostStr} kg au compteur. Qu'est-ce qui se passe aujourd'hui ?`
  if (hour < 18) return `Hello Aurélie. Semaine ${week}, −${lostStr} kg — bien joué. Comment s'est passée ta journée ?`
  return `Bonsoir ! Semaine ${week}, −${lostStr} kg. C'était comment aujourd'hui ?`
}

// ── Coach screen ──────────────────────────────────────────────────────────
export default function CoachScreen({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const { phase, programStart, weightHistory, meals, sessions, kcalTarget, chatHistory, setPhase, addMeal, removeMeal, setChatHistory } = useAppStore()

  // Wait for Zustand to finish rehydrating from localStorage before deciding to show greeting
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated())
  useEffect(() => {
    if (!hydrated) return useAppStore.persist.onFinishHydration(() => setHydrated(true))
  }, [hydrated])

  const week = programWeek(programStart)
  const latest = weightHistory.at(-1)
  const start = weightHistory[0]
  const lost = start && latest ? start.kg - latest.kg : 0

  const systemPrompt = buildSystemPrompt(phase, week, kcalTarget, latest?.kg ?? 0, lost, weightHistory, meals, sessions)

  // Show history once hydrated — never reset, Léa remembers everything
  const messages = useMemo(() => {
    if (hydrated && chatHistory.length > 0) return chatHistory
    if (hydrated) return [{ id: '0', role: 'assistant' as const, content: buildGreeting(week, lost) }]
    return [] // still loading from localStorage
  }, [hydrated, chatHistory, week, lost])

  function setMessages(updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) {
    const next = typeof updater === 'function' ? updater(messages) : updater
    setChatHistory(next)
  }

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [pendingPhase, setPendingPhase] = useState<Phase | null>(null)
  const [pendingMeals, setPendingMeals] = useState<MealEntry[]>([])
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const streamRef = useRef('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streamText])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const next = [...messages, userMsg]
    setChatHistory(next)
    setInput('')
    setLoading(true)
    setApiError(null)
    streamRef.current = ''

    const apiMsgs = next.slice(-30).map(m => ({ role: m.role, content: m.content }))

    try {
      await streamLea(systemPrompt, apiMsgs, (chunk) => {
        streamRef.current += chunk
        setStreamText(streamRef.current)
      })

      const full = streamRef.current
      const detectedPhase = extractPhase(full)
      const detectedMeals = extractMeals(full, isoToday())
      const deletionName = extractDeletion(full)
      const clean = stripDeletionTag(stripMealTags(stripPhaseTag(full)))

      setChatHistory([...next, { id: Date.now().toString(), role: 'assistant', content: clean }])
      if (detectedPhase && detectedPhase !== phase) setPendingPhase(detectedPhase)
      if (detectedMeals.length > 0) setPendingMeals(detectedMeals)
      if (deletionName) setPendingDeletion(deletionName)
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err)
      const msg = raw === 'CLE_MANQUANTE'
        ? 'Clé API manquante — remplis VITE_ANTHROPIC_API_KEY dans .env.local'
        : `Erreur : ${raw}`
      setApiError(msg)
    } finally {
      setLoading(false)
      streamRef.current = ''
      setStreamText('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="bg-bg text-fg font-tight flex flex-col"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-[22px] pt-3 pb-[14px]">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-display text-[18px] shrink-0"
          style={{ background: T.accent, color: T.accentInk }}
        >
          L
        </div>
        <div>
          <p className="font-tight text-[15px] font-semibold text-fg leading-none">Léa</p>
          <div className="flex items-center gap-[5px] mt-[3px]">
            <div className="w-[6px] h-[6px] rounded-full" style={{ background: T.accent }} />
            <span className="font-mono text-[10px]" style={{ color: T.fgDim }}>Coach · Phase {phase}</span>
          </div>
        </div>
      </header>

      {/* ── Messages ──────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-2"
        style={{ paddingBottom: '16px' }}
      >
        {messages.map(m =>
          m.role === 'assistant'
            ? <LeaBubble key={m.id} text={m.content} />
            : <UserBubble key={m.id} text={m.content} />
        )}

        {/* Streaming bubble */}
        {loading && <LeaBubble text={streamText} streaming />}

        {/* Meal confirmation card */}
        {pendingMeals.length > 0 && (
          <MealCard
            meals={pendingMeals}
            onAccept={() => { pendingMeals.forEach(m => addMeal(m)); setPendingMeals([]) }}
            onDismiss={() => setPendingMeals([])}
          />
        )}

        {/* Deletion confirmation card */}
        {pendingDeletion && (
          <div className="mx-1 mb-4 rounded-card p-4" style={{ background: T.elevated, border: `1px solid ${T.hairline2}` }}>
            <p className="font-mono text-[10px] uppercase mb-2" style={{ color: T.fgDim, letterSpacing: '1.2px' }}>Supprimer ce repas ?</p>
            <p className="font-tight text-[14px] text-fg mb-3">{pendingDeletion}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const match = [...useAppStore.getState().meals]
                    .filter(m => m.name.toLowerCase() === pendingDeletion.toLowerCase())
                    .sort((a, b) => b.id.localeCompare(a.id))[0]
                  if (match) removeMeal(match.id)
                  setPendingDeletion(null)
                }}
                className="flex-1 py-[10px] rounded-pill font-tight font-semibold text-[13px]"
                style={{ background: T.coral, color: '#fff' }}
              >Supprimer</button>
              <button onClick={() => setPendingDeletion(null)}
                className="flex-1 py-[10px] rounded-pill font-tight text-[13px]"
                style={{ background: T.elevated, border: `1px solid ${T.hairline2}`, color: T.fgMid }}
              >Annuler</button>
            </div>
          </div>
        )}

        {/* Phase confirmation card */}
        {pendingPhase && (
          <PhaseCard
            phase={pendingPhase}
            onAccept={() => { setPhase(pendingPhase); setPendingPhase(null) }}
            onDismiss={() => setPendingPhase(null)}
          />
        )}

        {/* API error */}
        {apiError && (
          <div
            className="mx-1 mb-3 rounded-card-sm px-4 py-3"
            style={{ background: 'rgba(255,106,77,0.12)', border: `1px solid rgba(255,106,77,0.25)` }}
          >
            <p className="font-tight text-[13px]" style={{ color: T.coral }}>{apiError}</p>
          </div>
        )}
      </div>

      {/* ── Input bar ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: `1px solid ${T.hairline}` }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message à Léa…"
            className="flex-1 resize-none rounded-[16px] px-4 py-[10px] font-tight text-fg outline-none"
            style={{
              background: T.elevated,
              border: `1px solid ${T.hairline2}`,
              color: T.fg,
              maxHeight: '120px',
              lineHeight: '1.4',
              fontSize: '16px',
            }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-opacity"
            style={{
              background: input.trim() && !loading ? T.accent : T.elevated,
              border: `1px solid ${T.hairline2}`,
              opacity: input.trim() && !loading ? 1 : 0.45,
            }}
          >
            <Send size={16} color={input.trim() && !loading ? T.accentInk : T.fgMid} strokeWidth={2} />
          </button>
        </div>
        {/* Tab bar spacer */}
        <div style={{ height: 'calc(64px + max(14px, env(safe-area-inset-bottom)) + 8px)' }} />
      </div>

      <TabBar active="coach" onNavigate={onNavigate} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
