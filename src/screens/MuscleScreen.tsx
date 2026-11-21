import { motion } from 'framer-motion'
import { Activity, ArrowLeftRight, CalendarDays, Dumbbell, Layers3, Play, Sparkles, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Exercise, MuscleId, TabId } from '../types'
import { muscleMap } from '../data/exercises'
import { useAppStore } from '../store/useAppStore'
import {
  getMuscleRecoveryMap,
  getWeeklyMuscleSets,
  suggestRoutine,
  type RecoveryStatus,
} from '../lib/coaching'
import { getMuscleAggregates, getMuscleDetail } from '../lib/stats'
import { cn, formatDate, formatDuration, formatVolume, relativeDate } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { ProgressBar, SegmentedControl } from '../components/ui/Misc'
import { AnatomyFigure, type AnatomyView } from '../components/visual/AnatomyFigure'
import { ExerciseDetailModal } from './workout/ExerciseDetailModal'
import { useToast } from '../components/ui/Toast'

const levelLabels = ['Not trained', 'Light', 'Moderate', 'High']
const levelColors = ['#343a33', '#5f8f52', '#8edb78', '#c6f36a']
const recoveryLabels = ['Fresh', 'Recovering', 'Fatigued']
const recoveryColors = ['#5f8f52', '#f4b860', '#f26d6d']
const recoveryPalette = ['#343a33', ...recoveryColors]
const recoveryLevel: Record<RecoveryStatus, number> = { fresh: 1, recovering: 2, fatigued: 3 }
const weeklyStatusLabels = { under: 'Below target', optimal: 'In range', over: 'Above target' }
const weeklyStatusColors = { under: '#f4b860', optimal: '#c6f36a', over: '#f26d6d' }

export const MuscleScreen = ({ onNavigate }: { onNavigate: (tab: TabId) => void }) => {
  const { toast } = useToast()
  const sessions = useAppStore((state) => state.sessions)
  const profile = useAppStore((state) => state.profile)
  const allExercises = useAppStore((state) => state.exercises)
  const routines = useAppStore((state) => state.routines)
  const activeSessionId = useAppStore((state) => state.activeSessionId)
  const addExerciseToActive = useAppStore((state) => state.addExerciseToActive)
  const startWorkout = useAppStore((state) => state.startWorkout)
  const [view, setView] = useState<AnatomyView>('front')
  const [mapMode, setMapMode] = useState<'volume' | 'recovery'>('volume')
  const [selected, setSelected] = useState<MuscleId>('chest')
  const [hovered, setHovered] = useState<MuscleId | null>(null)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [range, setRange] = useState<'30' | '90' | '365'>('90')

  const aggregates = useMemo(() => getMuscleAggregates(sessions, profile, allExercises, Number(range)), [sessions, profile, allExercises, range])
  const levels = useMemo(() => Object.fromEntries(aggregates.map((item) => [item.muscle, item.level])) as Partial<Record<MuscleId, number>>, [aggregates])
  const detail = useMemo(() => getMuscleDetail(sessions, profile, allExercises, selected, Number(range)), [sessions, profile, allExercises, selected, range])
  const recovery = useMemo(() => getMuscleRecoveryMap(sessions, profile, allExercises), [sessions, profile, allExercises])
  const weeklySets = useMemo(() => getWeeklyMuscleSets(sessions, allExercises), [sessions, allExercises])
  const weeklyForSelected = weeklySets.find((entry) => entry.muscle === selected)
  const routineSuggestion = useMemo(() => suggestRoutine(routines, recovery, allExercises), [routines, recovery, allExercises])
  const figureLevels = mapMode === 'recovery'
    ? Object.fromEntries(recovery.map((entry) => [entry.muscle, recoveryLevel[entry.status]])) as Partial<Record<MuscleId, number>>
    : levels
  const legendLabels = mapMode === 'recovery' ? recoveryLabels : levelLabels
  const legendColors = mapMode === 'recovery' ? recoveryColors : levelColors
  const info = muscleMap[selected]
  const label = hovered ?? selected
  const labelStatus = recovery.find((entry) => entry.muscle === label)?.status
  const selectedStatus = recovery.find((entry) => entry.muscle === selected)?.status

  const handleSelect = (id: MuscleId) => {
    setSelected(id)
    const targetView = muscleMap[id].view
    if (targetView !== 'both' && targetView !== view) setView(targetView)
    if (navigator.vibrate) navigator.vibrate(15)
  }

  const startSuggested = () => {
    if (!routineSuggestion || activeSessionId) return
    startWorkout(routineSuggestion.routine.id)
    toast('Workout started', 'success', `${routineSuggestion.routine.name} is ready.`)
    onNavigate('workout')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Anatomy</p>
          <h1 className="text-display mt-1.5 text-3xl font-semibold text-text sm:text-4xl">Muscle map</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Tap any muscle to see its exercises, training volume and recent history. Switch to Recovery to find what is ready to train today.</p>
        </div>
        <SegmentedControl value={range} onChange={setRange} options={[{ value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: '365', label: '1y' }]} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="relative overflow-hidden">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <SegmentedControl value={view} onChange={setView} options={[{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back' }]} />
            <SegmentedControl value={mapMode} onChange={setMapMode} options={[{ value: 'volume', label: 'Volume' }, { value: 'recovery', label: 'Recovery' }]} />
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted">
              <ArrowLeftRight size={13} />
              {label === selected
                ? 'Select a muscle'
                : `${muscleMap[label].name}${mapMode === 'recovery' && labelStatus ? ` · ${labelStatus}` : ''}`}
            </span>
          </div>
          <div className="relative mx-auto h-[440px] w-full max-w-[340px] sm:h-[500px]">
            <AnatomyFigure
              view={view}
              levels={figureLevels}
              selected={selected}
              onSelect={handleSelect}
              onHover={setHovered}
              colors={mapMode === 'recovery' ? recoveryPalette : levelColors}
            />
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className="label mb-3">{mapMode === 'recovery' ? 'Recovery status' : 'Activation intensity'}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {legendLabels.map((labelText, index) => (
                <div key={labelText} className="flex items-center gap-2 text-[11px] text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: legendColors[index] }} />
                  {labelText}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted/80">
              {mapMode === 'recovery'
                ? 'Fresh means 72h+ since last training, recovering means 24–72h, and fatigued means trained in the last 24h.'
                : 'Activation is calculated from logged set volume over the selected period. Primary muscle work counts fully; secondary work counts at 35%.'}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-accent/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{info.region}</p>
                <h2 className="text-display mt-1.5 text-2xl font-semibold text-text">{info.name}</h2>
              </div>
              <span className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ color: mapMode === 'recovery' ? recoveryColors[recoveryLevel[selectedStatus ?? 'fresh'] - 1] : levelColors[detail.level], borderColor: `${mapMode === 'recovery' ? recoveryColors[recoveryLevel[selectedStatus ?? 'fresh'] - 1] : levelColors[detail.level]}55`, background: `${mapMode === 'recovery' ? recoveryColors[recoveryLevel[selectedStatus ?? 'fresh'] - 1] : levelColors[detail.level]}18` }}>
                {mapMode === 'recovery' ? `${selectedStatus ?? 'fresh'} · recovery` : `${levelLabels[detail.level]} activation`}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{detail.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-border bg-bg/40 p-3"><CalendarDays size={14} className="text-muted" /><p className="mt-2 text-display text-lg font-semibold text-text">{detail.workouts}</p><p className="text-[10px] text-muted">Workouts</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><TrendingUp size={14} className="text-muted" /><p className="mt-2 text-display text-lg font-semibold text-text">{formatVolume(detail.volume, profile.unit)}</p><p className="text-[10px] text-muted">volume</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><Dumbbell size={14} className="text-muted" /><p className="mt-2 text-display text-lg font-semibold text-text">{detail.exercises.size}</p><p className="text-[10px] text-muted">Exercises</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><Activity size={14} className="text-muted" /><p className="mt-2 text-xs font-semibold text-text">{detail.lastTrained ? relativeDate(detail.lastTrained) : 'Never'}</p><p className="text-[10px] text-muted">Last trained</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><Layers3 size={14} className="text-muted" /><p className="mt-2 text-display text-lg font-semibold text-text">{weeklyForSelected?.sets ?? 0}<span className="text-xs text-muted">/{weeklyForSelected?.max ?? 20}</span></p><p className="text-[10px] text-muted">Weekly hard sets</p></div>
            </div>
          </Card>

          <Card className="border-accent/25 bg-gradient-to-br from-accent/[0.08] via-card to-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent"><Sparkles size={17} /></div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Suggested today</p>
                  <p className="text-sm font-semibold text-text">{routineSuggestion?.routine.name ?? 'No routine available'}</p>
                </div>
              </div>
              <Button size="sm" onClick={startSuggested} disabled={!!activeSessionId || !routineSuggestion}>
                <Play size={14} /> {activeSessionId ? 'Workout active' : 'Start routine'}
              </Button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">{routineSuggestion?.reason ?? 'Add a routine to get a recovery-based recommendation.'}</p>
          </Card>

          <Card>
            <SectionHeader title="Primary exercises" subtitle="Movements that target this muscle directly" />
            <div className="space-y-2">
              {detail.primaryExercises.length === 0 && <p className="py-4 text-sm text-muted">No exercises found for this muscle.</p>}
              {detail.primaryExercises.map((exercise) => (
                <button key={exercise.id} onClick={() => setDetailExercise(exercise)} className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-bg/40 p-2.5 text-left transition hover:border-accent/30">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><Dumbbell size={14} /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text">{exercise.name}</p><p className="text-[10px] text-muted">{exercise.equipment} · {exercise.sets} × {exercise.reps}</p></div>
                  <span className={cn('text-[10px] font-bold', exercise.difficulty === 'Advanced' ? 'text-danger' : exercise.difficulty === 'Intermediate' ? 'text-warning' : 'text-success')}>{exercise.difficulty[0]}</span>
                </button>
              ))}
            </div>
            {detail.secondaryExercises.length > 0 && (
              <>
                <p className="label mt-5">Secondary exercises</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.secondaryExercises.map((exercise) => (
                    <button key={exercise.id} onClick={() => setDetailExercise(exercise)} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-muted transition hover:text-text">{exercise.name}</button>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <SectionHeader title="Recent training history" subtitle="Sessions that involved this muscle" />
            {detail.history.length === 0 ? <p className="py-6 text-center text-sm text-muted">No history yet for this muscle.</p> : (
              <div className="space-y-2">
                {detail.history.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-bg/40 p-3">
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text">{session.name}</p><p className="text-[10px] text-muted">{formatDate(session.date)} · {formatDuration(session.durationSec)} · {session.exercises} exercises</p></div>
                    <div className="text-right"><p className="text-xs font-semibold text-accent">{formatVolume(session.volume, profile.unit)}</p><p className="text-[10px] text-muted">volume</p></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <SectionHeader title="All muscle groups" subtitle="Volume distribution across your body" action={<span className="text-[11px] text-muted">{allExercises.length} exercises in library</span>} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aggregates.map((item) => (
            <button key={item.muscle} onClick={() => handleSelect(item.muscle)} className={cn('rounded-2xl border p-3 text-left transition', selected === item.muscle ? 'border-accent/50 bg-accent/[0.06]' : 'border-border bg-bg/40 hover:border-accent/25')}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text">{item.name}</span>
                <span className="text-[10px] text-muted">{item.workouts} sessions</span>
              </div>
              <div className="mt-3"><ProgressBar value={(item.volume / Math.max(1, aggregates[0].volume)) * 100} color={levelColors[item.level]} /></div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted"><span>{levelLabels[item.level]}</span><span>{formatVolume(item.volume, profile.unit)}</span></div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Weekly hard sets"
          subtitle="Target 10–20 per muscle · RPE 7+ counts as hard"
          action={<span className="text-[11px] text-muted">Rolling 7 days</span>}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {weeklySets.map((entry) => (
            <button
              key={entry.muscle}
              onClick={() => handleSelect(entry.muscle)}
              className={cn(
                'rounded-2xl border p-3 text-left transition',
                selected === entry.muscle ? 'border-accent/50 bg-accent/[0.06]' : 'border-border bg-bg/40 hover:border-accent/25',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-text">{entry.name}</span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: weeklyStatusColors[entry.status] }}>
                  {entry.sets}/{entry.max}
                </span>
              </div>
              <div className="mt-2"><ProgressBar value={(entry.sets / entry.max) * 100} color={weeklyStatusColors[entry.status]} /></div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
                <span>{weeklyStatusLabels[entry.status]}</span>
                <span>Target {entry.min}–{entry.max}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <ExerciseDetailModal
        exercise={detailExercise}
        open={!!detailExercise}
        onClose={() => setDetailExercise(null)}
        onAddToWorkout={(id) => {
          addExerciseToActive(id)
          toast('Exercise added', 'success', 'Added to your active workout.')
        }}
      />
    </motion.div>
  )
}
