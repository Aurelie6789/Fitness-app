import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Phase = 'déficit' | 'maintenance' | 'rééquilibrage' | 'prise de masse'
export type WeightEntry = { date: string; kg: number }
export type SportType = 'Dynamo' | 'Pilate' | 'Boxe' | 'Course' | 'Marche' | 'Yoga' | 'Autre'

export interface MealEntry {
  id: string
  date: string    // "2026-05-07"
  time: string    // "12:30"
  name: string
  kcal: number
  proteins: number  // g
  carbs: number     // g
  fats: number      // g
  fiber: number     // g
  source: 'coach' | 'manual'
}

export interface SportSession {
  id: string
  date: string    // "2026-05-07"
  time: string    // "17:30"
  type: SportType
  duration: number  // minutes
  kcal: number
  done: boolean
}

// kcal/min estimates for Aurélie (78 kg, 165 cm)
export const KCAL_PER_MIN: Record<SportType, number> = {
  Dynamo: 7,
  Pilate: 3.5,
  Boxe:   8,
  Course: 9,
  Marche: 4,
  Yoga:   3,
  Autre:  5,
}

export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

interface AppState {
  phase: Phase
  programStart: string
  firstName: string
  targetKg: number
  kcalTarget: number
  weightHistory: WeightEntry[]
  sessions: SportSession[]
  meals: MealEntry[]
  chatHistory: ChatMessage[]
  chatDate: string   // ISO date of last chat — reset conversation if day changes

  setPhase:        (phase: Phase) => void
  setKcalTarget:   (v: number) => void
  setTargetKg:     (v: number) => void
  addWeight:       (entry: WeightEntry) => void
  addSession:      (session: SportSession) => void
  toggleDone:      (id: string) => void
  removeSession:   (id: string) => void
  addMeal:         (meal: MealEntry) => void
  removeMeal:      (id: string) => void
  setChatHistory:  (msgs: ChatMessage[]) => void
  resetData:       () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      phase: 'déficit',
      programStart: '2026-04-28',
      firstName: 'Aurélie',
      targetKg: 61,
      kcalTarget: 1680,
      weightHistory: [
        { date: '2026-04-28', kg: 79.75 },
        { date: '2026-05-05', kg: 78.70 },
      ],
      sessions: [],
      meals: [],
      chatHistory: [],
      chatDate: '',

      setPhase:       (phase) => set({ phase }),
      setKcalTarget:  (v) => set({ kcalTarget: v }),
      setTargetKg:    (v) => set({ targetKg: v }),
      setChatHistory: (msgs) => set({ chatHistory: msgs.slice(-80) }),

      resetData: () =>
        set((s) => ({
          sessions: [],
          meals: [],
          chatHistory: [],
          chatDate: '',
          weightHistory: s.weightHistory.slice(0, 1),
          phase: 'déficit',
        })),

      addWeight: (entry) =>
        set((s) => ({
          weightHistory: [...s.weightHistory.filter((e) => e.date !== entry.date), entry]
            .sort((a, b) => a.date.localeCompare(b.date)),
        })),

      addSession: (session) =>
        set((s) => ({ sessions: [...s.sessions, session] })),

      toggleDone: (id) =>
        set((s) => ({
          sessions: s.sessions.map((s) => s.id === id ? { ...s, done: !s.done } : s),
        })),

      removeSession: (id) =>
        set((s) => ({ sessions: s.sessions.filter((s) => s.id !== id) })),

      addMeal: (meal) =>
        set((s) => ({ meals: [...s.meals, meal] })),

      removeMeal: (id) =>
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),
    }),
    { name: 'camille-app' }
  )
)

// ── Helpers ────────────────────────────────────────────────────────────────

export function programWeek(programStart: string): number {
  const start = new Date(programStart)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  return Math.max(1, Math.floor(diffDays / 7) + 1)
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^\w/, (c) => c.toUpperCase())
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Sessions de la semaine en cours (lundi → dimanche) */
export function thisWeekSessions(sessions: SportSession[]): SportSession[] {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon
  const monday = new Date(now)
  monday.setDate(now.getDate() - day)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sessions.filter((s) => {
    const d = new Date(s.date)
    return d >= monday && d <= sunday
  })
}

/** Sessions d'une date donnée (ISO string) */
export function sessionsForDate(sessions: SportSession[], date: string): SportSession[] {
  return sessions.filter((s) => s.date === date).sort((a, b) => a.time.localeCompare(b.time))
}

/** Repas d'une date donnée */
export function mealsForDate(meals: MealEntry[], date: string): MealEntry[] {
  return meals.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time))
}
