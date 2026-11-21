import { motion } from 'framer-motion'
import { Activity, BarChart3, Dumbbell, Flame, Home, User } from 'lucide-react'
import { format } from 'date-fns'
import type { ReactNode } from 'react'
import type { TabId } from '../../types'
import { cn, getInitials } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { getStats } from '../../lib/stats'

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'muscles', label: 'Muscles', icon: Activity },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: User },
]

const BrandMark = () => (
  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-[#11140f] shadow-[0_0_28px_-8px_rgba(198,243,106,0.9)]">
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
      <path d="M5 4v16M19 4v16M2 9v6M22 9v6M5 12h14" />
    </svg>
  </div>
)

export const AppShell = ({
  tab,
  onTabChange,
  children,
}: {
  tab: TabId
  onTabChange: (tab: TabId) => void
  children: ReactNode
}) => {
  const profile = useAppStore((state) => state.profile)
  const sessions = useAppStore((state) => state.sessions)
  const stats = getStats(sessions, profile)

  return (
    <div className="min-h-screen">
      <header className="app-header sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <button className="flex items-center gap-3 text-left" onClick={() => onTabChange('home')}>
            <BrandMark />
            <div className="hidden sm:block">
              <p className="text-display text-lg font-bold leading-none tracking-tight text-text">GYMIX</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Train smarter</p>
            </div>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {format(new Date(), 'EEEE, MMM d')}
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
              <Flame size={14} />
              {stats.currentStreak}
            </div>
            <button
              onClick={() => onTabChange('profile')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xs font-bold text-[#11140f] transition hover:scale-105"
              style={{ background: profile.avatarColor }}
              aria-label="Open profile"
            >
              {getInitials(profile.name)}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pr-[calc(5rem+env(safe-area-inset-right))] pt-5 sm:px-6 sm:pb-[calc(10rem+env(safe-area-inset-bottom))] sm:pr-6">{children}</main>

      <nav className="app-dock fixed right-2 top-1/2 z-50 -translate-y-1/2 rounded-2xl border border-border bg-surface/90 p-2 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:left-1/2 sm:top-auto sm:w-auto sm:max-w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:translate-y-0 sm:px-3 sm:py-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1">
          {tabs.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-xs',
                  active ? 'text-accent' : 'text-muted hover:text-text',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-accent/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} className="relative z-10 shrink-0" />
                <span className="relative z-10 whitespace-nowrap">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
