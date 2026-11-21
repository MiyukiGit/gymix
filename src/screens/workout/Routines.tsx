import { motion } from 'framer-motion'
import { Copy, Dumbbell, Layers3, Pencil, Play, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Routine, RoutineExercise } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../../components/ui/Button'
import { Card, SectionHeader } from '../../components/ui/Card'
import { ConfirmDialog, EmptyState, Modal, SegmentedControl } from '../../components/ui/Misc'
import { useToast } from '../../components/ui/Toast'

const emptyDraft = (): Omit<Routine, 'id' | 'isCustom'> => ({
  name: '',
  type: 'Custom',
  description: '',
  exercises: [],
  accent: '#c6f36a',
})

export const Routines = ({ onStart, onBrowse }: { onStart: (routineId?: string) => void; onBrowse?: () => void }) => {
  const { toast } = useToast()
  const routines = useAppStore((state) => state.routines)
  const exercises = useAppStore((state) => state.exercises)
  const createRoutine = useAppStore((state) => state.createRoutine)
  const updateRoutine = useAppStore((state) => state.updateRoutine)
  const deleteRoutine = useAppStore((state) => state.deleteRoutine)
  const [filter, setFilter] = useState<'all' | 'built-in' | 'custom'>('all')
  const [draft, setDraft] = useState<Omit<Routine, 'id' | 'isCustom'> | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const visible = routines.filter((routine) => (filter === 'all' ? true : filter === 'custom' ? !!routine.isCustom : !routine.isCustom))

  const pickerResults = useMemo(() => {
    const needle = pickerQuery.toLowerCase()
    return exercises.filter((exercise) => !needle || exercise.name.toLowerCase().includes(needle)).slice(0, 60)
  }, [exercises, pickerQuery])

  const openNew = () => {
    setEditingId(null)
    setDraft(emptyDraft())
  }

  const openEdit = (routine: Routine) => {
    setEditingId(routine.id)
    setDraft({ name: routine.name, type: routine.type, description: routine.description, exercises: [...routine.exercises], accent: routine.accent })
  }

  const duplicate = (routine: Routine) => {
    setEditingId(null)
    setDraft({ name: `${routine.name} Copy`, type: routine.type, description: routine.description, exercises: [...routine.exercises], accent: routine.accent })
  }

  const addToDraft = (exerciseId: string) => {
    if (!draft) return
    const exercise = exercises.find((item) => item.id === exerciseId)
    if (!exercise) return
    const prescription: RoutineExercise = { exerciseId, sets: exercise.sets, reps: exercise.reps, restSec: 90 }
    setDraft({ ...draft, exercises: [...draft.exercises, prescription] })
    setPickerOpen(false)
    setPickerQuery('')
  }

  const saveDraft = () => {
    if (!draft || !draft.name.trim() || draft.exercises.length === 0) return
    if (editingId) {
      updateRoutine({ ...draft, id: editingId, isCustom: true })
      toast('Routine updated', 'success', draft.name)
    } else {
      createRoutine(draft)
      toast('Routine created', 'success', `${draft.name} is ready to use.`)
    }
    setDraft(null)
    setEditingId(null)
  }

  const updatePrescription = (index: number, patch: Partial<RoutineExercise>) => {
    if (!draft) return
    setDraft({ ...draft, exercises: draft.exercises.map((item, i) => (i === index ? { ...item, ...patch } : item)) })
  }

  const movePrescription = (index: number, direction: -1 | 1) => {
    if (!draft) return
    const next = [...draft.exercises]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraft({ ...draft, exercises: next })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Routines</p>
          <h2 className="text-display mt-1.5 text-2xl font-semibold text-text sm:text-3xl">Training templates</h2>
          <p className="mt-1 text-sm text-muted">Start a proven split or build your own.</p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, { value: 'built-in', label: 'Built-in' }, { value: 'custom', label: 'Custom' }]}
          />
          <Button onClick={openNew}><Plus size={16} /> New routine</Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={Layers3} title="No custom routines yet" description="Build a routine from your favorite exercises and reuse it every session." action="Create routine" onAction={openNew} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((routine, index) => (
            <motion.div key={routine.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}>
              <Card padded={false} className="h-full overflow-hidden">
                <div className="h-1" style={{ background: routine.accent ?? '#c6f36a' }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-display text-lg font-semibold text-text">{routine.name}</h3>
                        {routine.isCustom && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">Custom</span>}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{routine.type}</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card-2 text-accent"><Dumbbell size={17} /></div>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted">{routine.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {routine.exercises.slice(0, 4).map((item, i) => {
                      const exercise = exercises.find((entry) => entry.id === item.exerciseId)
                      return <span key={`${item.exerciseId}-${i}`} className="max-w-32 truncate rounded-md bg-bg/60 px-2 py-1 text-[10px] text-muted">{exercise?.name ?? 'Exercise'}</span>
                    })}
                    {routine.exercises.length > 4 && <span className="rounded-md bg-bg/60 px-2 py-1 text-[10px] text-muted">+{routine.exercises.length - 4}</span>}
                  </div>
                  <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-3">
                    <Button size="sm" fullWidth onClick={() => onStart(routine.id)} disabled={routine.exercises.length === 0}><Play size={13} fill="currentColor" /> Start</Button>
                    <button className="rounded-lg border border-border p-2 text-muted transition hover:border-accent/40 hover:text-accent" onClick={() => openEdit(routine)} aria-label="Edit routine" disabled={!routine.isCustom}><Pencil size={14} /></button>
                    <button className="rounded-lg border border-border p-2 text-muted transition hover:border-accent/40 hover:text-accent" onClick={() => duplicate(routine)} aria-label="Duplicate routine"><Copy size={14} /></button>
                    {routine.isCustom && <button className="rounded-lg border border-border p-2 text-muted transition hover:border-danger/40 hover:text-danger" onClick={() => setDeleteId(routine.id)} aria-label="Delete routine"><Trash2 size={14} /></button>}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={editingId ? 'Edit routine' : 'Create routine'} subtitle="Add exercises and set your prescription." size="xl">
        {draft && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Routine name</label><input className="field" value={draft.name} placeholder="e.g. Push Day" onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
              <div><label className="label">Type</label><input className="field" value={draft.type} placeholder="Push, Pull, Legs…" onChange={(event) => setDraft({ ...draft, type: event.target.value })} /></div>
            </div>
            <div><label className="label">Description</label><input className="field" value={draft.description} placeholder="What does this session focus on?" onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="label mb-0">Exercises ({draft.exercises.length})</p>
                <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}><Plus size={14} /> Add exercise</Button>
              </div>
              {draft.exercises.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted">Add at least one exercise to save this routine.</div>
              ) : (
                <div className="space-y-2">
                  {draft.exercises.map((item, index) => {
                    const exercise = exercises.find((entry) => entry.id === item.exerciseId)
                    return (
                      <div key={`${item.exerciseId}-${index}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg/40 p-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">{index + 1}</span>
                        <span className="min-w-32 flex-1 truncate text-xs font-semibold text-text">{exercise?.name ?? 'Exercise'}</span>
                        <label className="flex items-center gap-1 text-[10px] text-muted">Sets<input className="w-14 rounded-lg border border-border bg-bg px-2 py-1 text-center text-xs text-text" type="number" min="1" value={item.sets} onChange={(event) => updatePrescription(index, { sets: Number(event.target.value) })} /></label>
                        <label className="flex items-center gap-1 text-[10px] text-muted">Reps<input className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-center text-xs text-text" value={item.reps} onChange={(event) => updatePrescription(index, { reps: event.target.value })} /></label>
                        <label className="flex items-center gap-1 text-[10px] text-muted">Rest<input className="w-16 rounded-lg border border-border bg-bg px-2 py-1 text-center text-xs text-text" type="number" min="0" value={item.restSec} onChange={(event) => updatePrescription(index, { restSec: Number(event.target.value) })} /></label>
                        <button className="rounded-lg p-1.5 text-muted hover:text-text disabled:opacity-30" onClick={() => movePrescription(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                        <button className="rounded-lg p-1.5 text-muted hover:text-text disabled:opacity-30" onClick={() => movePrescription(index, 1)} disabled={index === draft.exercises.length - 1} aria-label="Move down">↓</button>
                        <button className="rounded-lg p-1.5 text-muted hover:text-danger" onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((_, i) => i !== index) })} aria-label="Remove"><X size={14} /></button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-border/60 pt-4">
              <Button variant="secondary" fullWidth onClick={() => setDraft(null)}>Cancel</Button>
              <Button fullWidth onClick={saveDraft} disabled={!draft.name.trim() || draft.exercises.length === 0}>Save routine</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add exercises" subtitle="Search the library and tap to add." size="lg">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-9" placeholder="Search exercises…" value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} autoFocus />
        </div>
        <div className="grid max-h-96 gap-1.5 overflow-y-auto sm:grid-cols-2">
          {pickerResults.map((exercise) => (
            <button key={exercise.id} onClick={() => addToDraft(exercise.id)} className="flex items-center justify-between rounded-xl border border-border bg-bg/40 px-3 py-2.5 text-left transition hover:border-accent/40">
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text">{exercise.name}</span><span className="text-[10px] text-muted">{exercise.category} · {exercise.equipment}</span></span>
              <Plus size={14} className="text-accent" />
            </button>
          ))}
        </div>
        {onBrowse && <Button variant="ghost" fullWidth className="mt-4" onClick={() => { setPickerOpen(false); onBrowse() }}>Browse full library</Button>}
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { deleteRoutine(deleteId); toast('Routine deleted', 'info') } }} title="Delete routine?" description="This routine will be removed from your library. Workouts already completed with it are kept." confirmLabel="Delete" />
    </div>
  )
}
