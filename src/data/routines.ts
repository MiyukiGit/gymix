import type { Routine, RoutineExercise } from '../types'
import { exercises } from './exercises'

const byName = (name: string) => exercises.find((exercise) => exercise.name === name)?.id ?? name

const rx = (name: string, sets?: number, reps?: string, restSec = 90): RoutineExercise => {
  const exercise = exercises.find((item) => item.name === name)
  return {
    exerciseId: byName(name),
    sets: sets ?? exercise?.sets ?? 3,
    reps: reps ?? exercise?.reps ?? '10-12',
    restSec,
  }
}

export const builtInRoutines: Routine[] = [
  {
    id: 'push-day',
    name: 'Push Day',
    type: 'Push',
    description: 'Chest, shoulders and triceps with a balanced pressing volume.',
    accent: '#c6f36a',
    exercises: [
      rx('Barbell Bench Press', 4, '6-10', 150),
      rx('Incline Dumbbell Press', 3, '8-12', 120),
      rx('Standing Barbell Shoulder Press', 3, '8-10', 120),
      rx('Dumbbell Lateral Raise', 3, '12-15', 60),
      rx('Rope Pushdown', 3, '12-15', 60),
      rx('Overhead Tricep Extension', 3, '10-12', 60),
    ],
  },
  {
    id: 'pull-day',
    name: 'Pull Day',
    type: 'Pull',
    description: 'Back thickness, lat width, rear delts and biceps.',
    accent: '#8edb78',
    exercises: [
      rx('Deadlift', 3, '3-6', 180),
      rx('Lat Pulldown', 3, '10-12', 90),
      rx('Barbell Bent-Over Row', 4, '8-10', 120),
      rx('Seated Cable Row', 3, '10-12', 90),
      rx('Face Pull', 3, '15-20', 60),
      rx('Barbell Curl', 3, '8-12', 75),
    ],
  },
  {
    id: 'leg-day',
    name: 'Leg Day',
    type: 'Legs',
    description: 'Compound lower-body strength with hamstring and calf work.',
    accent: '#f4b860',
    exercises: [
      rx('Barbell Back Squat', 4, '5-8', 180),
      rx('Romanian Deadlift', 4, '8-10', 150),
      rx('Leg Press', 3, '10-15', 120),
      rx('Leg Extension', 3, '12-15', 60),
      rx('Lying Leg Curl', 3, '10-15', 60),
      rx('Standing Calf Raise', 4, '12-20', 60),
    ],
  },
  {
    id: 'upper-body',
    name: 'Upper Body',
    type: 'Upper',
    description: 'Balanced horizontal and vertical pushing and pulling.',
    accent: '#a9d94f',
    exercises: [
      rx('Barbell Bench Press', 3, '8-10', 150),
      rx('Lat Pulldown', 3, '10-12', 90),
      rx('Seated Dumbbell Shoulder Press', 3, '8-12', 90),
      rx('Dumbbell Row', 3, '10-12', 90),
      rx('Dumbbell Lateral Raise', 3, '12-15', 60),
      rx('Hammer Curl', 3, '10-12', 60),
      rx('Tricep Pushdown', 3, '10-15', 60),
    ],
  },
  {
    id: 'lower-body',
    name: 'Lower Body',
    type: 'Lower',
    description: 'Hips, quads, hamstrings and stability in one session.',
    accent: '#8edb78',
    exercises: [
      rx('Hip Thrust', 4, '8-12', 120),
      rx('Front Squat', 3, '6-8', 150),
      rx('Bulgarian Split Squat', 3, '8-10', 90),
      rx('Seated Leg Curl', 3, '10-15', 60),
      rx('Standing Calf Raise', 4, '12-20', 60),
      rx('Plank', 3, '45 sec', 60),
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    type: 'Full Body',
    description: 'Efficient total-body session built around big compounds.',
    accent: '#c6f36a',
    exercises: [
      rx('Barbell Back Squat', 3, '8-10', 150),
      rx('Barbell Bench Press', 3, '8-10', 120),
      rx('Barbell Bent-Over Row', 3, '8-10', 120),
      rx('Dumbbell Lateral Raise', 2, '12-15', 60),
      rx('Romanian Deadlift', 2, '10-12', 90),
      rx('Cable Crunch', 3, '12-15', 60),
    ],
  },
  {
    id: 'chest-triceps',
    name: 'Chest & Triceps',
    type: 'Chest / Triceps',
    description: 'High-volume pressing and isolation for push strength.',
    accent: '#f4b860',
    exercises: [
      rx('Incline Barbell Bench Press', 4, '8-10', 120),
      rx('Dumbbell Bench Press', 3, '8-12', 90),
      rx('Cable Fly', 3, '12-15', 60),
      rx('Close-Grip Bench Press', 3, '8-10', 120),
      rx('Skull Crusher', 3, '10-12', 75),
      rx('Rope Pushdown', 3, '12-15', 60),
    ],
  },
  {
    id: 'back-biceps',
    name: 'Back & Biceps',
    type: 'Back / Biceps',
    description: 'Lat focus, back thickness and complete arm flexion work.',
    accent: '#8edb78',
    exercises: [
      rx('Pull-up', 3, '5-10', 120),
      rx('T-Bar Row', 4, '8-10', 120),
      rx('Straight-Arm Pulldown', 3, '12-15', 75),
      rx('Chest-Supported Row', 3, '10-12', 90),
      rx('Preacher Curl', 3, '8-12', 75),
      rx('Hammer Curl', 3, '10-12', 60),
    ],
  },
  {
    id: 'shoulders-arms',
    name: 'Shoulders & Arms',
    type: 'Shoulders',
    description: 'All three deltoid heads with balanced biceps and triceps.',
    accent: '#a9d94f',
    exercises: [
      rx('Seated Dumbbell Shoulder Press', 4, '8-12', 90),
      rx('Cable Lateral Raise', 3, '12-15', 60),
      rx('Reverse Pec Deck', 3, '12-20', 60),
      rx('Arnold Press', 3, '8-12', 90),
      rx('Barbell Curl', 3, '8-12', 75),
      rx('Rope Pushdown', 3, '12-15', 60),
    ],
  },
  {
    id: 'custom-workout',
    name: 'Custom Workout',
    type: 'Custom',
    description: 'Start from an empty session and build it your way.',
    accent: '#92978f',
    exercises: [],
  },
]

export const routineById = (id: string, custom: Routine[] = []) =>
  builtInRoutines.find((routine) => routine.id === id) ?? custom.find((routine) => routine.id === id)
