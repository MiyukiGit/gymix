import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { TabId } from './types'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/ui/Toast'
import { HomeScreen } from './screens/HomeScreen'
import { WorkoutScreen } from './screens/WorkoutScreen'
import { MuscleScreen } from './screens/MuscleScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { ProfileScreen } from './screens/ProfileScreen'

const validTabs: TabId[] = ['home', 'workout', 'muscles', 'progress', 'profile']

const initialTab = (): TabId => {
  const hash = window.location.hash.replace('#', '') as TabId
  return validTabs.includes(hash) ? hash : 'home'
}

const screens: Record<TabId, (props: { onNavigate: (tab: TabId) => void }) => React.ReactNode> = {
  home: HomeScreen,
  workout: WorkoutScreen,
  muscles: MuscleScreen,
  progress: ProgressScreen,
  profile: ProfileScreen,
}

export default function App() {
  const [tab, setTab] = useState<TabId>(initialTab)

  useEffect(() => {
    if (window.location.hash !== `#${tab}`) window.location.hash = tab
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '') as TabId
      if (validTabs.includes(hash)) setTab(hash)
    }
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  const navigate = (next: TabId) => setTab(next)
  const Screen = screens[tab]

  return (
    <ToastProvider>
      <AppShell tab={tab} onTabChange={navigate}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <Screen onNavigate={navigate} />
          </motion.div>
        </AnimatePresence>
      </AppShell>
    </ToastProvider>
  )
}
