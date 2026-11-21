import { ChevronRight, Dumbbell, History } from 'lucide-react'
import { useState } from 'react'
import type { WorkoutSession } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { formatCompact, formatDate, formatDuration, formatWeight, relativeDate } from '../../lib/utils'
import { Card } from '../../components/ui/Card'
import { EmptyState, Modal, SectionHeader } from '../../components/ui/Misc'

export const WorkoutHistory = ({ limit }: { limit?: number }) => {
  const sessions = useAppStore((state) => state.sessions)
  const allExercises = useAppStore((state) => state.exercises)
  const profile = useAppStore((state) => state.profile)
  const [selected, setSelected] = useState<WorkoutSession | null>(null)
  const completed = sessions.filter((session) => session.status === 'completed').slice(0, limit ?? sessions.length)

  return (
    <div className="space-y-5">
      <SectionHeader title="Workout history" subtitle="Every session you’ve completed, in one place." />
      {completed.length === 0 ? (
        <Card><EmptyState icon={History} title="No completed workouts yet" description="Finish your first session and it will show up here with every set and rep." /></Card>
      ) : (
        <div className="space-y-2">
          {completed.map((session) => (
            <button
              key={session.id}
              onClick={() => setSelected(session)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card/70 p-3.5 text-left transition hover:border-accent/30 hover:bg-card"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><Dumbbell size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{session.name}</p>
                <p className="text-[11px] text-muted">{formatDate(session.date)} · {relativeDate(session.date)}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-text">{session.exercises.length} exercises</p>
                <p className="text-[10px] text-muted">{session.totalReps} reps</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-accent">{formatCompact(session.volume)} {profile.unit}</p>
                <p className="text-[10px] text-muted">{formatDuration(session.durationSec)}</p>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </button>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} subtitle={selected ? formatDate(selected.date, 'EEEE, MMM d, yyyy') : ''} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-bg/40 p-3"><p className="text-[10px] text-muted">Duration</p><p className="text-sm font-semibold text-text">{formatDuration(selected.durationSec)}</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><p className="text-[10px] text-muted">Volume</p><p className="text-sm font-semibold text-text">{formatCompact(selected.volume)} {profile.unit}</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><p className="text-[10px] text-muted">Reps</p><p className="text-sm font-semibold text-text">{selected.totalReps}</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><p className="text-[10px] text-muted">Exercises</p><p className="text-sm font-semibold text-text">{selected.exercises.length}</p></div>
            </div>
            <div className="space-y-3">
              {selected.exercises.map((item, index) => {
                const exercise = allExercises.find((entry) => entry.id === item.exerciseId)
                return (
                  <div key={item.id} className="rounded-2xl border border-border bg-bg/40 p-4">
                    <div className="flex items-center justify-between"><p className="text-sm font-semibold text-text">{index + 1}. {exercise?.name ?? 'Exercise'}</p><p className="text-[10px] text-muted">{exercise?.equipment}</p></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.sets.map((set, setIndex) => (
                        <span key={set.id} className={`rounded-lg px-2 py-1 text-[10px] ${set.completed ? 'bg-accent/10 text-accent' : 'bg-white/5 text-muted'}`}>
                          {setIndex + 1}: {formatWeight(set.weight, profile.unit)} × {set.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {selected.notes && <div className="rounded-xl border border-border bg-bg/40 p-4"><p className="label">Session notes</p><p className="text-sm text-muted">{selected.notes}</p></div>}
            {selected.prIds.length > 0 && <p className="text-xs text-accent">🏆 {selected.prIds.length} personal record{selected.prIds.length > 1 ? 's' : ''} set in this session</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
