import { ChevronRight, Dumbbell, History, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { SetEntry, WorkoutSession } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { getExerciseFromCatalog, isTimedExercise, setDurationSec } from '../../lib/metrics'
import { formatDate, formatDuration, formatVolume, formatWeight, fromDisplayWeight, relativeDate, round, toDisplayWeight, uid } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog, EmptyState, Modal, SectionHeader } from '../../components/ui/Misc'

export const WorkoutHistory = ({ limit }: { limit?: number }) => {
  const sessions = useAppStore((state) => state.sessions)
  const allExercises = useAppStore((state) => state.exercises)
  const profile = useAppStore((state) => state.profile)
  const editSession = useAppStore((state) => state.editSession)
  const deleteSession = useAppStore((state) => state.deleteSession)
  const [selected, setSelected] = useState<WorkoutSession | null>(null)
  const [draft, setDraft] = useState<WorkoutSession | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editMinutes, setEditMinutes] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<WorkoutSession | null>(null)
  const completed = sessions.filter((session) => session.status === 'completed').slice(0, limit ?? sessions.length)

  const openEditor = (session: WorkoutSession) => {
    setSelected(null)
    setDraft({
      ...session,
      exercises: session.exercises.map((item) => ({ ...item, sets: item.sets.map((set) => ({ ...set })) })),
    })
    setEditDate(formatDate(session.date, 'yyyy-MM-dd'))
    setEditMinutes(Math.max(1, Math.round(session.durationSec / 60)))
  }

  const patchDraftSet = (workoutExerciseId: string, setId: string, patch: Partial<SetEntry>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item) =>
              item.id === workoutExerciseId
                ? { ...item, sets: item.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)) }
                : item,
            ),
          }
        : current,
    )
  }

  const addDraftSet = (workoutExerciseId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item) => {
              if (item.id !== workoutExerciseId) return item
              const last = item.sets[item.sets.length - 1]
              return {
                ...item,
                sets: [
                  ...item.sets,
                  {
                    id: uid('set'),
                    weight: last?.weight ?? 0,
                    reps: last?.reps ?? 10,
                    durationSec: last?.durationSec,
                    completed: true,
                    previous: last?.previous,
                  },
                ],
              }
            }),
          }
        : current,
    )
  }

  const removeDraftSet = (workoutExerciseId: string, setId: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item) =>
              item.id === workoutExerciseId ? { ...item, sets: item.sets.filter((set) => set.id !== setId) } : item,
            ),
          }
        : current,
    )
  }

  const saveEdit = () => {
    if (!draft) return
    const [year, month, day] = editDate.split('-').map(Number)
    const nextDate = new Date(draft.date)
    if (year && month && day) nextDate.setFullYear(year, month - 1, day)
    editSession(draft.id, {
      date: nextDate.toISOString(),
      durationSec: Math.max(1, editMinutes) * 60,
      notes: draft.notes ?? '',
      exercises: draft.exercises,
    })
    setDraft(null)
  }

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
                <p className="text-xs font-semibold text-accent">{formatVolume(session.volume, profile.unit)}</p>
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
              <div className="rounded-xl border border-border bg-bg/40 p-3"><p className="text-[10px] text-muted">Volume</p><p className="text-sm font-semibold text-text">{formatVolume(selected.volume, profile.unit)}</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><p className="text-[10px] text-muted">Reps</p><p className="text-sm font-semibold text-text">{selected.totalReps}</p></div>
              <div className="rounded-xl border border-border bg-bg/40 p-3"><p className="text-[10px] text-muted">Exercises</p><p className="text-sm font-semibold text-text">{selected.exercises.length}</p></div>
            </div>
            <div className="space-y-3">
              {selected.exercises.map((item, index) => {
                const exercise = getExerciseFromCatalog(item.exerciseId, allExercises)
                const timed = isTimedExercise(exercise)
                return (
                  <div key={item.id} className="rounded-2xl border border-border bg-bg/40 p-4">
                    <div className="flex items-center justify-between"><p className="text-sm font-semibold text-text">{index + 1}. {exercise?.name ?? 'Exercise'}</p><p className="text-[10px] text-muted">{exercise?.equipment}</p></div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.sets.map((set, setIndex) => (
                        <span key={set.id} className={`rounded-lg px-2 py-1 text-[10px] ${set.completed ? 'bg-accent/10 text-accent' : 'bg-white/5 text-muted'}`}>
                          {setIndex + 1}: {timed && setDurationSec(set, exercise) > 0
                            ? `${setDurationSec(set, exercise)}s`
                            : `${formatWeight(set.weight, profile.unit)} × ${set.reps}`}
                          {set.rpe ? ` · RPE ${set.rpe}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {selected.notes && <div className="rounded-xl border border-border bg-bg/40 p-4"><p className="label">Session notes</p><p className="text-sm text-muted">{selected.notes}</p></div>}
            {selected.prIds.length > 0 && <p className="text-xs text-accent">🏆 {selected.prIds.length} personal record{selected.prIds.length > 1 ? 's' : ''} set in this session</p>}
            <div className="flex gap-3 border-t border-border pt-4">
              <Button variant="secondary" fullWidth onClick={() => openEditor(selected)}><Pencil size={14} /> Edit session</Button>
              <Button variant="danger" fullWidth onClick={() => setPendingDelete(selected)}><Trash2 size={14} /> Delete</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!draft} onClose={() => setDraft(null)} title="Edit workout" subtitle="Correct sets, duration, date or notes. Records are recalculated automatically." size="lg">
        {draft && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Date</label>
                <input className="field" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input className="field" type="number" min="1" value={editMinutes} onChange={(event) => setEditMinutes(Number(event.target.value))} />
              </div>
            </div>

            <div className="space-y-3">
              {draft.exercises.map((item, index) => {
                const exercise = getExerciseFromCatalog(item.exerciseId, allExercises)
                const timed = isTimedExercise(exercise)
                return (
                  <div key={item.id} className="rounded-2xl border border-border bg-bg/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text">{index + 1}. {exercise?.name ?? 'Exercise'}</p>
                      <button className="rounded-lg p-1.5 text-muted hover:text-danger" onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((entry) => entry.id !== item.id) })} aria-label="Remove exercise"><X size={14} /></button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {item.sets.map((set, setIndex) => (
                        <div key={set.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] p-2">
                          <span className="w-6 text-center text-[11px] font-bold text-muted">{setIndex + 1}</span>
                          <label className="flex-1 text-[10px] text-muted">
                            Weight ({profile.unit})
                            <input
                              className="field mt-1 py-1.5 text-center text-xs"
                              type="number"
                              min="0"
                              step={profile.unit === 'kg' ? '2.5' : '5'}
                              value={round(toDisplayWeight(set.weight, profile.unit), 1)}
                              onChange={(event) => patchDraftSet(item.id, set.id, { weight: fromDisplayWeight(Number(event.target.value), profile.unit) })}
                            />
                          </label>
                          <label className="flex-1 text-[10px] text-muted">
                            {timed ? 'Seconds' : 'Reps'}
                            <input
                              className="field mt-1 py-1.5 text-center text-xs"
                              type="number"
                              min="1"
                              value={timed ? setDurationSec(set, exercise) : set.reps}
                              onChange={(event) =>
                                timed
                                  ? patchDraftSet(item.id, set.id, { durationSec: Math.max(1, Number(event.target.value)), reps: 1 })
                                  : patchDraftSet(item.id, set.id, { reps: Math.max(1, Number(event.target.value)) })
                              }
                            />
                          </label>
                          <label className="w-20 text-[10px] text-muted">
                            RPE
                            <select
                              className="field mt-1 py-1.5 text-center text-xs"
                              value={set.rpe ?? ''}
                              onChange={(event) => patchDraftSet(item.id, set.id, {
                                rpe: event.target.value ? Number(event.target.value) : undefined,
                              })}
                              aria-label={`RPE for set ${setIndex + 1}`}
                            >
                              <option value="">—</option>
                              {[6, 7, 8, 9, 10].map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <button className="mt-4 rounded-lg p-1.5 text-muted hover:text-danger" onClick={() => removeDraftSet(item.id, set.id)} aria-label="Delete set"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => addDraftSet(item.id)}><Plus size={13} /> Add set</Button>
                  </div>
                )
              })}
            </div>

            <div>
              <label className="label">Session notes</label>
              <textarea className="field min-h-20 resize-y" value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setDraft(null)}>Cancel</Button>
              <Button fullWidth onClick={saveEdit}>Save changes</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteSession(pendingDelete.id)
          setSelected(null)
        }}
        title="Delete workout?"
        description={`“${pendingDelete?.name ?? 'This workout'}” will be removed from your history. Personal records and analytics will be recalculated.`}
        confirmLabel="Delete workout"
      />
    </div>
  )
}
