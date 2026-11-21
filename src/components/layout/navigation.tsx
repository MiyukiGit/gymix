import { AnimatePresence, motion } from 'framer-motion'
import { Activity, BarChart3, Dumbbell, Flame, Home, User, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TabId } from '../../types'
import { cn } from '../../lib/utils'

export const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'muscles', label: 'Muscles', icon: Activity },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: User },
]

export const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={cn(
      'relative flex items-center justify-center rounded-xl bg-accent text-[#11140f] shadow-[0_0_28px_-8px_rgba(198,243,106,0.9)]',
      compact ? 'h-10 w-10' : 'h-9 w-9',
    )}
  >
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
      <path d="M5 4v16M19 4v16M2 9v6M22 9v6M5 12h14" />
    </svg>
  </div>
)

export const BrandName = () => (
  <div>
    <p className="text-display text-lg font-bold leading-none tracking-tight text-text">GYMIX</p>
    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Train smarter</p>
  </div>
)

export const DesktopNav = ({ tab, onNavigate }: { tab: TabId; onNavigate: (tab: TabId) => void }) => (
  <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/50 p-1 md:flex" aria-label="Primary navigation">
    {tabs.map((item) => {
      const Icon = item.icon
      const active = tab === item.id
      return (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            active ? 'text-[#11140f]' : 'text-muted hover:text-text',
          )}
        >
          {active && (
            <motion.span
              layoutId="desktop-nav-active"
              className="absolute inset-0 rounded-full bg-accent"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <Icon size={16} strokeWidth={active ? 2.4 : 1.8} className="relative z-10" />
          <span className="relative z-10 whitespace-nowrap">{item.label}</span>
        </button>
      )
    })}
  </nav>
)

export const NavigationDrawer = ({
  open,
  tab,
  streak,
  onClose,
  onNavigate,
  footer,
}: {
  open: boolean
  tab: TabId
  streak: number
  onClose: () => void
  onNavigate: (tab: TabId) => void
  footer?: ReactNode
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[130] md:hidden" role="dialog" aria-modal="true" aria-label="GYMIX navigation">
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          aria-hidden="true"
        />
        <motion.aside
          initial={{ x: '-104%', opacity: 0.98 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-104%', opacity: 0.98 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="relative flex h-full min-h-dvh w-[min(80vw,320px)] max-w-[calc(100vw-3.5rem)] flex-col border-r border-border bg-surface pt-16 shadow-[24px_0_70px_-24px_rgba(0,0,0,0.95)]"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))', paddingLeft: 'calc(1rem + env(safe-area-inset-left))' }}
        >
          <div className="flex items-start justify-between gap-4 pr-4">
            <div className="flex items-center gap-3">
              <BrandMark compact />
              <BrandName />
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/60 text-muted transition hover:border-accent/40 hover:text-text"
              aria-label="Close navigation"
              autoFocus
            >
              <X size={19} />
            </button>
          </div>

          <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
            <Flame size={14} />
            {streak} day streak
          </div>

          <nav className="mt-8 flex flex-col gap-1.5 pr-4" aria-label="Primary navigation">
            {tabs.map((item) => {
              const Icon = item.icon
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id)
                    onClose()
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors',
                    active
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-transparent text-muted hover:border-border hover:bg-card/70 hover:text-text',
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  <span>{item.label}</span>
                  {active && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto pr-4">
            {footer}
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted/70">Offline-ready · Local first</p>
          </div>
        </motion.aside>
      </div>
    )}
  </AnimatePresence>
)
