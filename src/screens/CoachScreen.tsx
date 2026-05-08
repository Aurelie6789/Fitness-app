import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { T } from '../tokens'
import { useAppStore, programWeek, todayLabel, isoToday, mealsForDate, type Phase, type MealEntry, type ChatMessage } from '../store'
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
- Utilise l'historique des repas du jour pour personnaliser tes recommandations (bilan, ce qu'il reste, ajustements)

EXTRACTION REPAS :
Quand Aurélie décrit ce qu'elle a mangé ou va manger, décompose CHAQUE aliment / boisson séparément et ajoute un tag JSON par item à la fin du message :
[REPAS: {"time":"HH:MM","name":"nom précis de l'aliment","kcal":X,"proteins":X,"carbs":X,"fats":X,"fiber":X}]

Règles d'extraction :
- Un tag par aliment/boisson (ex: "pain au chocolat" → 1 tag, "café au lait" → 1 tag avec le lait inclus)
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

Si tu recommandes un changement de phase programme, ajoute en fin de message : [PHASE: nom_phase]
Les phases possibles : déficit, maintenance, rééquilibrage`

function buildSystemPrompt(
  phase: Phase,
  week: number,
  currentKg: number,
  lost: number,
  history: { date: string; kg: number }[],
  todayMeals: MealEntry[],
): string {
  const recent = history.slice(-5).map(e => `  ${e.date} : ${e.kg.toFixed(2)} kg`).join('\n')

  const mealLog = todayMeals.length === 0
    ? '  (aucun repas enregistré pour l\'instant)'
    : todayMeals.map(m =>
        `  ${m.time} — ${m.name} : ${m.kcal} kcal (P${m.proteins}g G${m.carbs}g L${m.fats}g F${m.fiber}g)`
      ).join('\n')

  const totalKcal = todayMeals.reduce((s, m) => s + m.kcal, 0)

  return `${BASE_PROMPT}

DONNÉES ACTUELLES (${todayLabel()}) :
- Semaine ${week} du programme
- Poids actuel : ${currentKg.toFixed(2).replace('.', ',')} kg (−${lost.toFixed(2).replace('.', ',')} kg depuis le départ)
- Phase : ${phase}
- Historique poids récent :
${recent}

REPAS D'AUJOURD'HUI (${totalKcal} kcal sur 1680 cible) :
${mealLog}`
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
        date: dateIso,
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
          <p className="font-tight text-[14px] leading-[1.5] text-fg whitespace-pre-wrap">{text}</p>
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
  const { phase, programStart, weightHistory, meals, chatHistory, chatDate, setPhase, addMeal, setChatHistory } = useAppStore()

  const week = programWeek(programStart)
  const latest = weightHistory.at(-1)
  const start = weightHistory[0]
  const lost = start && latest ? start.kg - latest.kg : 0
  const todayMeals = mealsForDate(meals, isoToday())
  const today = isoToday()

  const systemPrompt = buildSystemPrompt(phase, week, latest?.kg ?? 0, lost, weightHistory, todayMeals)

  // Restore today's conversation or start fresh
  const initialMessages: ChatMessage[] = chatDate === today && chatHistory.length > 0
    ? chatHistory
    : [{ id: '0', role: 'assistant', content: buildGreeting(week, lost) }]

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [pendingPhase, setPendingPhase] = useState<Phase | null>(null)
  const [pendingMeals, setPendingMeals] = useState<MealEntry[]>([])
  const [apiError, setApiError] = useState<string | null>(null)

  const streamRef = useRef('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streamText])

  // Persist conversation to store
  useEffect(() => {
    if (messages.length > 1) setChatHistory(messages)
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setApiError(null)
    streamRef.current = ''

    const apiMsgs = next.map(m => ({ role: m.role, content: m.content }))

    try {
      await streamLea(systemPrompt, apiMsgs, (chunk) => {
        streamRef.current += chunk
        setStreamText(streamRef.current)
      })

      const full = streamRef.current
      const detectedPhase = extractPhase(full)
      const detectedMeals = extractMeals(full, isoToday())
      const clean = stripMealTags(stripPhaseTag(full))

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: clean }])
      if (detectedPhase && detectedPhase !== phase) setPendingPhase(detectedPhase)
      if (detectedMeals.length > 0) setPendingMeals(detectedMeals)
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
