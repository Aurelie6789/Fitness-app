import { Home, Utensils, Activity, MessageCircle, Scale } from 'lucide-react'
import { T } from '../tokens'

export type TabKey = 'home' | 'meals' | 'sport' | 'coach' | 'weight'

const TABS = [
  { k: 'home',   label: 'Accueil', Icon: Home },
  { k: 'meals',  label: 'Repas',   Icon: Utensils },
  { k: 'sport',  label: 'Sport',   Icon: Activity },
  { k: 'coach',  label: 'Coach',   Icon: MessageCircle },
  { k: 'weight', label: 'Pesée',   Icon: Scale },
] as const

export default function TabBar({
  active,
  onNavigate,
}: {
  active: TabKey
  onNavigate: (tab: TabKey) => void
}) {
  return (
    <nav
      className="fixed left-3 right-3 h-16 grid grid-cols-5 rounded-tab glass border-hl2 z-50"
      style={{ bottom: 'max(14px, env(safe-area-inset-bottom))', boxShadow: '0 12px 30px rgba(0,0,0,0.45)' }}
    >
      {TABS.map(({ k, label, Icon }) => {
        const on = k === active
        return (
          <button
            key={k}
            onClick={() => onNavigate(k as TabKey)}
            className="relative flex flex-col items-center justify-center gap-[3px] h-full"
            style={{ color: on ? T.accent : T.fgMid }}
          >
            {on && (
              <span
                className="absolute top-1 w-[26px] h-[3px] rounded-full"
                style={{ background: T.accent, boxShadow: `0 0 12px ${T.accent}` }}
              />
            )}
            <Icon size={20} strokeWidth={on ? 2 : 1.6} />
            <span
              className="font-tight text-[9.5px] uppercase tracking-[0.8px]"
              style={{ fontWeight: on ? 600 : 500 }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
