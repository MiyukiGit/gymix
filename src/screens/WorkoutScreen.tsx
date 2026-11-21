import { motion } from 'framer-motion'
import { Dumbbell, Library, ListPlus, Play, Plus } from 'lucide-react'
import { useState } from 'react'
import type { TabId } from '../types'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState, Modal, SegmentedControl } from '../components/ui/Misc'
import { useToast } from '../components/ui/Toast'
import { ActiveWorkout, NoActiveWorkout } from './workout/ActiveWorkout'
import { ExerciseLibrary } from './workout/ExerciseLibrary'
import { Routines } from './workout/Routines'
import { WorkoutHistory } from './workout/WorkoutHistory'

type WorkoutTab = 'active' | 'routines' | 'library' | 'history'

export const WorkoutScreen = ({ onNavigate }: { onNavigate: (tab: TabId) => void }) => {
  const { toast } = useToast()
  const profile = useAppStore((state) => state.profile)
  const sessions = useAppStore((state) => state.sessions)
  const activeSessionId = useAppStore((state) => state.activeSessionId)
  const startWorkout = useAppStore((state) => state.startWorkout)
  const startEmptyWorkout = useAppStore((state) => state.startEmptyWorkout)
  const addExerciseToActive = useAppStore((state) => state.addExerciseToActive)
  const active = sessions.find((session) => session.id === activeSessionId)
  const [tab, setTab] = useState<WorkoutTab>(active ? 'active' : 'routines')
  const [showStart, setShowStart] = useState(false)

  const handleAddToWorkout = (exerciseId: string) => {
    addExerciseToActive(exerciseId)
    toast('Exercise added', 'success', 'Added to your active workout.')
    setTab('active')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Training</p>
          <h1 className="text-display mt-1.5 text-3xl font-semibold text-text sm:text-4xl">Workout</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'active', label: active ? `Active${active.exercises.length ? ` (${active.exercises.length})` : ''}` : 'Start' },
              { value: 'routines', label: 'Routines' },
              { value: 'library', label: 'Library' },
              { value: 'history', label: 'History' },
            ]}
          />
          {!active && <Button size="sm" onClick={() => setShowStart(true)}><Plus size={14} /> New session</Button>}
        </div>
      </div>

      {tab === 'active' && (active ? <ActiveWorkout session={active} profile={profile} /> : (
        <Card>
          <EmptyState
            icon={Play}
            title="Ready when you are"
            description="Start a template from Routines, build a custom session, or open the exercise library to plan as you go."
            action="Start empty workout"
            onAction={startEmptyWorkout}
          />
          <div className="flex justify-center gap-3 pb-8">
            <Button variant="secondary" onClick={() => setTab('routines')}><ListPlus size={15} /> Browse routines</Button>
            <Button variant="outline" onClick={() => setTab('library')}><Library size={15} /> Exercise library</Button>
          </div>
        </Card>
      ))}

      {tab === 'routines' && <Routines onStart={(routineId) => { startWorkout(routineId); setTab('active'); toast('Workout started', 'success') }} onBrowse={() => setTab('library')} />}
      {tab === 'library' && <ExerciseLibrary onAddToWorkout={handleAddToWorkout} />}
      {tab === 'history' && <WorkoutHistory />}

      <Modal open={showStart} onClose={() => setShowStart(false)} title="Start a workout" subtitle="Choose how you want to train today." size="sm">
        <div className="space-y-3">
          <button onClick={() => { startEmptyWorkout(); setShowStart(false); setTab('active'); toast('Empty workout started', 'success', 'Add exercises as you go.') }} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-bg/40 p-4 text-left transition hover:border-accent/40">
            <Dumbbell size={20} className="text-accent" />
            <div><p className="text-sm font-semibold text-text">Custom workout</p><p className="text-xs text-muted">Start empty and add exercises live</p></div>
          </button>
          <button onClick={() => { setShowStart(false); setTab('routines') }} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-bg/40 p-4 text-left transition hover:border-accent/40">
            <ListPlus size={20} className="text-accent" />
            <div><p className="text-sm font-semibold text-text">Use a routine</p><p className="text-xs text-muted">Push, Pull, Legs and more</p></div>
          </button>
          <Button variant="ghost" fullWidth onClick={() => { setShowStart(false); onNavigate('home') }}>Cancel</Button>
        </div>
      </Modal>
    </motion.div>
  )
}
