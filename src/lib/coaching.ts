import { differenceInHours, parseISO } from 'date-fns'
import { exercises as builtInExercises, muscleMap } from '../data/exercises'
import type { Exercise, MuscleId, Routine, UserProfile, WorkoutSession } from '../types'
import { getExerciseFromCatalog, isTimedExercise } from './metrics'
import { getMuscleAggregates, getRangeSessions } from './stats'
import { formatTimer, formatWeight, fromDisplayWeight, parseDurationSec, round, toDisplayWeight } from './utils'

export const HARD_SET_RPE = 7
export const WEEKLY_SET_MIN = 10
export const WEEKLY_SET_MAX = 20

export type RecoveryStatus = 'fresh' | 'recovering' | 'fatigued'

export interface MuscleRecovery {
  muscle: MuscleId
  name: string
  status: RecoveryStatus
  hoursSince: number | null
  lastTrained: string | null
}

/** Recovery is inferred from the last logged session for each muscle. */
export const getMuscleRecoveryMap = (
  sessions: WorkoutSession[],
  profile: UserProfile,
  catalog: Exercise[] = builtInExercises,
): MuscleRecovery[] => {
  const aggregates = getMuscleAggregates(sessions, profile, catalog, 365)
  return aggregates.map((entry) => {
    const hours = entry.lastTrained
      ? Math.max(0, differenceInHours(new Date(), parseISO(entry.lastTrained)))
      : null
    const status: RecoveryStatus = hours === null || hours >= 72
      ? 'fresh'
      : hours >= 24
        ? 'recovering'
        : 'fatigued'
    return {
      muscle: entry.muscle,
      name: entry.name,
      status,
      hoursSince: hours === null ? null : round(hours, 0),
      lastTrained: entry.lastTrained,
    }
  })
}

export interface RoutineSuggestion {
  routine: Routine
  score: number
  reason: string
}

/** Picks the routine that best fits the muscles that are ready to train. */
export const suggestRoutine = (
  routines: Routine[],
  recovery: MuscleRecovery[],
  catalog: Exercise[] = builtInExercises,
): RoutineSuggestion | null => {
  const candidates = routines.filter((routine) => routine.exercises.length > 0)
  if (!candidates.length) return null

  const statusByMuscle = new Map(recovery.map((entry) => [entry.muscle, entry.status]))
  const nameByMuscle = new Map(recovery.map((entry) => [entry.muscle, entry.name]))
  const scoreFor = (status: RecoveryStatus | undefined) =>
    status === 'fresh' ? 2 : status === 'fatigued' ? -3 : 0

  const scored = candidates
    .map((routine) => {
      let score = 0
      const fresh = new Set<MuscleId>()
      const tired = new Set<MuscleId>()
      routine.exercises.forEach((prescription) => {
        const exercise = getExerciseFromCatalog(prescription.exerciseId, catalog)
        if (!exercise) return
        exercise.primary.forEach((muscle) => {
          score += scoreFor(statusByMuscle.get(muscle))
          if (statusByMuscle.get(muscle) === 'fresh') fresh.add(muscle)
          if (statusByMuscle.get(muscle) === 'fatigued') tired.add(muscle)
        })
        exercise.secondary.forEach((muscle) => {
          score += scoreFor(statusByMuscle.get(muscle)) * 0.4
        })
      })
      return { routine, score: score / routine.exercises.length, fresh, tired }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  const freshNames = [...best.fresh].slice(0, 2).map((muscle) => nameByMuscle.get(muscle) ?? muscleMap[muscle].name)
  const tiredNames = [...best.tired].slice(0, 2).map((muscle) => nameByMuscle.get(muscle) ?? muscleMap[muscle].name)
  const reason = tiredNames.length
    ? `${freshNames.join(' & ') || 'Upper body'} look ready; ${tiredNames.join(' & ')} are still recovering.`
    : `${freshNames.join(' & ') || 'Your whole body'} look ready to train.`

  return { routine: best.routine, score: round(best.score, 2), reason }
}

export type WeeklySetStatus = 'under' | 'optimal' | 'over'

export interface MuscleWeeklySets {
  muscle: MuscleId
  name: string
  sets: number
  min: number
  max: number
  status: WeeklySetStatus
}

/**
 * Counts completed sets with RPE 7+ as hard work. Legacy sets without an RPE
 * are counted so older workouts remain useful.
 */
export const getWeeklyMuscleSets = (
  sessions: WorkoutSession[],
  catalog: Exercise[] = builtInExercises,
  days = 7,
): MuscleWeeklySets[] => {
  const totals = new Map<MuscleId, number>(Object.values(muscleMap).map((muscle) => [muscle.id, 0]))
  getRangeSessions(sessions, days).forEach((session) => {
    session.exercises.forEach((item) => {
      const exercise = getExerciseFromCatalog(item.exerciseId, catalog)
      if (!exercise) return
      item.sets.forEach((set) => {
        if (!set.completed) return
        if (set.rpe !== undefined && set.rpe < HARD_SET_RPE) return
        exercise.primary.forEach((muscle) => totals.set(muscle, (totals.get(muscle) ?? 0) + 1))
        exercise.secondary.forEach((muscle) => totals.set(muscle, (totals.get(muscle) ?? 0) + 0.5))
      })
    })
  })

  return Object.values(muscleMap).map((muscle) => {
    const sets = round(totals.get(muscle.id) ?? 0, 1)
    return {
      muscle: muscle.id,
      name: muscle.name,
      sets,
      min: WEEKLY_SET_MIN,
      max: WEEKLY_SET_MAX,
      status: sets < WEEKLY_SET_MIN ? 'under' : sets > WEEKLY_SET_MAX ? 'over' : 'optimal',
    }
  })
}

export interface PreviousPerformance {
  weight: number
  reps: number
  durationSec?: number
  rpe?: number
}

export type ProgressionKind = 'increase' | 'hold' | 'reduce' | 'start'

export interface ProgressionSuggestion {
  title: string
  detail: string
  kind: ProgressionKind
}

const parseRepRange = (prescription: string, fallback: number) => {
  const values = prescription.match(/\d+/g)?.map(Number) ?? []
  if (values.length >= 2) return { min: values[0], max: values[1] }
  const single = values[0] ?? fallback
  return { min: single, max: single }
}

const loadStep = (unit: UserProfile['unit']) => (unit === 'kg' ? 2.5 : 5)

const bumpLoad = (weight: number, unit: UserProfile['unit'], steps: number) => {
  const step = loadStep(unit)
  const display = Math.max(step, toDisplayWeight(weight, unit))
  const next = Math.ceil((display + 0.01) / step) * step * steps
  return fromDisplayWeight(round(next, 1), unit)
}

const easeOffLoad = (weight: number, unit: UserProfile['unit']) => {
  const step = loadStep(unit)
  const display = Math.max(step, toDisplayWeight(weight, unit) * 0.9)
  return fromDisplayWeight(round(Math.floor(display / step) * step, 1), unit)
}

const averageRPE = (performances: PreviousPerformance[]) => {
  const values = performances
    .map((set) => set.rpe)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  if (!values.length) return undefined
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 0)
}

/** Simple, explainable progression rules driven by reps, RPE and the last session. */
export const getProgressionSuggestion = (
  exercise: Exercise,
  previous: PreviousPerformance[],
  profile: UserProfile,
): ProgressionSuggestion => {
  const usable = previous.filter((set) => set.reps > 0 || (set.durationSec ?? 0) > 0)
  if (!usable.length) {
    return {
      title: 'Build a baseline',
      detail: 'Log this exercise once and your next target will appear here.',
      kind: 'start',
    }
  }

  const rpe = averageRPE(usable)
  if (isTimedExercise(exercise)) {
    const best = usable.reduce((winner, set) =>
      (set.durationSec ?? set.reps) > (winner.durationSec ?? winner.reps) ? set : winner,
    )
    const current = Math.max(1, Math.round(best.durationSec ?? best.reps))
    const target = Math.max(current, parseDurationSec(exercise.reps) ?? 30)
    const summary = `Last time: ${formatTimer(current)}${rpe ? ` @ RPE ${rpe}` : ''}.`
    if (rpe && rpe >= 9) {
      return {
        title: `${current}s`,
        detail: `${summary} Keep the duration and move with less strain first.`,
        kind: 'hold',
      }
    }
    if (current >= target * 0.9) {
      const next = Math.ceil((current * 1.15) / 15) * 15
      return {
        title: `${next}s`,
        detail: `${summary} You met the duration target — extend it by about 15%.`,
        kind: 'increase',
      }
    }
    return {
      title: `${target}s`,
      detail: `${summary} Build up to ${target}s before adding more time.`,
      kind: 'hold',
    }
  }

  const best = usable.reduce((winner, set) => (set.weight > winner.weight ? set : winner))
  const { min, max } = parseRepRange(exercise.reps, best.reps)
  const current = formatWeight(best.weight, profile.unit)
  const summary = `Last time: ${usable.length}×${best.reps} at ${current}${rpe ? ` @ RPE ${rpe}` : ''}.`

  if (rpe && rpe >= 10) {
    const next = easeOffLoad(best.weight, profile.unit)
    return {
      title: formatWeight(next, profile.unit),
      detail: `${summary} That was a maximal effort — take about 10% off and rebuild.`,
      kind: 'reduce',
    }
  }

  if (best.reps >= max && (!rpe || rpe <= 8)) {
    const next = bumpLoad(best.weight, profile.unit, 1)
    return {
      title: formatWeight(next, profile.unit),
      detail: `${summary} You topped the rep range — add the smallest available step.`,
      kind: 'increase',
    }
  }

  if (best.reps >= min && rpe && rpe <= 6) {
    const next = bumpLoad(best.weight, profile.unit, 1)
    return {
      title: formatWeight(next, profile.unit),
      detail: `${summary} RPE 6 means you had more in the tank — add a little load.`,
      kind: 'increase',
    }
  }

  if (best.reps < min) {
    return {
      title: formatWeight(best.weight, profile.unit),
      detail: `${summary} Hold the load and aim for ${min} clean reps first.`,
      kind: 'hold',
    }
  }

  return {
    title: formatWeight(best.weight, profile.unit),
    detail: `${summary} ${rpe && rpe >= 9 ? 'Keep the load until reps feel smoother.' : 'Reach the top of the rep range before adding weight.'}`,
    kind: 'hold',
  }
}
