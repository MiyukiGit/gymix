import { Flame, Menu } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useState, type ReactNode } from 'react'
import type { TabId } from '../../types'
import { getInitials } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { getStats } from '../../lib/stats'
import { BrandMark, BrandName, DesktopNav, NavigationDrawer } from './navigation'

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
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    const previousOverflow = document.body.style.overflow
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  useEffect(() => setMenuOpen(false), [tab])

  return (
    <div className="min-h-dvh">
      <header className="app-header sticky top-0 z-40 border-b border-border/60 bg-bg backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-[#11140f] shadow-[0_0_28px_-8px_rgba(198,243,106,0.9)] transition hover:scale-105 active:scale-95 md:hidden"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              <Menu size={21} strokeWidth={2.5} />
            </button>
            <button className="hidden min-w-0 items-center gap-3 text-left md:flex" onClick={() => onTabChange('home')}>
              <BrandMark />
              <BrandName />
            </button>
            <button className="flex min-w-0 items-center gap-3 text-left md:hidden" onClick={() => onTabChange('home')}>
              <BrandMark />
            </button>
          </div>

          <DesktopNav tab={tab} onNavigate={onTabChange} />

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted lg:flex">
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

      <main className="mx-auto max-w-7xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-[calc(3rem+env(safe-area-inset-bottom))]">{children}</main>

      <div id="mobile-navigation">
        <NavigationDrawer
          open={menuOpen}
          tab={tab}
          streak={stats.currentStreak}
          onClose={() => setMenuOpen(false)}
          onNavigate={onTabChange}
          footer={<p className="mb-3 text-xs leading-relaxed text-muted">Signed in locally as <span className="font-semibold text-text">{profile.name}</span></p>}
        />
      </div>
    </div>
  )
}
