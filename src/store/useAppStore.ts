import { differenceInSeconds, parseISO } from 'date-fns'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AchievementDef,
  AppState,
  Exercise,
  Routine,
  RoutineExercise,
  SetEntry,
  UserProfile,
  WorkoutExercise,
  WorkoutSession,
} from '../types'
import { createSeedState } from '../data/seed'
import { builtInRoutines } from '../data/routines'
import { checkNewAchievements } from '../lib/achievements'
import { derivePRs, setVolume } from '../lib/stats'
import { clamp, uid } from '../lib/utils'

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
  updateExerciseNotes: (workoutExerciseId: string, notes: string) => void
  updateSessionNotes: (notes: string) => void
  setActiveDuration: (seconds: number) => void
  finishWorkout: () => AchievementDef[]
  cancelWorkout: () => void
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

const lastPerformance = (sessions: WorkoutSession[], exerciseId: string) => {
  for (const session of sessions) {
    if (session.status !== 'completed') continue
    const item = session.exercises.find((entry) => entry.exerciseId === exerciseId)
    const set = item?.sets.filter((entry) => entry.completed).slice(-1)[0]
    if (set) return { weight: set.weight, reps: set.reps }
  }
  return undefined
}

const createSets = (count: number, previous?: { weight: number; reps: number }, fallbackReps = 10): SetEntry[] =>
  Array.from({ length: Math.max(1, count) }, (_, index) => ({
    id: uid('set'),
    weight: previous?.weight ?? 0,
    reps: previous?.reps ?? fallbackReps,
    completed: false,
    previous,
  }))

const parseReps = (value: string) => {
  const match = value.match(/\d+/)
  return match ? Number(match[0]) : 10
}

const buildWorkoutExercises = (
  prescriptions: RoutineExercise[],
  sessions: WorkoutSession[],
): WorkoutExercise[] =>
  prescriptions.map((prescription) => {
    const previous = lastPerformance(sessions, prescription.exerciseId)
    return {
      id: uid('we'),
      exerciseId: prescription.exerciseId,
      sets: createSets(prescription.sets, previous, parseReps(prescription.reps)),
      notes: '',
    }
  })

const updateActive = (state: AppStore, updater: (session: WorkoutSession) => WorkoutSession): Partial<AppStore> => ({
  sessions: state.sessions.map((session) => (session.id === state.activeSessionId ? updater(session) : session)),
})

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
          exercises: buildWorkoutExercises(routine?.exercises ?? [], state.sessions),
          notes: '',
          volume: 0,
          totalReps: 0,
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
          sets: createSets(exercise.sets, lastPerformance(state.sessions, exerciseId), parseReps(exercise.reps)),
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
              const previousSet = item.sets[item.sets.length - 1]
              return {
                ...item,
                sets: [
                  ...item.sets,
                  {
                    id: uid('set'),
                    weight: previousSet?.weight ?? 0,
                    reps: previousSet?.reps ?? 10,
                    completed: false,
                    previous: previousSet?.previous,
                  },
                ],
              }
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
            exercises: session.exercises.map((item) => {
              if (item.id !== workoutExerciseId) return item
              const set = item.sets.find((entry) => entry.id === setId)
              return {
                ...item,
                sets: item.sets.map((entry) => (entry.id === setId ? { ...entry, completed: !entry.completed } : entry)),
                notes: item.notes,
                // Rest timer is handled in the UI when a set becomes complete.
                ...(set && !set.completed ? {} : {}),
              }
            }),
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

      finishWorkout: () => {
        const state = get()
        const active = state.sessions.find((session) => session.id === state.activeSessionId)
        if (!active) return []
        const elapsed = Math.max(60, differenceInSeconds(new Date(), parseISO(active.startedAt)))
        const completed: WorkoutSession = {
          ...active,
          status: 'completed',
          endedAt: new Date().toISOString(),
          durationSec: clamp(elapsed, 60, 4 * 60 * 60),
          volume: setVolume(active),
          totalReps: active.exercises.reduce(
            (sum, item) => sum + item.sets.filter((set) => set.completed).reduce((r, set) => r + set.reps, 0),
            0,
          ),
        }
        const sessions = [completed, ...state.sessions.filter((session) => session.id !== active.id)]
        const prs = derivePRs(sessions, state.prs)
        const next: AppState = { ...state, sessions, prs, activeSessionId: null }
        const unlocked = checkNewAchievements(next)
        set({ ...next, achievements: [...state.achievements, ...unlocked] })
        return unlocked
      },

      cancelWorkout: () => {
        const state = get()
        if (!state.activeSessionId) return
        set({
          sessions: state.sessions.filter((session) => session.id !== state.activeSessionId),
          activeSessionId: null,
        })
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

      updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),

      importState: (incoming) => {
        set({
          profile: incoming.profile,
          exercises: incoming.exercises,
          favorites: incoming.favorites,
          routines: incoming.routines,
          sessions: incoming.sessions,
          prs: incoming.prs,
          achievements: incoming.achievements,
          activeSessionId: incoming.activeSessionId ?? null,
          streakFreezes: incoming.streakFreezes ?? 0,
        })
      },

      resetToSeed: () => set(createSeedState()),
      clearAllData: () => {
        const state = get()
        set({
          sessions: state.sessions.filter((session) => session.status === 'active'),
          prs: [],
          achievements: [],
          activeSessionId: null,
          streakFreezes: 0,
        })
      },
    }),
    {
      name: 'gymix-store-v1',
      version: 1,
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
      }),
    },
  ),
)
