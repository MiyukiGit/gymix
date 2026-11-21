import { addDays, format, parseISO, subDays } from 'date-fns'
import { exercises as builtInExercises, muscleMap } from '../data/exercises'
import type { Exercise, MuscleId, PersonalRecord, UserProfile, WorkoutSession } from '../types'
import {
  effectiveLoadKg,
  effectiveVolumeKg,
  getExerciseFromCatalog,
  sessionActiveSec,
  sessionReps,
  sessionVolume,
  setDurationSec,
} from './metrics'
import { getStreakInfo } from './streaks'
import { dateKey, formatTimer, formatVolume, formatWeight, round } from './utils'

export const completedSessions = (sessions: WorkoutSession[]) => sessions.filter((session) => session.status === 'completed')

const byDateAsc = (a: WorkoutSession, b: WorkoutSession) => parseISO(a.date).getTime() - parseISO(b.date).getTime()

export const getRangeSessions = (sessions: WorkoutSession[], days: number) => {
  if (days >= 3650) return completedSessions(sessions)
  const cutoff = subDays(new Date(), days).getTime()
  return completedSessions(sessions).filter((session) => parseISO(session.date).getTime() >= cutoff)
}

/** Kept as a convenience wrapper; all volume is canonical kg-equivalents. */
export const setVolume = (
  session: WorkoutSession,
  profile: UserProfile,
  catalog: Exercise[] = builtInExercises,
) => sessionVolume(session, catalog, profile)

export const estimate1RM = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30))

export interface Stats {
  totalWorkouts: number
  totalVolume: number
  totalReps: number
  totalTime: number
  avgDuration: number
  weeklyFrequency: number
  monthlyFrequency: number
  currentStreak: number
  longestStreak: number
  activeDays: number
  consistency: number
  scheduledDays: number
  completedScheduledDays: number
  missedScheduledDays: number
  totalExercisesLogged: number
  uniqueExercises: number
}

export const getStats = (
  sessions: WorkoutSession[],
  profile: UserProfile,
  days = 3650,
  catalog: Exercise[] = builtInExercises,
): Stats => {
  const scoped = getRangeSessions(sessions, days)
  const streak = getStreakInfo(sessions, profile)
  const totalReps = scoped.reduce((sum, session) => sum + sessionReps(session, catalog), 0)
  const totalTime = scoped.reduce((sum, session) => sum + session.durationSec, 0)
  const uniqueExercises = new Set(scoped.flatMap((session) => session.exercises.map((item) => item.exerciseId)))
  const weekly = getRangeSessions(sessions, 7).length
  const monthly = getRangeSessions(sessions, 30).length

  return {
    totalWorkouts: scoped.length,
    totalVolume: scoped.reduce((sum, session) => sum + sessionVolume(session, catalog, profile), 0),
    totalReps,
    totalTime,
    avgDuration: scoped.length ? totalTime / scoped.length : 0,
    weeklyFrequency: weekly,
    monthlyFrequency: monthly,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    activeDays: streak.activeDays,
    consistency: streak.consistency,
    scheduledDays: streak.scheduledDays,
    completedScheduledDays: streak.completedScheduledDays,
    missedScheduledDays: streak.missedScheduledDays,
    totalExercisesLogged: scoped.reduce((sum, session) => sum + session.exercises.length, 0),
    uniqueExercises: uniqueExercises.size,
  }
}

export const getWeeklyActivity = (
  sessions: WorkoutSession[],
  profile: UserProfile,
  catalog: Exercise[],
  days = 7,
) => {
  const completed = completedSessions(sessions)
  return Array.from({ length: days }, (_, index) => {
    const date = subDays(new Date(), days - 1 - index)
    const key = dateKey(date)
    const daySessions = completed.filter((session) => dateKey(session.date) === key)
    return {
      key,
      label: format(date, days === 7 ? 'EEE' : 'MMM d'),
      fullLabel: format(date, 'EEEE, MMM d'),
      workouts: daySessions.length,
      volume: daySessions.reduce((sum, session) => sum + sessionVolume(session, catalog, profile), 0),
      duration: daySessions.reduce((sum, session) => sum + session.durationSec, 0),
      active: daySessions.length > 0,
    }
  })
}

const bucketDate = (date: Date, days: number) => {
  if (days <= 14) return format(date, 'MMM d')
  if (days <= 120) return `W${format(date, 'yyyy')}-${format(date, 'w')}`
  return format(date, 'MMM yy')
}

export const getTrend = (
  sessions: WorkoutSession[],
  profile: UserProfile,
  catalog: Exercise[],
  days: number,
) => {
  const scoped = getRangeSessions(sessions, days)
  const buckets = new Map<string, { label: string; volume: number; workouts: number; reps: number; date: number }>()

  if (days <= 14) {
    Array.from({ length: days }, (_, index) => subDays(new Date(), days - 1 - index)).forEach((date) => {
      const label = bucketDate(date, days)
      if (!buckets.has(label)) buckets.set(label, { label, volume: 0, workouts: 0, reps: 0, date: date.getTime() })
    })
  } else {
    const start = subDays(new Date(), days)
    const first = scoped.length ? parseISO([...scoped].sort(byDateAsc)[0].date) : new Date()
    const cursor = first < start ? start : first
    let pointer = cursor
    while (pointer <= new Date()) {
      const label = bucketDate(pointer, days)
      if (!buckets.has(label)) buckets.set(label, { label, volume: 0, workouts: 0, reps: 0, date: pointer.getTime() })
      pointer = addDays(pointer, 7)
    }
  }

  scoped.forEach((session) => {
    const label = bucketDate(parseISO(session.date), days)
    const bucket = buckets.get(label) ?? { label, volume: 0, workouts: 0, reps: 0, date: parseISO(session.date).getTime() }
    bucket.volume += sessionVolume(session, catalog, profile)
    bucket.workouts += 1
    bucket.reps += sessionReps(session, catalog)
    buckets.set(label, bucket)
  })

  return Array.from(buckets.values()).sort((a, b) => a.date - b.date)
}

export interface MuscleAggregate {
  muscle: MuscleId
  name: string
  volume: number
  workouts: number
  primarySessions: number
  lastTrained: string | null
  exercises: Set<string>
  level: number
}

export const getMuscleAggregates = (
  sessions: WorkoutSession[],
  profile: UserProfile,
  catalog: Exercise[],
  days = 90,
): MuscleAggregate[] => {
  const scoped = getRangeSessions(sessions, days)
  const result = new Map<MuscleId, MuscleAggregate>()

  Object.values(muscleMap).forEach((muscle) => {
    result.set(muscle.id, {
      muscle: muscle.id,
      name: muscle.name,
      volume: 0,
      workouts: 0,
      primarySessions: 0,
      lastTrained: null,
      exercises: new Set(),
      level: 0,
    })
  })

  scoped.forEach((session) => {
    const touched = new Set<MuscleId>()
    session.exercises.forEach((item) => {
      const exercise = getExerciseFromCatalog(item.exerciseId, catalog)
      if (!exercise) return
      const volume = item.sets.reduce(
        (sum, set) => sum + effectiveVolumeKg(set, exercise, profile),
        0,
      )
      if (!volume) return
      exercise.primary.forEach((muscle) => {
        const entry = result.get(muscle)
        if (!entry) return
        entry.volume += volume
        entry.exercises.add(exercise.id)
        entry.primarySessions += 1
        touched.add(muscle)
      })
      exercise.secondary.forEach((muscle) => {
        const entry = result.get(muscle)
        if (!entry) return
        entry.volume += volume * 0.35
        entry.exercises.add(exercise.id)
        touched.add(muscle)
      })
    })
    touched.forEach((muscle) => {
      const entry = result.get(muscle)!
      entry.workouts += 1
      if (!entry.lastTrained || session.date > entry.lastTrained) entry.lastTrained = session.date
    })
  })

  const max = Math.max(1, ...Array.from(result.values()).map((entry) => entry.volume))
  Array.from(result.values()).forEach((entry) => {
    const ratio = entry.volume / max
    entry.level = entry.volume === 0 ? 0 : ratio >= 0.58 ? 3 : ratio >= 0.27 ? 2 : 1
  })

  return Array.from(result.values()).sort((a, b) => b.volume - a.volume)
}

export const getMuscleDetail = (
  sessions: WorkoutSession[],
  profile: UserProfile,
  catalog: Exercise[],
  muscleId: MuscleId,
  days = 90,
) => {
  const aggregates = getMuscleAggregates(sessions, profile, catalog, days)
  const aggregate = aggregates.find((item) => item.muscle === muscleId) ?? aggregates[0]
  const involvesMuscle = (exerciseId: string) => {
    const exercise = getExerciseFromCatalog(exerciseId, catalog)
    return Boolean(exercise && (exercise.primary.includes(muscleId) || exercise.secondary.includes(muscleId)))
  }
  const history = completedSessions(sessions)
    .filter((session) => session.exercises.some((item) => involvesMuscle(item.exerciseId)))
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .slice(0, 8)
    .map((session) => {
      const relevantExercises = session.exercises.filter((item) => involvesMuscle(item.exerciseId))
      const volume = relevantExercises.reduce(
        (sum, item) => {
          const exercise = getExerciseFromCatalog(item.exerciseId, catalog)
          return sum + item.sets.reduce((s, set) => s + effectiveVolumeKg(set, exercise, profile), 0)
        },
        0,
      )
      return { id: session.id, name: session.name, date: session.date, durationSec: session.durationSec, volume, exercises: relevantExercises.length }
    })

  const allExercises = catalog.filter((exercise) => exercise.primary.includes(muscleId) || exercise.secondary.includes(muscleId))
  return {
    ...aggregate,
    description: muscleMap[muscleId].description,
    region: muscleMap[muscleId].region,
    view: muscleMap[muscleId].view,
    history,
    primaryExercises: allExercises.filter((exercise) => exercise.primary.includes(muscleId)).slice(0, 12),
    secondaryExercises: allExercises.filter((exercise) => exercise.secondary.includes(muscleId)).slice(0, 12),
  }
}

export interface ExercisePoint {
  date: string
  weight: number
  e1rm: number
  volume: number
  reps: number
  sets: number
  durationSec: number
}

export const getExerciseProgression = (
  sessions: WorkoutSession[],
  profile: UserProfile,
  catalog: Exercise[],
  exerciseId: string,
): ExercisePoint[] => {
  const exercise = getExerciseFromCatalog(exerciseId, catalog)
  return completedSessions(sessions)
    .map((session) => {
      const item = session.exercises.find((entry) => entry.exerciseId === exerciseId)
      if (!item) return null
      const sets = item.sets.filter((set) => set.completed)
      if (!sets.length) return null
      const best = sets.reduce((winner, set) =>
        effectiveLoadKg(set, exercise, profile) > effectiveLoadKg(winner, exercise, profile) ? set : winner,
      )
      return {
        date: session.date,
        weight: round(effectiveLoadKg(best, exercise, profile), 1),
        e1rm: round(estimate1RM(effectiveLoadKg(best, exercise, profile), best.reps), 1),
        volume: round(sets.reduce((sum, set) => sum + effectiveVolumeKg(set, exercise, profile), 0), 1),
        reps: sets.reduce((sum, set) => sum + set.reps, 0),
        sets: sets.length,
        durationSec: sets.reduce((sum, set) => sum + setDurationSec(set, exercise), 0),
      }
    })
    .filter((point): point is ExercisePoint => point !== null)
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
}

type PRCandidate = Omit<PersonalRecord, 'date' | 'sessionId'>

export interface PRDerivation {
  records: PersonalRecord[]
  /** PR ids first set or improved in each session. */
  prIdsBySession: Record<string, string[]>
}

const PR_EPSILON = 0.0001

const collectPRCandidates = (
  session: WorkoutSession,
  profile: UserProfile,
  catalog: Exercise[],
): PRCandidate[] => {
  const candidates: PRCandidate[] = []
  session.exercises.forEach((item) => {
    const exercise = getExerciseFromCatalog(item.exerciseId, catalog)
    if (!exercise) return
    const sets = item.sets.filter((set) => set.completed)
    if (!sets.length) return

    const volume = round(
      sets.reduce((sum, set) => sum + effectiveVolumeKg(set, exercise, profile), 0),
      1,
    )
    if (volume > 0) candidates.push({ id: `volume_${item.exerciseId}`, exerciseId: item.exerciseId, type: 'volume', value: volume })

    const timedSets = sets.filter((set) => setDurationSec(set, exercise) > 0)
    if (timedSets.length) {
      const longest = timedSets.reduce((winner, set) => (setDurationSec(set, exercise) > setDurationSec(winner, exercise) ? set : winner))
      candidates.push({
        id: `time_${item.exerciseId}`,
        exerciseId: item.exerciseId,
        type: 'time',
        value: round(setDurationSec(longest, exercise), 0),
      })
      return
    }

    const heaviest = sets.reduce((winner, set) =>
      effectiveLoadKg(set, exercise, profile) > effectiveLoadKg(winner, exercise, profile) ? set : winner,
    )
    const topE1rm = sets.reduce((winner, set) =>
      estimate1RM(effectiveLoadKg(set, exercise, profile), set.reps) >
      estimate1RM(effectiveLoadKg(winner, exercise, profile), winner.reps)
        ? set
        : winner,
    )
    const mostReps = sets.reduce((winner, set) => (set.reps > winner.reps ? set : winner))
    const heaviestLoad = round(effectiveLoadKg(heaviest, exercise, profile), 1)

    if (heaviestLoad > 0) {
      candidates.push({
        id: `weight_${item.exerciseId}`,
        exerciseId: item.exerciseId,
        type: 'weight',
        value: heaviestLoad,
        reps: heaviest.reps,
      })
      candidates.push({
        id: `e1rm_${item.exerciseId}`,
        exerciseId: item.exerciseId,
        type: 'e1rm',
        value: round(estimate1RM(effectiveLoadKg(topE1rm, exercise, profile), topE1rm.reps), 1),
        reps: topE1rm.reps,
      })
    }
    if (mostReps.reps > 0) {
      candidates.push({
        id: `reps_${item.exerciseId}`,
        exerciseId: item.exerciseId,
        type: 'reps',
        value: mostReps.reps,
        reps: mostReps.reps,
      })
    }
  })
  return candidates
}

/**
 * Rebuilds the current best record for every exercise/metric. A record is only
 * attributed to a session when it establishes or strictly beats the prior best.
 */
export const derivePRData = (
  sessions: WorkoutSession[],
  options: { existing?: PersonalRecord[]; catalog?: Exercise[]; profile?: UserProfile } = {},
): PRDerivation => {
  const profile = options.profile ?? ({ weightKg: 75, unit: 'kg' } as UserProfile)
  const catalog = options.catalog ?? builtInExercises
  const best = new Map<string, { value: number; record: PersonalRecord }>()
  const prIdsBySession: Record<string, string[]> = {}

  ;(options.existing ?? []).forEach((record) => {
    if (!Number.isFinite(record.value) || record.value <= 0) return
    const current = best.get(record.id)
    if (!current || record.value > current.value) best.set(record.id, { value: record.value, record })
  })

  completedSessions(sessions)
    .slice()
    .sort(byDateAsc)
    .forEach((session) => {
      collectPRCandidates(session, profile, catalog).forEach((candidate) => {
        const current = best.get(candidate.id)
        if (current && candidate.value <= current.value + PR_EPSILON) return
        const record: PersonalRecord = {
          ...candidate,
          date: session.date,
          sessionId: session.id,
        }
        best.set(candidate.id, { value: candidate.value, record })
        prIdsBySession[session.id] = [...(prIdsBySession[session.id] ?? []), candidate.id]
      })
    })

  return { records: Array.from(best.values()).map((entry) => entry.record), prIdsBySession }
}

export const derivePRs = (
  sessions: WorkoutSession[],
  existing: PersonalRecord[] = [],
  catalog: Exercise[] = builtInExercises,
  profile?: UserProfile,
) => derivePRData(sessions, { existing, catalog, profile }).records

/** Full recompute used after a session is edited or deleted. */
export const rebuildPRs = (
  sessions: WorkoutSession[],
  catalog: Exercise[] = builtInExercises,
  profile?: UserProfile,
) => derivePRData(sessions, { catalog, profile })

const typeLabels: Record<PersonalRecord['type'], string> = {
  weight: 'Heaviest set',
  e1rm: 'Estimated 1RM',
  reps: 'Most reps',
  volume: 'Session volume',
  time: 'Longest hold',
}

export const getPRList = (
  records: PersonalRecord[],
  catalog: Exercise[] = builtInExercises,
  unit: UserProfile['unit'] = 'kg',
) =>
  records
    .filter((record) => Number.isFinite(record.value) && record.value > 0)
    .map((record) => ({
      ...record,
      exerciseName: getExerciseFromCatalog(record.exerciseId, catalog)?.name ?? 'Custom exercise',
      typeLabel: typeLabels[record.type],
      displayValue:
        record.type === 'reps'
          ? `${record.value} reps`
          : record.type === 'time'
            ? formatTimer(record.value)
            : record.type === 'volume'
              ? formatVolume(record.value, unit)
              : formatWeight(record.value, unit, 1),
    }))
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())

export const getVolumesByCategory = (
  sessions: WorkoutSession[],
  profile: UserProfile,
  catalog: Exercise[],
  days = 90,
) => {
  const scoped = getRangeSessions(sessions, days)
  const map = new Map<string, number>()
  scoped.forEach((session) =>
    session.exercises.forEach((item) => {
      const exercise = getExerciseFromCatalog(item.exerciseId, catalog)
      if (!exercise) return
      const volume = item.sets.reduce((sum, set) => sum + effectiveVolumeKg(set, exercise, profile), 0)
      map.set(exercise.category, (map.get(exercise.category) ?? 0) + volume)
    }),
  )
  return Array.from(map, ([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume)
}

export { sessionActiveSec }
