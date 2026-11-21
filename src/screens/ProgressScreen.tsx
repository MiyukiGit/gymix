import { motion } from 'framer-motion'
import { Activity, Award, BarChart3, CalendarDays, Clock3, Dumbbell, Flame, Target, TrendingUp, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getExerciseProgression, getMuscleAggregates, getPRList, getStats, getTrend, getVolumesByCategory } from '../lib/stats'
import { cn, formatCompact, formatDate, formatDuration } from '../lib/utils'
import { Card, SectionHeader } from '../components/ui/Card'
import { EmptyState, ProgressBar, SegmentedControl, StatTile } from '../components/ui/Misc'
import { MuscleDonut, MuscleRadar, ProgressionChart, VolumeAreaChart } from '../components/charts/Charts'

type Range = '7' | '30' | '90' | '365' | 'all'
const rangeDays: Record<Range, number> = { '7': 7, '30': 30, '90': 90, '365': 365, all: 3650 }

export const ProgressScreen = () => {
  const sessions = useAppStore((state) => state.sessions)
  const profile = useAppStore((state) => state.profile)
  const exercises = useAppStore((state) => state.exercises)
  const [range, setRange] = useState<Range>('90')
  const [metric, setMetric] = useState<'weight' | 'e1rm' | 'volume'>('e1rm')
  const days = rangeDays[range]

  const stats = useMemo(() => getStats(sessions, profile, days), [sessions, profile, days])
  const trend = useMemo(() => getTrend(sessions, days), [sessions, days])
  const muscles = useMemo(() => getMuscleAggregates(sessions, days), [sessions, days])
  const categories = useMemo(() => getVolumesByCategory(sessions, days), [sessions, days])
  const prs = useMemo(() => getPRList(sessions, profile.unit), [sessions, profile.unit])

  const trackedIds = useMemo(() => {
    const counts = new Map<string, number>()
    sessions.filter((session) => session.status === 'completed').forEach((session) => session.exercises.forEach((item) => counts.set(item.exerciseId, (counts.get(item.exerciseId) ?? 0) + 1)))
    return Array.from(counts.entries()).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([id]) => id)
  }, [sessions])
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const activeExerciseId = selectedExercise && trackedIds.includes(selectedExercise) ? selectedExercise : trackedIds[0]
  const progression = useMemo(() => (activeExerciseId ? getExerciseProgression(sessions, activeExerciseId) : []), [sessions, activeExerciseId])
  const activeExercise = exercises.find((exercise) => exercise.id === activeExerciseId)
  const firstPoint = progression[0]
  const lastPoint = progression[progression.length - 1]
  const improvement = firstPoint && lastPoint && firstPoint.e1rm > 0 ? ((lastPoint.e1rm - firstPoint.e1rm) / firstPoint.e1rm) * 100 : 0

  const topMuscles = muscles.slice(0, 5)
  const leastMuscles = [...muscles].filter((item) => item.volume > 0).sort((a, b) => a.volume - b.volume).slice(0, 3)
  const featuredPRs = prs.filter((pr) => pr.type === 'weight' || pr.type === 'e1rm').slice(0, 8)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Analytics</p>
          <h1 className="text-display mt-1.5 text-3xl font-semibold text-text sm:text-4xl">Progress</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Every lift, every rep and every trend — backed by your logged workouts.</p>
        </div>
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={[{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: '365', label: '1y' }, { value: 'all', label: 'All' }]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={Dumbbell} label="Workouts" value={String(stats.totalWorkouts)} hint="In selected range" accent />
        <StatTile icon={TrendingUp} label="Volume" value={formatCompact(stats.totalVolume)} suffix={profile.unit} hint="Total load moved" />
        <StatTile icon={Activity} label="Total reps" value={formatCompact(stats.totalReps)} hint="All completed sets" />
        <StatTile icon={Clock3} label="Avg duration" value={formatDuration(stats.avgDuration)} hint="Per session" />
        <StatTile icon={CalendarDays} label="Per week" value={String(stats.weeklyFrequency)} suffix="sessions" hint="Last 7 days" />
        <StatTile icon={Trophy} label="PRs" value={String(prs.length)} hint="Tracked records" accent />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader title="Training volume" subtitle="Total kg moved over time" action={<span className="chip"><Flame size={12} className="text-warning" /> {stats.totalWorkouts} sessions</span>} />
          {trend.length && trend.some((item) => item.volume > 0) ? <VolumeAreaChart data={trend} unit={profile.unit} /> : <EmptyState compact icon={BarChart3} title="No data in this range" description="Try a longer time range or log a workout." />}
        </Card>
        <Card>
          <SectionHeader title="Muscle distribution" subtitle="Volume by muscle group" />
          <MuscleDonut data={muscles.map((item) => ({ name: item.name, volume: item.volume }))} />
          <div className="mt-2 space-y-2">
            {topMuscles.slice(0, 4).map((item) => (
              <div key={item.muscle} className="flex items-center justify-between text-[11px]">
                <span className="text-muted">{item.name}</span>
                <span className="font-semibold text-text">{Math.round((item.volume / Math.max(1, muscles.reduce((sum, m) => sum + m.volume, 0))) * 100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Exercise progression"
            subtitle="See how a specific lift is trending"
            action={<SegmentedControl size="sm" value={metric} onChange={setMetric} options={[{ value: 'weight', label: 'Weight' }, { value: 'e1rm', label: '1RM' }, { value: 'volume', label: 'Volume' }]} />}
          />
          {trackedIds.length === 0 ? (
            <EmptyState compact icon={TrendingUp} title="Not enough data yet" description="Log the same exercise at least twice to see progression." />
          ) : (
            <>
              <select className="field mb-4 max-w-xs" value={activeExerciseId ?? ''} onChange={(event) => setSelectedExercise(event.target.value)}>
                {trackedIds.map((id) => <option key={id} value={id}>{exercises.find((exercise) => exercise.id === id)?.name ?? id}</option>)}
              </select>
              <ProgressionChart data={progression} unit={profile.unit} metric={metric} />
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
                <div><p className="text-[10px] text-muted">Sessions</p><p className="text-sm font-semibold text-text">{progression.length}</p></div>
                <div><p className="text-[10px] text-muted">Latest top set</p><p className="text-sm font-semibold text-text">{lastPoint ? `${lastPoint.weight} ${profile.unit}` : '—'}</p></div>
                <div><p className="text-[10px] text-muted">Est. 1RM</p><p className="text-sm font-semibold text-text">{lastPoint ? `${lastPoint.e1rm} ${profile.unit}` : '—'}</p></div>
                <div><p className="text-[10px] text-muted">Change</p><p className={cn('text-sm font-semibold', improvement >= 0 ? 'text-success' : 'text-danger')}>{improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}%</p></div>
              </div>
              {activeExercise && <p className="mt-3 text-[11px] text-muted">{activeExercise.primary.map((id) => muscleMapName(id)).join(' · ')} · {activeExercise.equipment}</p>}
            </>
          )}
        </Card>
        <Card>
          <SectionHeader title="Muscle balance" subtitle="Where your volume is going" />
          <MuscleRadar data={muscles.map((item) => ({ name: item.name, volume: item.volume }))} />
          <div className="mt-2 space-y-3 border-t border-border/60 pt-4">
            <div><p className="label">Most trained</p><p className="text-sm font-semibold text-accent">{topMuscles[0]?.name ?? '—'}</p></div>
            <div><p className="label">Needs attention</p><div className="flex flex-wrap gap-1.5">{leastMuscles.map((item) => <span key={item.muscle} className="rounded-md bg-warning/10 px-2 py-1 text-[11px] text-warning">{item.name}</span>)}</div></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Volume by category" subtitle="How your training is split" />
          {categories.length === 0 ? <p className="py-8 text-center text-sm text-muted">No category data yet.</p> : (
            <div className="space-y-3">
              {categories.map((item, index) => (
                <div key={item.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-muted">{item.name}</span><span className="font-semibold text-text">{formatCompact(item.volume)} {profile.unit}</span></div>
                  <ProgressBar value={(item.volume / categories[0].volume) * 100} color={['#c6f36a', '#8edb78', '#f4b860', '#92978f'][index % 4]} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <SectionHeader title="Personal records" subtitle="Your strongest moments" action={<Award size={18} className="text-accent" />} />
          {featuredPRs.length === 0 ? <EmptyState compact icon={Target} title="No PRs yet" description="Complete a workout to start setting records." /> : (
            <div className="space-y-2">
              {featuredPRs.map((pr) => (
                <div key={pr.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-bg/40 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning"><Trophy size={15} /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text">{pr.exerciseName}</p><p className="text-[10px] text-muted">{pr.type === 'e1rm' ? 'Estimated 1RM' : 'Heaviest set'} · {formatDate(pr.date, 'MMM d, yyyy')}</p></div>
                  <p className="text-xs font-bold text-accent">{pr.displayValue}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  )
}

const muscleMapName = (id: string) => {
  const names: Record<string, string> = {
    chest: 'Chest', front_delts: 'Front delts', side_delts: 'Side delts', rear_delts: 'Rear delts', traps: 'Traps', upper_back: 'Upper back', lats: 'Lats', lower_back: 'Lower back', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', adductors: 'Adductors', abductors: 'Abductors', upper_abs: 'Upper abs', lower_abs: 'Lower abs', obliques: 'Obliques',
  }
  return names[id] ?? id
}
