import { Heart, Info, Plus, Sparkles } from 'lucide-react'
import type { Exercise } from '../../types'
import { muscleMap } from '../../data/exercises'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ExerciseGlyph } from '../../components/visual/ExerciseGlyph'
import { useToast } from '../../components/ui/Toast'

const difficultyColors = {
  Beginner: 'text-success border-success/30 bg-success/10',
  Intermediate: 'text-warning border-warning/30 bg-warning/10',
  Advanced: 'text-danger border-danger/30 bg-danger/10',
}

export const ExerciseDetailModal = ({
  exercise,
  open,
  onClose,
  onAddToWorkout,
  onAddToRoutine,
}: {
  exercise: Exercise | null
  open: boolean
  onClose: () => void
  onAddToWorkout?: (id: string) => void
  onAddToRoutine?: (id: string) => void
}) => {
  const { toast } = useToast()
  const favorites = useAppStore((state) => state.favorites)
  const toggleFavorite = useAppStore((state) => state.toggleFavorite)
  const activeSessionId = useAppStore((state) => state.activeSessionId)
  if (!exercise) return null
  const isFavorite = favorites.includes(exercise.id)

  return (
    <Modal open={open} onClose={onClose} title={exercise.name} subtitle={`${exercise.category} · ${exercise.equipment}`} size="lg">
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="space-y-4">
          <ExerciseGlyph exercise={exercise} className="h-40 w-full" />
          <div className="flex flex-wrap gap-2">
            <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', difficultyColors[exercise.difficulty])}>{exercise.difficulty}</span>
            <span className="chip">{exercise.sets} sets × {exercise.reps}</span>
          </div>
          <div>
            <p className="label">Primary muscles</p>
            <div className="flex flex-wrap gap-1.5">
              {exercise.primary.map((id) => <span key={id} className="rounded-lg bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">{muscleMap[id].name}</span>)}
            </div>
          </div>
          {exercise.secondary.length > 0 && (
            <div>
              <p className="label">Secondary muscles</p>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondary.map((id) => <span key={id} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-muted">{muscleMap[id].name}</span>)}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                toggleFavorite(exercise.id)
                toast(isFavorite ? 'Removed from favorites' : 'Added to favorites', 'success', exercise.name)
              }}
            >
              <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'text-danger' : ''} />
              {isFavorite ? 'Favorited' : 'Favorite'}
            </Button>
            {onAddToWorkout && (
              <Button
                size="sm"
                disabled={!activeSessionId}
                onClick={() => {
                  onAddToWorkout(exercise.id)
                  toast('Exercise added', 'success', `${exercise.name} added to your workout.`)
                  onClose()
                }}
              >
                <Plus size={14} /> Add to workout
              </Button>
            )}
            {onAddToRoutine && (
              <Button variant="outline" size="sm" onClick={() => onAddToRoutine(exercise.id)}>
                <Plus size={14} /> Add to routine
              </Button>
            )}
          </div>
          {!activeSessionId && onAddToWorkout && <p className="mt-2 text-[11px] text-warning">Start a workout first to add exercises directly.</p>}

          <div className="mt-6">
            <p className="label flex items-center gap-1.5"><Info size={13} /> How to perform</p>
            <ol className="space-y-2.5">
              {exercise.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed text-muted">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">{index + 1}</span>
                  {instruction}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 rounded-2xl border border-warning/20 bg-warning/[0.05] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-warning"><Sparkles size={14} /> Form tips</p>
            <ul className="mt-2 space-y-1.5">
              {exercise.formTips.map((tip, index) => (
                <li key={index} className="text-xs leading-relaxed text-muted">• {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  )
}
