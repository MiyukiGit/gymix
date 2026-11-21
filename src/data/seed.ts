import { format, subDays } from 'date-fns'
import type { AppState, Equipment, Exercise, Routine, SetEntry, UserProfile, WorkoutExercise, WorkoutSession } from '../types'
import { checkNewAchievements } from '../lib/achievements'
import { isTimedExercise, recomputeSession } from '../lib/metrics'
import { rebuildPRs } from '../lib/stats'
import { parseDurationSec, uid } from '../lib/utils'
import { exercises, exerciseById } from './exercises'
import { builtInRoutines } from './routines'

const defaultProfile: UserProfile = {
  name: 'Alex Morgan',
  avatarColor: '#c6f36a',
  age: 28,
  heightCm: 178,
  weightKg: 76.5,
  experience: 'Intermediate',
  goal: 'Body recomposition',
  preferredDays: [1, 2, 4, 5, 6],
  unit: 'kg',
  restBetweenSets: 90,
  weeklyTarget: 5,
  joinDate: subDays(new Date(), 140).toISOString(),
}

const baseWeight = (exercise: Exercise): number => {
  const name = exercise.name.toLowerCase()
  if (exercise.equipment === 'Bodyweight' || exercise.equipment === 'Treadmill' || exercise.equipment === 'Bike' || exercise.equipment === 'Rower' || exercise.equipment === 'Stairmaster' || exercise.equipment === 'Elliptical') return 0
  const heavy: Record<string, number> = {
    'barbell back squat': 90,
    'front squat': 72.5,
    deadlift: 120,
    'sumo deadlift': 115,
    'barbell bench press': 67.5,
    'incline barbell bench press': 55,
    'standing barbell shoulder press': 45,
    'barbell bent-over row': 62.5,
    't-bar row': 55,
    'hip thrust': 92.5,
    'romanian deadlift': 77.5,
    'close-grip bench press': 55,
    'leg press': 150,
    'smith machine squat': 70,
  }
  if (heavy[name]) return heavy[name]
  const map: Record<Equipment, number> = {
    Barbell: 40,
    Dumbbell: 18,
    Machine: 52,
    Cable: 32,
    Bodyweight: 0,
    'Resistance Band': 0,
    'Smith Machine': 45,
    Kettlebell: 20,
    'EZ Bar': 30,
    TRX: 0,
    'Medicine Ball': 6,
    Treadmill: 0,
    Bike: 0,
    Rower: 0,
    Stairmaster: 0,
    Elliptical: 0,
    Other: 0,
  }
  return map[exercise.equipment]
}

const parseReps = (prescription: string) => {
  if (prescription.includes('sec')) return 45
  if (prescription.includes('min')) return 20
  const match = prescription.match(/\d+/)
  return match ? Number(match[0]) : 10
}

const roundTo = (value: number, increment: number) => Math.round(value / increment) * increment

const hash = (value: string) => {
  let total = 0
  for (let i = 0; i < value.length; i += 1) total = (total * 31 + value.charCodeAt(i)) >>> 0
  return total
}

const buildSession = (date: Date, routine: Routine, sessionIndex: number): WorkoutSession => {
  const weekIndex = Math.floor(sessionIndex / 5)
  const progression = 1 + weekIndex * 0.014
  const duration = 38 * 60 + routine.exercises.length * 3.5 * 60 + ((sessionIndex * 7) % 12) * 60

  const builtExercises: WorkoutExercise[] = []
  routine.exercises.forEach((prescription, exerciseIndex) => {
    const exercise = exerciseById(prescription.exerciseId)
    if (!exercise) return
    const seed = hash(`${format(date, 'yyyy-MM-dd')}_${exercise.id}`)
    const variation = ((seed % 7) - 3) * 0.012
    const base = baseWeight(exercise)
    const weight = base === 0 ? 0 : roundTo(Math.max(2.5, base * progression * (1 + variation)), 2.5)
    const targetReps = parseReps(prescription.reps)
    const timed = isTimedExercise(exercise)
    const durationSec = timed ? parseDurationSec(prescription.reps) : undefined
    const sets: SetEntry[] = Array.from({ length: prescription.sets }, (_, setIndex) => {
      const repDrop = setIndex >= 2 && seed % 3 === 0 ? 1 : 0
      const setDuration = durationSec ? durationSec + ((seed + setIndex * 5) % 4) * 15 : undefined
      return {
        id: `set_${sessionIndex}_${exerciseIndex}_${setIndex}`,
        weight: setIndex === prescription.sets - 1 && seed % 5 === 0 ? roundTo(weight * 0.95, 2.5) : weight,
        reps: timed ? 1 : Math.max(3, targetReps - repDrop + (setIndex === 0 && seed % 4 === 0 ? 1 : 0)),
        completed: true,
        durationSec: setDuration,
        rpe: 7 + ((seed + setIndex) % 3),
        previous: {
          weight: roundTo(weight * 0.96, 2.5),
          reps: timed ? 1 : Math.max(3, targetReps - 1),
          durationSec: setDuration ? Math.max(1, setDuration - 15) : undefined,
          rpe: 7 + ((seed + setIndex) % 2),
        },
      }
    })
    builtExercises.push({ id: `we_${sessionIndex}_${exerciseIndex}`, exerciseId: exercise.id, sets, notes: '' })
  })

  const session: WorkoutSession = {
    id: `seed_session_${format(date, 'yyyy-MM-dd')}_${routine.id}`,
    name: routine.name,
    templateId: routine.id,
    date: `${format(date, 'yyyy-MM-dd')}T18:00:00`,
    startedAt: `${format(date, 'yyyy-MM-dd')}T17:55:00`,
    endedAt: `${format(date, 'yyyy-MM-dd')}T${format(new Date(new Date().setHours(0, 0, 0, 0) + duration * 1000), 'HH:mm:ss')}`,
    durationSec: Math.round(duration),
    status: 'completed',
    exercises: builtExercises,
    notes: exerciseIndexNote(sessionIndex),
    volume: 0,
    totalReps: 0,
    activeSec: 0,
    prIds: [],
  }
  return recomputeSession(session, exercises, defaultProfile)
}

const exerciseIndexNote = (index: number) => {
  const notes = ['Felt strong today. Sleep was solid.', 'Good pump, kept rest periods tight.', 'Focused on controlled negatives.', 'Slight fatigue but hit all targets.', '', 'PR energy — progression is trending up.']
  return notes[index % notes.length]
}

export const createSeedState = (): AppState => {
  const routines: Routine[] = [
    ...builtInRoutines,
    {
      id: 'custom-home-pump',
      name: 'Home Pump',
      type: 'Custom',
      description: 'A quick bodyweight session you can do anywhere.',
      accent: '#f4b860',
      isCustom: true,
      exercises: [
        { exerciseId: 'push-up', sets: 3, reps: '12-20', restSec: 60 },
        { exerciseId: 'goblet-squat', sets: 3, reps: '12-15', restSec: 60 },
        { exerciseId: 'dumbbell-row', sets: 3, reps: '10-12', restSec: 60 },
        { exerciseId: 'plank', sets: 3, reps: '45 sec', restSec: 45 },
      ],
    },
  ]

  const skippedOffsets = new Set([7, 18, 29, 43, 57, 70])
  const sessions: WorkoutSession[] = []
  const templates = builtInRoutines.filter((routine) => routine.id !== 'custom-workout')
  let sessionIndex = 0

  for (let daysAgo = 83; daysAgo >= 1; daysAgo -= 1) {
    const date = subDays(new Date(), daysAgo)
    if (!defaultProfile.preferredDays.includes(date.getDay())) continue
    if (skippedOffsets.has(daysAgo)) continue
    const routine = templates[sessionIndex % templates.length]
    sessions.push(buildSession(date, routine, sessionIndex))
    sessionIndex += 1
  }

  // An occasional second session keeps the history realistic.
  const doubleDate = subDays(new Date(), 24)
  if (defaultProfile.preferredDays.includes(doubleDate.getDay())) {
    sessions.push(buildSession(doubleDate, templates[6], sessionIndex + 100))
  }

  const sorted = sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const prData = rebuildPRs(sorted, exercises, defaultProfile)
  const sessionsWithPRs = sorted.map((session) => ({
    ...session,
    prIds: prData.prIdsBySession[session.id] ?? [],
  }))
  const state: AppState = {
    profile: defaultProfile,
    exercises,
    favorites: ['barbell-bench-press', 'lat-pulldown', 'barbell-back-squat', 'dumbbell-lateral-raise', 'hip-thrust'],
    routines,
    sessions: sessionsWithPRs,
    prs: prData.records,
    achievements: [],
    activeSessionId: null,
    streakFreezes: 2,
    restTimer: null,
  }
  state.achievements = checkNewAchievements(state)
  return state
}

export const emptyState = (profile = defaultProfile): AppState => ({
  profile,
  exercises,
  favorites: [],
  routines: builtInRoutines,
  sessions: [],
  prs: [],
  achievements: [],
  activeSessionId: null,
  streakFreezes: 0,
  restTimer: null,
})
