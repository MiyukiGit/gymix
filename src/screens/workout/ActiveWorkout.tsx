import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, ChevronDown, Clock3, Copy, Dumbbell, Minus, Plus, Sparkles, Timer, Trash2, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { PersonalRecord, UserProfile, WorkoutSession } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import type { UnlockedAchievementDef } from '../../lib/achievements'
import { muscleMap } from '../../data/exercises'
import { getProgressionSuggestion, type PreviousPerformance } from '../../lib/coaching'
import { getExerciseFromCatalog, isTimedExercise, sessionVolume, setDurationSec } from '../../lib/metrics'
import { unlockRestAudio } from '../../lib/restAudio'
import { cn, formatDuration, formatTimer, formatVolume, formatWeight, fromDisplayWeight, round, toDisplayWeight } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Card, SectionHeader } from '../../components/ui/Card'
import { EmptyState, Modal, ProgressBar } from '../../components/ui/Misc'
import { useToast } from '../../components/ui/Toast'

export const ActiveWorkout = ({ session, profile }: { session: WorkoutSession; profile: UserProfile }) => {
  const { toast } = useToast()
  const exercises = useAppStore((state) => state.exercises)
  const addSet = useAppStore((state) => state.addSet)
  const removeSet = useAppStore((state) => state.removeSet)
  const updateSet = useAppStore((state) => state.updateSet)
  const toggleSet = useAppStore((state) => state.toggleSet)
  const copyPreviousSet = useAppStore((state) => state.copyPreviousSet)
  const moveExercise = useAppStore((state) => state.moveExercise)
  const removeExercise = useAppStore((state) => state.removeExerciseFromActive)
  const updateExerciseNotes = useAppStore((state) => state.updateExerciseNotes)
  const updateSessionNotes = useAppStore((state) => state.updateSessionNotes)
  const finishWorkout = useAppStore((state) => state.finishWorkout)
  const cancelWorkout = useAppStore((state) => state.cancelWorkout)
  const restTimer = useAppStore((state) => state.restTimer)
  const startRestTimer = useAppStore((state) => state.startRestTimer)
  const adjustRestTimer = useAppStore((state) => state.adjustRestTimer)
  const clearRestTimer = useAppStore((state) => state.clearRestTimer)

  const [tick, setTick] = useState(0)
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [unlocked, setUnlocked] = useState<UnlockedAchievementDef[]>([])
  const [newPRs, setNewPRs] = useState<PersonalRecord[]>([])
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

  // A locked screen throttles intervals; recompute from the persisted end time on wake.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setTick((value) => value + 1)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const restLeft = restTimer ? Math.max(0, Math.ceil((restTimer.endsAt - Date.now()) / 1000)) : 0

  void tick
  const elapsed = useMemo(() => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))
    return Math.min(seconds, 4 * 60 * 60)
  }, [tick, session.startedAt])

  const completedSets = session.exercises.reduce((sum, item) => sum + item.sets.filter((set) => set.completed).length, 0)
  const totalSets = session.exercises.reduce((sum, item) => sum + item.sets.length, 0)
  const liveVolume = useMemo(() => sessionVolume(session, exercises, profile), [session, exercises, profile])
  const progress = totalSets ? (completedSets / totalSets) * 100 : 0

  const prDisplay = (record: PersonalRecord) => {
    if (record.type === 'time') return formatTimer(record.value)
    if (record.type === 'reps') return `${record.value} reps`
    if (record.type === 'volume') return formatVolume(record.value, profile.unit)
    return formatWeight(record.value, profile.unit, 1)
  }

  const suggestionTone = {
    increase: 'border-accent/25 bg-accent/[0.06] text-accent',
    hold: 'border-warning/25 bg-warning/[0.06] text-warning',
    reduce: 'border-danger/25 bg-danger/[0.06] text-danger',
    start: 'border-border bg-card-2/40 text-muted',
  }

  const adjust = (workoutExerciseId: string, setId: string, field: 'weight' | 'reps', delta: number) => {
    const item = session.exercises.find((entry) => entry.id === workoutExerciseId)
    const set = item?.sets.find((entry) => entry.id === setId)
    if (!set) return
    const exercise = getExerciseFromCatalog(item!.exerciseId, exercises)
    if (field === 'weight') {
      const step = profile.unit === 'kg' ? 2.5 : 5
      const next = Math.max(0, round(toDisplayWeight(set.weight, profile.unit) + delta * step, 1))
      updateSet(workoutExerciseId, setId, { weight: fromDisplayWeight(next, profile.unit) })
      return
    }
    if (isTimedExercise(exercise)) {
      const next = Math.max(1, setDurationSec(set, exercise) + delta * 15)
      updateSet(workoutExerciseId, setId, { durationSec: next, reps: 1 })
    } else {
      updateSet(workoutExerciseId, setId, { reps: Math.max(1, set.reps + delta) })
    }
  }

  const startRest = () => {
    unlockRestAudio()
    startRestTimer(profile.restBetweenSets)
    try {
      navigator.vibrate?.(30)
    } catch {
      // Some browsers block vibration without a recent user gesture.
    }
  }

  const handleFinish = () => {
    const result = finishWorkout()
    setShowSummary(false)
    setNewPRs(result.prs)
    setUnlocked(result.achievements)
    if (result.prs.length || result.achievements.length) setShowCelebration(true)

    result.prs.forEach((record) => {
      const name = getExerciseFromCatalog(record.exerciseId, exercises)?.name ?? 'Exercise'
      toast('New PR!', 'achievement', `${name} · ${prDisplay(record)}`)
    })
    result.achievements.forEach((achievement) => toast(achievement.name, 'achievement', achievement.description))
    if (!result.prs.length && !result.achievements.length) {
      toast('Workout saved', 'success', `${session.name} · ${formatDuration(elapsed)} · ${formatVolume(liveVolume, profile.unit)} volume`)
    }
  }

  const handleCancel = () => {
    cancelWorkout()
    toast('Workout discarded', 'info', 'No sets from this session were saved.')
  }

  return (
    <div className="space-y-5">
      <Card className="border-accent/25 bg-gradient-to-br from-accent/[0.09] via-card to-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Live session
            </span>
            <h1 className="text-display mt-3 text-2xl font-semibold text-text sm:text-3xl">{session.name}</h1>
            <p className="mt-1 text-xs text-muted">{new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-display text-2xl font-semibold text-text tabular-nums">{formatTimer(elapsed)}</p>
              <p className="text-[11px] text-muted">Elapsed</p>
            </div>
            <Button variant="secondary" onClick={() => setShowSummary(true)}>Finish</Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
          <div><p className="text-[11px] text-muted">Exercises</p><p className="text-sm font-semibold text-text">{session.exercises.length}</p></div>
          <div><p className="text-[11px] text-muted">Sets done</p><p className="text-sm font-semibold text-text">{completedSets}/{totalSets}</p></div>
          <div><p className="text-[11px] text-muted">Volume</p><p className="text-sm font-semibold text-text">{formatVolume(liveVolume, profile.unit)}</p></div>
        </div>
        <div className="mt-4"><ProgressBar value={progress} /></div>
      </Card>

      <div className="space-y-4">
        {session.exercises.map((item, exerciseIndex) => {
          const exercise = getExerciseFromCatalog(item.exerciseId, exercises)
          if (!exercise) return null
          const timed = isTimedExercise(exercise)
          const previousPerformances: PreviousPerformance[] = item.sets.flatMap((set) =>
            set.previous ? [{ ...set.previous }] : [],
          )
          const suggestion = getProgressionSuggestion(exercise, previousPerformances, profile)
          return (
            <Card key={item.id} padded={false} className="overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-card-2/40 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">{exerciseIndex + 1}</div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-text">{exercise.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                      <span>{exercise.equipment}</span>
                      <span>{exercise.primary.slice(0, 3).map((id) => muscleMap[id]?.name).filter(Boolean).join(' · ')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-text disabled:opacity-30" onClick={() => moveExercise(item.id, -1)} disabled={exerciseIndex === 0} aria-label="Move up"><ArrowUp size={15} /></button>
                  <button className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-text disabled:opacity-30" onClick={() => moveExercise(item.id, 1)} disabled={exerciseIndex === session.exercises.length - 1} aria-label="Move down"><ArrowDown size={15} /></button>
                  <button className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" onClick={() => removeExercise(item.id)} aria-label="Remove exercise"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className={cn('mx-4 mt-3 rounded-xl border px-3 py-2 text-[11px]', suggestionTone[suggestion.kind])}>
                <span className="font-bold uppercase tracking-wider">Coach</span>
                <span className="mx-1.5 opacity-50">·</span>
                <span className="font-semibold">{suggestion.title}</span>
                <span className="ml-1.5 opacity-80">{suggestion.detail}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted">
                      <th className="w-12 px-4 py-2 font-semibold">Set</th>
                      <th className="px-2 py-2 font-semibold">Previous</th>
                      <th className="px-2 py-2 font-semibold">Weight ({profile.unit})</th>
                      <th className="px-2 py-2 font-semibold">{timed ? 'Seconds' : 'Reps'}</th>
                      <th className="w-20 px-2 py-2 font-semibold">RPE</th>
                      <th className="w-16 px-2 py-2 text-center font-semibold">Done</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {item.sets.map((set, setIndex) => {
                      const seconds = setDurationSec(set, exercise)
                      return (
                        <motion.tr
                          key={set.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={cn('border-b border-border/40 last:border-0 transition-colors', set.completed && 'bg-accent/[0.035]')}
                        >
                          <td className="px-4 py-2.5">
                            <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', set.completed ? 'bg-accent text-[#11140f]' : 'bg-card-2 text-muted')}>{setIndex + 1}</span>
                          </td>
                          <td className="px-2 py-2.5 text-xs text-muted">
                            <div className="flex items-center gap-1.5">
                              <span className="whitespace-nowrap">
                                {set.previous
                                  ? timed && set.previous.durationSec
                                    ? `${set.previous.durationSec}s`
                                    : `${round(toDisplayWeight(set.previous.weight, profile.unit), 1)} × ${set.previous.reps}`
                                  : '—'}
                              </span>
                              <button
                                className="rounded p-1 text-muted/60 transition hover:bg-white/5 hover:text-accent disabled:opacity-20"
                                disabled={!set.previous}
                                onClick={() => copyPreviousSet(item.id, set.id)}
                                title="Copy this previous set"
                                aria-label="Copy this previous set"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-1">
                              <button className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-text" onClick={() => adjust(item.id, set.id, 'weight', -1)} aria-label="Decrease weight"><Minus size={13} /></button>
                              <input
                                type="number"
                                min="0"
                                step={profile.unit === 'kg' ? '2.5' : '5'}
                                value={round(toDisplayWeight(set.weight, profile.unit), 1)}
                                onChange={(event) => updateSet(item.id, set.id, { weight: fromDisplayWeight(Number(event.target.value), profile.unit) })}
                                className="w-16 rounded-lg border border-border bg-bg/70 px-2 py-1.5 text-center text-xs font-semibold text-text outline-none focus:border-accent/60"
                              />
                              <button className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-text" onClick={() => adjust(item.id, set.id, 'weight', 1)} aria-label="Increase weight"><Plus size={13} /></button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-1">
                              <button className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-text" onClick={() => adjust(item.id, set.id, 'reps', -1)} aria-label={timed ? 'Decrease seconds' : 'Decrease reps'}><Minus size={13} /></button>
                              <input
                                type="number"
                                min="1"
                                step={timed ? '15' : '1'}
                                value={timed ? seconds : set.reps}
                                onChange={(event) =>
                                  timed
                                    ? updateSet(item.id, set.id, { durationSec: Math.max(1, Number(event.target.value)), reps: 1 })
                                    : updateSet(item.id, set.id, { reps: Math.max(1, Number(event.target.value)) })
                                }
                                className="w-14 rounded-lg border border-border bg-bg/70 px-2 py-1.5 text-center text-xs font-semibold text-text outline-none focus:border-accent/60"
                              />
                              <button className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-text" onClick={() => adjust(item.id, set.id, 'reps', 1)} aria-label={timed ? 'Increase seconds' : 'Increase reps'}><Plus size={13} /></button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <select
                              value={set.rpe ?? ''}
                              disabled={!set.completed}
                              onChange={(event) => updateSet(item.id, set.id, {
                                rpe: event.target.value ? Number(event.target.value) : undefined,
                              })}
                              className="w-14 rounded-lg border border-border bg-bg/70 px-1 py-1.5 text-center text-xs font-semibold text-text outline-none focus:border-accent/60 disabled:opacity-40"
                              aria-label={`RPE for set ${setIndex + 1}`}
                            >
                              <option value="">—</option>
                              {[6, 7, 8, 9, 10].map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={() => {
                                if (!set.completed) startRest()
                                toggleSet(item.id, set.id)
                              }}
                              className={cn(
                                'mx-auto flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-90',
                                set.completed ? 'border-accent bg-accent text-[#11140f]' : 'border-border text-muted hover:border-accent/50 hover:text-accent',
                              )}
                              aria-label={set.completed ? 'Mark incomplete' : 'Complete set'}
                            >
                              <Check size={16} strokeWidth={3} />
                            </button>
                          </td>
                          <td className="px-1 py-2.5">
                            <button className="rounded-md p-1 text-muted/60 hover:text-danger" onClick={() => removeSet(item.id, set.id)} aria-label="Delete set"><X size={13} /></button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
                <Button variant="ghost" size="sm" onClick={() => addSet(item.id)}><Plus size={14} /> Add set</Button>
                <button
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-muted transition hover:text-accent"
                  onClick={() => setExpandedNotes(expandedNotes === item.id ? null : item.id)}
                >
                  <ChevronDown size={14} className={cn('transition-transform', expandedNotes === item.id && 'rotate-180')} /> Notes
                </button>
              </div>
              <AnimatePresence>
                {expandedNotes === item.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4">
                    <textarea
                      className="field mb-4 min-h-20 resize-y"
                      placeholder="How did this exercise feel? RPE, form notes, anything…"
                      value={item.notes ?? ''}
                      onChange={(event) => updateExerciseNotes(item.id, event.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )
        })}
      </div>

      <Card>
        <SectionHeader title="Session notes" subtitle="Optional context for your future self" />
        <textarea className="field min-h-24 resize-y" placeholder="Energy, sleep, soreness, wins…" value={session.notes ?? ''} onChange={(event) => updateSessionNotes(event.target.value)} />
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" onClick={handleCancel}>Discard workout</Button>
          <Button fullWidth onClick={() => setShowSummary(true)}><Check size={16} /> Finish workout</Button>
        </div>
      </Card>

      <AnimatePresence>
        {restTimer && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-0 bottom-28 z-40 mx-auto w-[min(22rem,calc(100%-2rem))] rounded-2xl border border-accent/35 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-24"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent"><Timer size={22} /></div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-muted">{restLeft === 0 ? 'Rest complete' : 'Rest timer'}</p>
                <p className="text-display text-2xl font-semibold text-text tabular-nums">{formatTimer(restLeft)}</p>
              </div>
              <div className="flex gap-1">
                <button className="rounded-lg bg-white/5 p-2 text-xs text-muted hover:text-text" onClick={() => adjustRestTimer(-15)}>-15s</button>
                <button className="rounded-lg bg-white/5 p-2 text-xs text-muted hover:text-text" onClick={() => adjustRestTimer(15)}>+15s</button>
                <button className="rounded-lg p-2 text-muted hover:text-danger" onClick={clearRestTimer} aria-label="Dismiss timer"><X size={15} /></button>
              </div>
            </div>
            <div className="mt-3"><ProgressBar value={(restLeft / Math.max(1, restTimer.durationSec)) * 100} color="#f4b860" /></div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={showSummary} onClose={() => setShowSummary(false)} title="Finish workout?" subtitle="Review your session before saving it." size="sm">
        <div className="space-y-3 rounded-2xl border border-border bg-bg/40 p-4">
          <div className="flex justify-between text-sm"><span className="text-muted">Duration</span><span className="font-semibold text-text">{formatDuration(elapsed)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted">Exercises</span><span className="font-semibold text-text">{session.exercises.length}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted">Completed sets</span><span className="font-semibold text-text">{completedSets}/{totalSets}</span></div>
          <div className="flex justify-between border-t border-border pt-3 text-sm"><span className="text-muted">Volume</span><span className="font-semibold text-accent">{formatVolume(liveVolume, profile.unit)}</span></div>
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setShowSummary(false)}>Keep training</Button>
          <Button fullWidth onClick={handleFinish}><Check size={16} /> Save workout</Button>
        </div>
      </Modal>

      <Modal
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        title={newPRs.length ? 'New personal records!' : 'Achievement unlocked!'}
        subtitle="Nice work — your progress is saved."
        size="sm"
      >
        <div className="space-y-4">
          {newPRs.length > 0 && (
            <div className="space-y-2">
              <p className="label">Personal records</p>
              {newPRs.map((record) => (
                <motion.div key={record.id} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/[0.07] p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/15 text-warning"><Trophy size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">{getExerciseFromCatalog(record.exerciseId, exercises)?.name ?? 'Exercise'}</p>
                    <p className="text-[11px] text-muted">{record.type === 'time' ? 'Longest hold' : record.type === 'volume' ? 'Session volume' : record.type === 'reps' ? 'Most reps' : record.type === 'e1rm' ? 'Estimated 1RM' : 'Heaviest set'}</p>
                  </div>
                  <p className="text-xs font-bold text-accent">{prDisplay(record)}</p>
                </motion.div>
              ))}
            </div>
          )}
          {unlocked.length > 0 && (
            <div className="space-y-2">
              <p className="label">Achievements</p>
              {unlocked.map((achievement) => (
                <motion.div key={achievement.id} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.07] p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent"><Sparkles size={17} /></div>
                  <div><p className="text-sm font-semibold text-text">{achievement.name}</p><p className="text-xs text-muted">{achievement.description}</p></div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <Button fullWidth className="mt-5" onClick={() => setShowCelebration(false)}>Continue</Button>
      </Modal>
    </div>
  )
}

export const NoActiveWorkout = ({ onStart }: { onStart: (routineId?: string) => void }) => (
  <EmptyState
    icon={Dumbbell}
    title="No workout in progress"
    description="Pick a routine below or start from scratch. Your sets, weight and rest timer will be ready instantly."
  />
)

export const RestIndicator = ({ seconds }: { seconds: number }) => (
  <div className="flex items-center gap-2 text-xs text-warning"><Clock3 size={14} /> {formatTimer(seconds)}</div>
)
