import { motion } from 'framer-motion'
import { Filter, Heart, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Difficulty, Equipment, Exercise, ExerciseCategory, MuscleId } from '../../types'
import { categories, difficulties, equipments, muscleMap, muscles } from '../../data/exercises'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, Modal } from '../../components/ui/Misc'
import { ExerciseGlyph } from '../../components/visual/ExerciseGlyph'
import { ExerciseDetailModal } from './ExerciseDetailModal'
import { useToast } from '../../components/ui/Toast'

const difficultyColors: Record<Difficulty, string> = {
  Beginner: 'text-success',
  Intermediate: 'text-warning',
  Advanced: 'text-danger',
}

export const ExerciseLibrary = ({ onAddToWorkout, onAddToRoutine }: { onAddToWorkout?: (id: string) => void; onAddToRoutine?: (id: string) => void }) => {
  const { toast } = useToast()
  const allExercises = useAppStore((state) => state.exercises)
  const favorites = useAppStore((state) => state.favorites)
  const toggleFavorite = useAppStore((state) => state.toggleFavorite)
  const createExercise = useAppStore((state) => state.createExercise)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'All'>('All')
  const [muscle, setMuscle] = useState<MuscleId | 'All'>('All')
  const [equipment, setEquipment] = useState<Equipment | 'All'>('All')
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>('All')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [custom, setCustom] = useState({ name: '', category: 'Full Body' as ExerciseCategory, primary: 'chest' as MuscleId, equipment: 'Dumbbell' as Equipment, difficulty: 'Beginner' as Difficulty, sets: 3, reps: '10-12' })

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return allExercises.filter((exercise) => {
      if (needle && !`${exercise.name} ${exercise.category} ${exercise.equipment} ${exercise.primary.map((id) => muscleMap[id].name).join(' ')}`.toLowerCase().includes(needle)) return false
      if (category !== 'All' && exercise.category !== category) return false
      if (muscle !== 'All' && ![...exercise.primary, ...exercise.secondary].includes(muscle)) return false
      if (equipment !== 'All' && exercise.equipment !== equipment) return false
      if (difficulty !== 'All' && exercise.difficulty !== difficulty) return false
      if (favoritesOnly && !favorites.includes(exercise.id)) return false
      return true
    })
  }, [allExercises, query, category, muscle, equipment, difficulty, favoritesOnly, favorites])

  const activeFilters = [category !== 'All', muscle !== 'All', equipment !== 'All', difficulty !== 'All', favoritesOnly].filter(Boolean).length

  const resetFilters = () => {
    setCategory('All')
    setMuscle('All')
    setEquipment('All')
    setDifficulty('All')
    setFavoritesOnly(false)
    setQuery('')
  }

  const submitCustom = () => {
    if (!custom.name.trim()) return
    createExercise({
      name: custom.name.trim(),
      category: custom.category,
      primary: [custom.primary],
      secondary: [],
      equipment: custom.equipment,
      difficulty: custom.difficulty,
      instructions: ['Set up with proper form and a controlled range of motion.', 'Brace your core and perform the movement slowly.', 'Complete all prescribed sets with clean technique.'],
      formTips: ['Stop the set if your form breaks down.', 'Prioritize control over the amount of weight used.'],
      sets: custom.sets,
      reps: custom.reps,
      tags: ['custom'],
      illustration: custom.category.toLowerCase(),
    })
    setShowCustom(false)
    setCustom((current) => ({ ...current, name: '' }))
    toast('Exercise created', 'success', 'Your custom exercise is now in the library.')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{allExercises.length} exercises</p>
          <h2 className="text-display mt-1.5 text-2xl font-semibold text-text sm:text-3xl">Exercise library</h2>
          <p className="mt-1 text-sm text-muted">Find the right movement for every muscle and goal.</p>
        </div>
        <Button variant="secondary" onClick={() => setShowCustom(true)}><Plus size={16} /> Custom exercise</Button>
      </div>

      <Card padded={false} className="sticky top-[68px] z-20 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="field pl-9" placeholder="Search exercises, muscles, equipment…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Button variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters((value) => !value)}>
            <SlidersHorizontal size={15} /> Filters {activeFilters > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-[#11140f]">{activeFilters}</span>}
          </Button>
          <button
            onClick={() => setFavoritesOnly((value) => !value)}
            className={cn('flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition', favoritesOnly ? 'border-danger/40 bg-danger/10 text-danger' : 'border-border bg-card text-muted hover:text-text')}
          >
            <Heart size={15} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites
          </button>
        </div>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/70 px-3 pb-4 pt-3">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="label">Category</p><select className="field" value={category} onChange={(event) => setCategory(event.target.value as ExerciseCategory | 'All')}><option value="All">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><p className="label">Muscle</p><select className="field" value={muscle} onChange={(event) => setMuscle(event.target.value as MuscleId | 'All')}><option value="All">All muscles</option>{muscles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div><p className="label">Equipment</p><select className="field" value={equipment} onChange={(event) => setEquipment(event.target.value as Equipment | 'All')}><option value="All">All equipment</option>{equipments.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><p className="label">Difficulty</p><select className="field" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | 'All')}><option value="All">All levels</option>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] text-muted"><Filter size={12} className="mr-1 inline" /> {filtered.length} results</p>
              <button onClick={resetFilters} className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline"><X size={13} /> Clear filters</button>
            </div>
          </motion.div>
        )}
      </Card>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setCategory('All')} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition', category === 'All' ? 'border-accent bg-accent text-[#11140f]' : 'border-border bg-card text-muted hover:text-text')}>All</button>
        {categories.map((item) => (
          <button key={item} onClick={() => setCategory(item)} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition', category === item ? 'border-accent bg-accent text-[#11140f]' : 'border-border bg-card text-muted hover:text-text')}>{item}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Search} title="No exercises found" description="Try a different search or clear your filters." action="Clear filters" onAction={resetFilters} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((exercise, index) => (
            <motion.div key={exercise.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.015, 0.3) }}>
              <Card interactive padded={false} className="group overflow-hidden" onClick={() => setSelected(exercise)}>
                <div className="relative">
                  <ExerciseGlyph exercise={exercise} className="h-32 w-full rounded-none border-0 border-b border-border" />
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleFavorite(exercise.id)
                    }}
                    className="absolute right-2 top-2 rounded-lg bg-bg/70 p-1.5 text-muted backdrop-blur transition hover:text-danger"
                    aria-label="Toggle favorite"
                  >
                    <Heart size={15} fill={favorites.includes(exercise.id) ? 'currentColor' : 'none'} className={favorites.includes(exercise.id) ? 'text-danger' : ''} />
                  </button>
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-semibold text-text transition group-hover:text-accent">{exercise.name}</h3>
                    <span className={cn('shrink-0 text-[10px] font-bold', difficultyColors[exercise.difficulty])}>{exercise.difficulty[0]}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{exercise.category} · {exercise.equipment}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {exercise.primary.slice(0, 2).map((id) => <span key={id} className="rounded-md bg-bg/70 px-1.5 py-0.5 text-[10px] text-muted">{muscleMap[id].name}</span>)}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
                    <span className="text-[10px] text-muted">{exercise.sets} × {exercise.reps}</span>
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        if (onAddToWorkout) onAddToWorkout(exercise.id)
                        else setSelected(exercise)
                      }}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-accent/10 hover:text-accent"
                      aria-label="Add exercise"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ExerciseDetailModal exercise={selected} open={!!selected} onClose={() => setSelected(null)} onAddToWorkout={onAddToWorkout} onAddToRoutine={onAddToRoutine} />

      <Modal open={showCustom} onClose={() => setShowCustom(false)} title="Create custom exercise" subtitle="Extend the library with your own movement." size="md">
        <div className="space-y-4">
          <div><label className="label">Exercise name</label><input className="field" placeholder="e.g. Single-arm cable row" value={custom.name} onChange={(event) => setCustom({ ...custom, name: event.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Category</label><select className="field" value={custom.category} onChange={(event) => setCustom({ ...custom, category: event.target.value as ExerciseCategory })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label className="label">Primary muscle</label><select className="field" value={custom.primary} onChange={(event) => setCustom({ ...custom, primary: event.target.value as MuscleId })}>{muscles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div><label className="label">Equipment</label><select className="field" value={custom.equipment} onChange={(event) => setCustom({ ...custom, equipment: event.target.value as Equipment })}>{equipments.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label className="label">Difficulty</label><select className="field" value={custom.difficulty} onChange={(event) => setCustom({ ...custom, difficulty: event.target.value as Difficulty })}>{difficulties.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label className="label">Sets</label><input className="field" type="number" min="1" value={custom.sets} onChange={(event) => setCustom({ ...custom, sets: Number(event.target.value) })} /></div>
            <div><label className="label">Reps</label><input className="field" value={custom.reps} onChange={(event) => setCustom({ ...custom, reps: event.target.value })} /></div>
          </div>
          <Button fullWidth onClick={submitCustom} disabled={!custom.name.trim()}><Plus size={16} /> Add to library</Button>
        </div>
      </Modal>
    </div>
  )
}
