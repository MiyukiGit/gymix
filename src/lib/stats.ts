import { addDays, format, parseISO, subDays } from 'date-fns'
import { exercises, muscleMap } from '../data/exercises'
import type { Exercise, MuscleId, PersonalRecord, UserProfile, WorkoutSession } from '../types'
import { getStreakInfo } from './streaks'
import { dateKey, formatCompact, round } from './utils'

export const completedSessions = (sessions: WorkoutSession[]) => sessions.filter((session) => session.status === 'completed')

export const getRangeSessions = (sessions: WorkoutSession[], days: number) => {
  if (days >= 3650) return completedSessions(sessions)
  const cutoff = subDays(new Date(), days).getTime()
  return completedSessions(sessions).filter((session) => parseISO(session.date).getTime() >= cutoff)
}

export const setVolume = (session: WorkoutSession) =>
  session.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => set.completed).reduce((sum, set) => sum + set.weight * set.reps, 0),
    0,
  )

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

export const getStats = (sessions: WorkoutSession[], profile: UserProfile, days = 3650): Stats => {
  const scoped = getRangeSessions(sessions, days)
  const streak = getStreakInfo(sessions, profile)
  const totalReps = scoped.reduce(
    (sum, session) => sum + session.exercises.reduce((s, ex) => s + ex.sets.filter((set) => set.completed).reduce((r, set) => r + set.reps, 0), 0),
    0,
  )
  const totalTime = scoped.reduce((sum, session) => sum + session.durationSec, 0)
  const uniqueExercises = new Set(scoped.flatMap((session) => session.exercises.map((item) => item.exerciseId)))
  const weekly = getRangeSessions(sessions, 7).length
  const monthly = getRangeSessions(sessions, 30).length

  return {
    totalWorkouts: scoped.length,
    totalVolume: scoped.reduce((sum, session) => sum + session.volume, 0),
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

export const getWeeklyActivity = (sessions: WorkoutSession[], days = 7) => {
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
      volume: daySessions.reduce((sum, session) => sum + session.volume, 0),
      duration: daySessions.reduce((sum, session) => sum + session.durationSec, 0),
      active: daySessions.length > 0,
    }
  })
}

const bucketDate = (date: Date, days: number) => {
  if (days <= 14) return format(date, 'MMM d')
  if (days <= 120) return `W${format(date, 'w')}`
  return format(date, 'MMM yy')
}

export const getTrend = (sessions: WorkoutSession[], days: number) => {
  const scoped = getRangeSessions(sessions, days)
  const buckets = new Map<string, { label: string; volume: number; workouts: number; reps: number; date: number }>()

  if (days <= 14) {
    Array.from({ length: days }, (_, index) => subDays(new Date(), days - 1 - index)).forEach((date) => {
      const label = bucketDate(date, days)
      if (!buckets.has(label)) buckets.set(label, { label, volume: 0, workouts: 0, reps: 0, date: date.getTime() })
    })
  } else {
    const start = subDays(new Date(), days)
    const cursor = start <= parseISO(scoped[0]?.date ?? new Date().toISOString()) ? start : parseISO(scoped[0].date)
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
    bucket.volume += session.volume
    bucket.workouts += 1
    bucket.reps += session.totalReps
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

export const getMuscleAggregates = (sessions: WorkoutSession[], days = 90): MuscleAggregate[] => {
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
      const exercise = exercises.find((candidate) => candidate.id === item.exerciseId)
      if (!exercise) return
      const volume = item.sets.filter((set) => set.completed).reduce((sum, set) => sum + set.weight * set.reps, 0)
      if (!volume) return
      exercise.primary.forEach((muscle) => {
        const entry = result.get(muscle)!
        entry.volume += volume
        entry.exercises.add(exercise.id)
        entry.primarySessions += 1
        touched.add(muscle)
      })
      exercise.secondary.forEach((muscle) => {
        const entry = result.get(muscle)!
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

export const getMuscleDetail = (sessions: WorkoutSession[], muscleId: MuscleId, days = 90) => {
  const aggregates = getMuscleAggregates(sessions, days)
  const aggregate = aggregates.find((item) => item.muscle === muscleId) ?? aggregates[0]
  const history = completedSessions(sessions)
    .filter((session) =>
      session.exercises.some((item) => {
        const exercise = exercises.find((candidate) => candidate.id === item.exerciseId)
        return exercise ? exercise.primary.includes(muscleId) || exercise.secondary.includes(muscleId) : false
      }),
    )
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .slice(0, 8)
    .map((session) => {
      const relevantExercises = session.exercises.filter((item) => {
        const exercise = exercises.find((candidate) => candidate.id === item.exerciseId)
        return exercise ? exercise.primary.includes(muscleId) || exercise.secondary.includes(muscleId) : false
      })
      const volume = relevantExercises.reduce(
        (sum, item) => sum + item.sets.filter((set) => set.completed).reduce((s, set) => s + set.weight * set.reps, 0),
        0,
      )
      return { id: session.id, name: session.name, date: session.date, durationSec: session.durationSec, volume, exercises: relevantExercises.length }
    })

  const allExercises = exercises.filter((exercise) => exercise.primary.includes(muscleId) || exercise.secondary.includes(muscleId))
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
}

export const getExerciseProgression = (sessions: WorkoutSession[], exerciseId: string): ExercisePoint[] =>
  completedSessions(sessions)
    .map((session) => {
      const item = session.exercises.find((entry) => entry.exerciseId === exerciseId)
      if (!item) return null
      const sets = item.sets.filter((set) => set.completed)
      if (!sets.length) return null
      const best = sets.reduce((winner, set) => (estimate1RM(set.weight, set.reps) > estimate1RM(winner.weight, winner.reps) ? set : winner))
      return {
        date: session.date,
        weight: best.weight,
        e1rm: round(estimate1RM(best.weight, best.reps), 1),
        volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
        reps: sets.reduce((sum, set) => sum + set.reps, 0),
        sets: sets.length,
      }
    })
    .filter((point): point is ExercisePoint => point !== null)
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())

export const derivePRs = (sessions: WorkoutSession[], existing: PersonalRecord[] = []): PersonalRecord[] => {
  const byExercise = new Map<string, PersonalRecord>()
  const push = (record: PersonalRecord) => {
    const current = byExercise.get(record.id)
    if (!current || record.value > current.value) byExercise.set(record.id, record)
  }

  completedSessions(sessions).forEach((session) => {
    session.exercises.forEach((item) => {
      const sets = item.sets.filter((set) => set.completed)
      if (!sets.length) return
      const heaviest = sets.reduce((winner, set) => (set.weight > winner.weight ? set : winner))
      const topE1rm = sets.reduce((winner, set) =>
        estimate1RM(set.weight, set.reps) > estimate1RM(winner.weight, winner.reps) ? set : winner,
      )
      const mostReps = sets.reduce((winner, set) => (set.reps > winner.reps ? set : winner))
      const volume = sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
      const base = { exerciseId: item.exerciseId, date: session.date, sessionId: session.id }
      push({ ...base, id: `weight_${item.exerciseId}`, type: 'weight', value: heaviest.weight, reps: heaviest.reps })
      push({ ...base, id: `e1rm_${item.exerciseId}`, type: 'e1rm', value: round(estimate1RM(topE1rm.weight, topE1rm.reps), 1), reps: topE1rm.reps })
      if (mostReps.reps > 0) push({ ...base, id: `reps_${item.exerciseId}`, type: 'reps', value: mostReps.reps, reps: mostReps.reps })
      push({ ...base, id: `volume_${item.exerciseId}`, type: 'volume', value: round(volume, 0) })
    })
  })

  existing.forEach((record) => push(record))
  return Array.from(byExercise.values())
}

export const getPRList = (sessions: WorkoutSession[], unit: UserProfile['unit'] = 'kg') => {
  const exerciseLookup = new Map<string, Exercise>(exercises.map((exercise) => [exercise.id, exercise]))
  return derivePRs(sessions)
    .filter((record) => record.type !== 'volume' || record.value > 0)
    .map((record) => ({
      ...record,
      exerciseName: exerciseLookup.get(record.exerciseId)?.name ?? 'Custom exercise',
      displayValue:
        record.type === 'reps' ? `${record.value} reps` : record.type === 'volume' ? `${formatCompact(record.value)} kg` : `${round(record.type === 'e1rm' ? record.value : record.value, 1)} ${unit}`,
    }))
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
}

export const getVolumesByCategory = (sessions: WorkoutSession[], days = 90) => {
  const scoped = getRangeSessions(sessions, days)
  const map = new Map<string, number>()
  scoped.forEach((session) =>
    session.exercises.forEach((item) => {
      const exercise = exercises.find((candidate) => candidate.id === item.exerciseId)
      if (!exercise) return
      const volume = item.sets.filter((set) => set.completed).reduce((sum, set) => sum + set.weight * set.reps, 0)
      map.set(exercise.category, (map.get(exercise.category) ?? 0) + volume)
    }),
  )
  return Array.from(map, ([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume)
}
