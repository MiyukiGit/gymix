import { differenceInSeconds, parseISO } from 'date-fns'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  Exercise,
  PersonalRecord,
  Routine,
  RoutineExercise,
  SetEntry,
  UserProfile,
  WorkoutExercise,
  WorkoutSession,
} from '../types'
import { createSeedState } from '../data/seed'
import { builtInRoutines } from '../data/routines'
import { exercises as builtInExercises } from '../data/exercises'
import { checkNewAchievements, type UnlockedAchievementDef } from '../lib/achievements'
import { getExerciseFromCatalog, isTimedExercise, recomputeSession } from '../lib/metrics'
import { rebuildPRs } from '../lib/stats'
import { clamp, parseDurationSec, uid } from '../lib/utils'

export interface FinishResult {
  achievements: UnlockedAchievementDef[]
  prs: PersonalRecord[]
}

interface AppStore extends AppState {
  startWorkout: (routineId?: string) => void
  startEmptyWorkout: () => void
  addExerciseToActive: (exerciseId: string) => void
  removeExerciseFromActive: (workoutExerciseId: string) => void
  moveExercise: (workoutExerciseId: string, direction: -1 | 1) => void
  addSet: (workoutExerciseId: string) => void
  removeSet: (workoutExerciseId: string, setId: string) => void
  updateSet: (workoutExerciseId: string, setId: string, patch: Partial<SetEntry>) => void
  toggleSet: (workoutExerciseId: string, setId: string) => void
  copyPreviousSet: (workoutExerciseId: string, setId: string) => void
  updateExerciseNotes: (workoutExerciseId: string, notes: string) => void
  updateSessionNotes: (notes: string) => void
  setActiveDuration: (seconds: number) => void
  startRestTimer: (durationSec: number) => void
  adjustRestTimer: (deltaSec: number) => void
  clearRestTimer: () => void
  finishWorkout: () => FinishResult
  cancelWorkout: () => void
  editSession: (
    sessionId: string,
    patch: Partial<Pick<WorkoutSession, 'date' | 'durationSec' | 'notes' | 'exercises'>>,
  ) => void
  deleteSession: (sessionId: string) => void
  createRoutine: (routine: Omit<Routine, 'id' | 'isCustom'>) => void
  updateRoutine: (routine: Routine) => void
  deleteRoutine: (id: string) => void
  createExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => void
  toggleFavorite: (exerciseId: string) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  importState: (state: AppState) => void
  resetToSeed: () => void
  clearAllData: () => void
}

type PreviousSet = { weight: number; reps: number; durationSec?: number; rpe?: number }

const sortSessions = (sessions: WorkoutSession[]) =>
  [...sessions].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())

/** Returns the most recent session's sets for an exercise, matched by set index. */
const previousSets = (sessions: WorkoutSession[], exerciseId: string): PreviousSet[] => {
  for (const session of sortSessions(sessions)) {
    if (session.status !== 'completed') continue
    const item = session.exercises.find((entry) => entry.exerciseId === exerciseId)
    if (!item) continue
    const sets = item.sets.filter((set) => set.completed)
    if (sets.length) {
      return sets.map((set) => ({ weight: set.weight, reps: set.reps, durationSec: set.durationSec, rpe: set.rpe }))
    }
  }
  return []
}

const parseReps = (value: string) => {
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : 10
}

const createSets = (count: number, previous: PreviousSet[], exercise?: Exercise): SetEntry[] => {
  const timed = isTimedExercise(exercise)
  const fallbackDuration = timed ? parseDurationSec(exercise?.reps ?? '') : undefined
  const fallbackReps = parseReps(exercise?.reps ?? '')
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const snapshot = previous[index] ?? previous[previous.length - 1]
    const durationSec = snapshot?.durationSec ?? fallbackDuration
    return {
      id: uid('set'),
      weight: snapshot?.weight ?? 0,
      reps: durationSec ? 1 : snapshot?.reps ?? fallbackReps,
      completed: false,
      durationSec,
      previous: snapshot,
    }
  })
}

const buildWorkoutExercises = (
  prescriptions: RoutineExercise[],
  sessions: WorkoutSession[],
  catalog: Exercise[],
): WorkoutExercise[] =>
  prescriptions.map((prescription) => {
    const exercise = catalog.find((item) => item.id === prescription.exerciseId)
      ?? builtInExercises.find((item) => item.id === prescription.exerciseId)
    return {
      id: uid('we'),
      exerciseId: prescription.exerciseId,
      sets: createSets(prescription.sets, previousSets(sessions, prescription.exerciseId), exercise),
      notes: '',
    }
  })

const updateActive = (state: AppStore, updater: (session: WorkoutSession) => WorkoutSession): Partial<AppStore> => ({
  sessions: state.sessions.map((session) => (session.id === state.activeSessionId ? updater(session) : session)),
})

/** Recomputes stored metrics, PRs, and each session's PR ids together. */
const rebuildDerivedData = (state: AppStore, sessions: WorkoutSession[]): Partial<AppStore> => {
  const ordered = sortSessions(sessions.map((session) => recomputeSession(session, state.exercises, state.profile)))
  const prData = rebuildPRs(ordered, state.exercises, state.profile)
  const nextSessions = ordered.map((session) => ({
    ...session,
    prIds: prData.prIdsBySession[session.id] ?? [],
  }))
  const next: AppState = { ...state, sessions: nextSessions, prs: prData.records }
  const unlocked = checkNewAchievements(next)
  return { ...next, achievements: [...state.achievements, ...unlocked] }
}

/** Legacy timed sets stored their duration in `reps`; keep that data usable. */
const normalizeSet = (set: SetEntry, exercise?: Exercise): SetEntry => {
  if (!isTimedExercise(exercise)) return set
  const prescription = exercise?.reps ?? ''
  const fallbackSec = parseDurationSec(prescription)
  // Older cardio data stored whole minutes in `reps`; hold data stored seconds.
  const legacyMultiplier = /\b(min|mins|minute|minutes)\b/i.test(prescription) ? 60 : 1
  const durationSec = set.durationSec && set.durationSec > 0
    ? set.durationSec
    : set.reps > 1
      ? set.reps * legacyMultiplier
      : fallbackSec ?? 0
  const previous = set.previous
    ? {
        weight: set.previous.weight,
        reps: 1,
        durationSec: set.previous.durationSec && set.previous.durationSec > 0
          ? set.previous.durationSec
          : set.previous.reps > 1
            ? set.previous.reps * legacyMultiplier
            : fallbackSec,
        rpe: set.previous.rpe,
      }
    : undefined
  return {
    ...set,
    durationSec: durationSec > 0 ? durationSec : undefined,
    reps: 1,
    previous,
  }
}

/**
 * Recalculates derived fields for data written by older versions without
 * deleting any persisted sessions, records, preferences, or achievements.
 */
const normalizeHydratedState = (persisted: unknown, current: AppStore): AppStore => {
  if (!persisted || typeof persisted !== 'object') return current
  const incoming = persisted as Partial<AppState>
  const profile = incoming.profile ?? current.profile
  const exercises = incoming.exercises?.length ? incoming.exercises : current.exercises
  const rawSessions = Array.isArray(incoming.sessions) ? incoming.sessions : current.sessions
  const normalized = rawSessions.map((session) =>
    recomputeSession(
      {
        ...session,
        prIds: Array.isArray(session.prIds) ? session.prIds : [],
        exercises: (session.exercises ?? []).map((item) => ({
          ...item,
          sets: (item.sets ?? []).map((set) =>
            normalizeSet(set, getExerciseFromCatalog(item.exerciseId, exercises)),
          ),
        })),
      },
      exercises,
      profile,
    ),
  )
  const ordered = sortSessions(normalized)
  const prData = rebuildPRs(ordered, exercises, profile)
  const sessions = ordered.map((session) => ({
    ...session,
    prIds: prData.prIdsBySession[session.id] ?? [],
  }))
  const timer = incoming.restTimer
  const restTimer = timer && Number.isFinite(timer.endsAt) && Number.isFinite(timer.durationSec) && timer.durationSec > 0
    ? timer
    : null
  const hydrated: AppStore = {
    ...current,
    profile,
    exercises,
    favorites: incoming.favorites ?? current.favorites,
    routines: incoming.routines ?? current.routines,
    sessions,
    prs: prData.records,
    achievements: incoming.achievements ?? current.achievements,
    activeSessionId: incoming.activeSessionId && sessions.some((session) => session.id === incoming.activeSessionId)
      ? incoming.activeSessionId
      : null,
    streakFreezes: typeof incoming.streakFreezes === 'number' ? incoming.streakFreezes : current.streakFreezes,
    restTimer,
  }
  const unlocked = checkNewAchievements(hydrated)
  return { ...hydrated, achievements: [...hydrated.achievements, ...unlocked] }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...createSeedState(),

      startWorkout: (routineId) => {
        const state = get()
        if (state.activeSessionId) return
        const routine = [...builtInRoutines, ...state.routines.filter((item) => item.isCustom)].find((item) => item.id === routineId)
          ?? state.routines.find((item) => item.id === routineId)
        const now = new Date().toISOString()
        const session: WorkoutSession = {
          id: uid('session'),
          name: routine?.name ?? 'Custom Workout',
          templateId: routine?.id,
          date: now,
          startedAt: now,
          durationSec: 0,
          status: 'active',
          exercises: buildWorkoutExercises(routine?.exercises ?? [], state.sessions, state.exercises),
          notes: '',
          volume: 0,
          totalReps: 0,
          activeSec: 0,
          prIds: [],
        }
        set({ sessions: [session, ...state.sessions], activeSessionId: session.id })
      },

      startEmptyWorkout: () => {
        const state = get()
        if (state.activeSessionId) return
        const now = new Date().toISOString()
        const session: WorkoutSession = {
          id: uid('session'),
          name: 'Custom Workout',
          date: now,
          startedAt: now,
          durationSec: 0,
          status: 'active',
          exercises: [],
          notes: '',
          volume: 0,
          totalReps: 0,
          activeSec: 0,
          prIds: [],
        }
        set({ sessions: [session, ...state.sessions], activeSessionId: session.id })
      },

      addExerciseToActive: (exerciseId) => {
        const state = get()
        const exercise = state.exercises.find((item) => item.id === exerciseId)
        if (!exercise || !state.activeSessionId) return
        const item: WorkoutExercise = {
          id: uid('we'),
          exerciseId,
          sets: createSets(exercise.sets, previousSets(state.sessions, exerciseId), exercise),
          notes: '',
        }
        set(updateActive(state, (session) => ({ ...session, exercises: [...session.exercises, item] })))
      },

      removeExerciseFromActive: (workoutExerciseId) => {
        const state = get()
        set(
          updateActive(state, (session) => ({
            ...session,
            exercises: session.exercises.filter((item) => item.id !== workoutExerciseId),
          })),
        )
      },

      moveExercise: (workoutExerciseId, direction) => {
        const state = get()
        set(
          updateActive(state, (session) => {
            const items = [...session.exercises]
            const index = items.findIndex((item) => item.id === workoutExerciseId)
            const target = index + direction
            if (index < 0 || target < 0 || target >= items.length) return session
            ;[items[index], items[target]] = [items[target], items[index]]
            return { ...session, exercises: items }
          }),
        )
      },

      addSet: (workoutExerciseId) => {
        const state = get()
        set(
          updateActive(state, (session) => ({
            ...session,
            exercises: session.exercises.map((item) => {
              if (item.id !== workoutExerciseId) return item
              const history = previousSets(state.sessions, item.exerciseId)
              const index = item.sets.length
              const exercise = getExerciseFromCatalog(item.exerciseId, state.exercises)
              const snapshot = history[index] ?? history[history.length - 1]
              const last = item.sets[index - 1]
              const durationSec = snapshot?.durationSec
                ?? last?.durationSec
                ?? (isTimedExercise(exercise) ? parseDurationSec(exercise?.reps ?? '') : undefined)
              const set: SetEntry = {
                id: uid('set'),
                weight: snapshot?.weight ?? last?.weight ?? 0,
                reps: durationSec ? 1 : snapshot?.reps ?? last?.reps ?? parseReps(exercise?.reps ?? ''),
                completed: false,
                durationSec,
                previous: snapshot,
              }
              return { ...item, sets: [...item.sets, set] }
            }),
          })),
        )
      },

      removeSet: (workoutExerciseId, setId) => {
        const state = get()
        set(
          updateActive(state, (session) => ({
            ...session,
            exercises: session.exercises.map((item) =>
              item.id === workoutExerciseId ? { ...item, sets: item.sets.filter((set) => set.id !== setId) } : item,
            ),
          })),
        )
      },

      updateSet: (workoutExerciseId, setId, patch) => {
        const state = get()
        set(
          updateActive(state, (session) => ({
            ...session,
            exercises: session.exercises.map((item) =>
              item.id === workoutExerciseId
                ? { ...item, sets: item.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)) }
                : item,
            ),
          })),
        )
      },

      toggleSet: (workoutExerciseId, setId) => {
        const state = get()
        set(
          updateActive(state, (session) => ({
            ...session,
            exercises: session.exercises.map((item) =>
              item.id === workoutExerciseId
                ? {
                    ...item,
                    sets: item.sets.map((set) => (set.id === setId ? { ...set, completed: !set.completed } : set)),
                  }
                : item,
            ),
          })),
        )
      },

      copyPreviousSet: (workoutExerciseId, setId) => {
        const state = get()
        set(
          updateActive(state, (session) => ({
            ...session,
            exercises: session.exercises.map((item) =>
              item.id === workoutExerciseId
                ? {
                    ...item,
                    sets: item.sets.map((set) =>
                      set.id === setId && set.previous
                        ? {
                            ...set,
                            weight: set.previous.weight,
                            reps: set.previous.durationSec ? 1 : set.previous.reps,
                            durationSec: set.previous.durationSec,
                          }
                        : set,
                    ),
                  }
                : item,
            ),
          })),
        )
      },

      updateExerciseNotes: (workoutExerciseId, notes) => {
        const state = get()
        set(
          updateActive(state, (session) => ({
            ...session,
            exercises: session.exercises.map((item) => (item.id === workoutExerciseId ? { ...item, notes } : item)),
          })),
        )
      },

      updateSessionNotes: (notes) => {
        const state = get()
        set(updateActive(state, (session) => ({ ...session, notes })))
      },

      setActiveDuration: (seconds) => {
        const state = get()
        set(updateActive(state, (session) => ({ ...session, durationSec: Math.max(0, Math.round(seconds)) })))
      },

      startRestTimer: (durationSec) => {
        const duration = Math.max(1, Math.round(durationSec))
        set({ restTimer: { endsAt: Date.now() + duration * 1000, durationSec: duration } })
      },

      adjustRestTimer: (deltaSec) => {
        const timer = get().restTimer
        if (!timer) return
        const durationSec = Math.max(15, timer.durationSec + deltaSec)
        const appliedDelta = durationSec - timer.durationSec
        set({
          restTimer: {
            endsAt: timer.endsAt + appliedDelta * 1000,
            durationSec,
          },
        })
      },

      clearRestTimer: () => set({ restTimer: null }),

      finishWorkout: () => {
        const state = get()
        const active = state.sessions.find((session) => session.id === state.activeSessionId)
        if (!active) return { achievements: [], prs: [] }

        const elapsed = Math.max(active.durationSec, differenceInSeconds(new Date(), parseISO(active.startedAt)))
        const completed = recomputeSession(
          {
            ...active,
            status: 'completed',
            endedAt: new Date().toISOString(),
            durationSec: clamp(elapsed, 60, 4 * 60 * 60),
          },
          state.exercises,
          state.profile,
        )
        const sessions = [completed, ...state.sessions.filter((session) => session.id !== active.id)]
        const prData = rebuildPRs(sessions, state.exercises, state.profile)
        const prIds = prData.prIdsBySession[completed.id] ?? []
        const finalSessions = sessions.map((session) => ({
          ...session,
          prIds: prData.prIdsBySession[session.id] ?? [],
        }))
        const nextState: AppState = {
          ...state,
          sessions: finalSessions,
          prs: prData.records,
          activeSessionId: null,
          restTimer: null,
        }
        const unlocked = checkNewAchievements(nextState)
        set({ ...nextState, achievements: [...state.achievements, ...unlocked] })
        return {
          achievements: unlocked,
          prs: prData.records.filter((record) => prIds.includes(record.id)),
        }
      },

      cancelWorkout: () => {
        const state = get()
        if (!state.activeSessionId) return
        set({
          sessions: state.sessions.filter((session) => session.id !== state.activeSessionId),
          activeSessionId: null,
          restTimer: null,
        })
      },

      editSession: (sessionId, patch) => {
        const state = get()
        const target = state.sessions.find((session) => session.id === sessionId)
        if (!target || target.status !== 'completed') return
        const updated = recomputeSession({ ...target, ...patch }, state.exercises, state.profile)
        set(
          rebuildDerivedData(
            state,
            state.sessions.map((session) => (session.id === sessionId ? updated : session)),
          ),
        )
      },

      deleteSession: (sessionId) => {
        const state = get()
        const target = state.sessions.find((session) => session.id === sessionId)
        if (!target || target.status === 'active') return
        set(rebuildDerivedData(state, state.sessions.filter((session) => session.id !== sessionId)))
      },

      createRoutine: (routine) => {
        set((state) => ({
          routines: [...state.routines, { ...routine, id: uid('routine'), isCustom: true }],
        }))
      },

      updateRoutine: (routine) => {
        set((state) => ({ routines: state.routines.map((item) => (item.id === routine.id ? routine : item)) }))
      },

      deleteRoutine: (id) => {
        set((state) => ({ routines: state.routines.filter((routine) => routine.id !== id || !routine.isCustom) }))
      },

      createExercise: (exercise) => {
        set((state) => ({
          exercises: [
            ...state.exercises,
            { ...exercise, id: uid('custom_ex'), isCustom: true, illustration: exercise.category.toLowerCase() },
          ],
        }))
      },

      toggleFavorite: (exerciseId) => {
        set((state) => ({
          favorites: state.favorites.includes(exerciseId)
            ? state.favorites.filter((id) => id !== exerciseId)
            : [...state.favorites, exerciseId],
        }))
      },

      updateProfile: (patch) => {
        const state = get()
        const next: AppStore = { ...state, profile: { ...state.profile, ...patch } }
        set(rebuildDerivedData(next, state.sessions))
      },

      importState: (incoming) => {
        const state = get()
        const next: AppStore = {
          ...state,
          ...incoming,
          exercises: incoming.exercises?.length ? incoming.exercises : state.exercises,
          routines: incoming.routines ?? state.routines,
          favorites: incoming.favorites ?? state.favorites,
          activeSessionId: incoming.activeSessionId ?? null,
          streakFreezes: incoming.streakFreezes ?? 0,
          restTimer: incoming.restTimer ?? null,
        }
        set(rebuildDerivedData(next, incoming.sessions ?? state.sessions))
      },

      resetToSeed: () => set(createSeedState()),

      clearAllData: () => {
        set({
          sessions: [],
          prs: [],
          achievements: [],
          activeSessionId: null,
          streakFreezes: 0,
          restTimer: null,
        })
      },
    }),
    {
      name: 'gymix-store-v1',
      version: 1,
      merge: (persisted, current) => normalizeHydratedState(persisted, current),
      partialize: (state) => ({
        profile: state.profile,
        exercises: state.exercises,
        favorites: state.favorites,
        routines: state.routines,
        sessions: state.sessions,
        prs: state.prs,
        achievements: state.achievements,
        activeSessionId: state.activeSessionId,
        streakFreezes: state.streakFreezes,
        restTimer: state.restTimer ?? null,
      }),
    },
  ),
)
