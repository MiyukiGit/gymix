import { exercises as builtInExercises } from '../data/exercises'
import type { Exercise, SetEntry, UserProfile, WorkoutSession } from '../types'
import { isTimedPrescription, parseDurationSec } from './utils'

/** Bodyweight movements are loaded as a share of the user's body weight. */
export const BODYWEIGHT_FRACTION = 0.6
/** Cardio uses a lower bodyweight share because it is not a loaded lift. */
export const CARDIO_FRACTION = 0.35

export const getExerciseFromCatalog = (id: string, catalog: Exercise[] = builtInExercises) =>
  catalog.find((exercise) => exercise.id === id) ?? builtInExercises.find((exercise) => exercise.id === id)

export const isTimedExercise = (exercise?: Exercise) =>
  Boolean(exercise && (exercise.category === 'Cardio' || isTimedPrescription(exercise.reps)))

export const isTimedSet = (set: SetEntry, exercise?: Exercise) =>
  Boolean(set.durationSec && set.durationSec > 0) || isTimedExercise(exercise)

export const setDurationSec = (set: SetEntry, exercise?: Exercise) => {
  if (set.durationSec && set.durationSec > 0) return set.durationSec
  if (!isTimedExercise(exercise)) return 0
  return parseDurationSec(exercise?.reps ?? '') ?? Math.max(0, set.reps)
}

/** All volumes are stored in kg-equivalents, regardless of display unit. */
export const effectiveLoadKg = (set: SetEntry, exercise: Exercise | undefined, profile: UserProfile) => {
  if (isTimedExercise(exercise)) return 0
  if (exercise?.equipment === 'Bodyweight') {
    return profile.weightKg * BODYWEIGHT_FRACTION + Math.max(0, set.weight)
  }
  return Math.max(0, set.weight)
}

export const effectiveVolumeKg = (set: SetEntry, exercise: Exercise | undefined, profile: UserProfile) => {
  if (!set.completed) return 0
  if (isTimedExercise(exercise)) {
    const fraction = exercise?.category === 'Cardio' ? CARDIO_FRACTION : BODYWEIGHT_FRACTION
    return (profile.weightKg * fraction * setDurationSec(set, exercise)) / 60
  }
  return effectiveLoadKg(set, exercise, profile) * set.reps
}

export const sessionVolume = (session: WorkoutSession, catalog: Exercise[], profile: UserProfile) =>
  session.exercises.reduce(
    (total, item) =>
      total +
      item.sets.reduce((sum, set) => sum + effectiveVolumeKg(set, getExerciseFromCatalog(item.exerciseId, catalog), profile), 0),
    0,
  )

/** Reps and timed work are deliberately kept separate. */
export const sessionReps = (session: WorkoutSession, catalog: Exercise[]) =>
  session.exercises.reduce((total, item) => {
    const exercise = getExerciseFromCatalog(item.exerciseId, catalog)
    return total + item.sets.reduce((sum, set) => sum + (!set.completed || isTimedSet(set, exercise) ? 0 : set.reps), 0)
  }, 0)

export const sessionActiveSec = (session: WorkoutSession, catalog: Exercise[]) =>
  session.exercises.reduce((total, item) => {
    const exercise = getExerciseFromCatalog(item.exerciseId, catalog)
    return total + item.sets.reduce((sum, set) => sum + (set.completed && isTimedSet(set, exercise) ? setDurationSec(set, exercise) : 0), 0)
  }, 0)

export const recomputeSession = (session: WorkoutSession, catalog: Exercise[], profile: UserProfile): WorkoutSession => ({
  ...session,
  volume: sessionVolume(session, catalog, profile),
  totalReps: sessionReps(session, catalog),
  activeSec: sessionActiveSec(session, catalog),
})
