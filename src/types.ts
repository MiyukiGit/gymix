export type TabId = 'home' | 'workout' | 'muscles' | 'progress' | 'profile'

export type MuscleId =
  | 'chest'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'traps'
  | 'upper_back'
  | 'lats'
  | 'lower_back'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'adductors'
  | 'abductors'
  | 'upper_abs'
  | 'lower_abs'
  | 'obliques'

export type ExerciseCategory =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Legs'
  | 'Core'
  | 'Cardio'
  | 'Full Body'
  | 'Functional'

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Bodyweight'
  | 'Resistance Band'
  | 'Smith Machine'
  | 'Kettlebell'
  | 'EZ Bar'
  | 'TRX'
  | 'Medicine Ball'
  | 'Treadmill'
  | 'Bike'
  | 'Rower'
  | 'Stairmaster'
  | 'Elliptical'
  | 'Other'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type WeightUnit = 'kg' | 'lb'
export type Goal = 'Fat loss' | 'Muscle building' | 'Strength' | 'General fitness' | 'Endurance' | 'Body recomposition'
export type Experience = 'Beginner' | 'Intermediate' | 'Advanced'

export interface MuscleInfo {
  id: MuscleId
  name: string
  region: 'Upper body' | 'Lower body' | 'Core'
  view: 'front' | 'back' | 'both'
  description: string
}

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  primary: MuscleId[]
  secondary: MuscleId[]
  equipment: Equipment
  difficulty: Difficulty
  instructions: string[]
  formTips: string[]
  sets: number
  reps: string
  tags: string[]
  illustration: string
  isCustom?: boolean
}

export interface SetEntry {
  id: string
  weight: number
  reps: number
  completed: boolean
  previous?: { weight: number; reps: number }
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  sets: SetEntry[]
  notes?: string
}

export interface WorkoutSession {
  id: string
  name: string
  templateId?: string
  date: string
  startedAt: string
  endedAt?: string
  durationSec: number
  status: 'active' | 'completed'
  exercises: WorkoutExercise[]
  notes?: string
  volume: number
  totalReps: number
  prIds: string[]
}

export interface RoutineExercise {
  exerciseId: string
  sets: number
  reps: string
  restSec: number
}

export interface Routine {
  id: string
  name: string
  type: string
  description: string
  exercises: RoutineExercise[]
  isCustom?: boolean
  accent?: string
}

export interface PersonalRecord {
  id: string
  exerciseId: string
  type: 'weight' | 'reps' | 'e1rm' | 'volume'
  value: number
  reps?: number
  date: string
  sessionId: string
}

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
  target: number
  stat: 'workouts' | 'streak' | 'prs' | 'volume' | 'consistency'
}

export interface UnlockedAchievement {
  id: string
  unlockedAt: string
}

export interface UserProfile {
  name: string
  avatarColor: string
  age: number
  heightCm: number
  weightKg: number
  experience: Experience
  goal: Goal
  preferredDays: number[]
  unit: WeightUnit
  restBetweenSets: number
  weeklyTarget: number
  joinDate: string
}

export interface AppState {
  profile: UserProfile
  exercises: Exercise[]
  favorites: string[]
  routines: Routine[]
  sessions: WorkoutSession[]
  prs: PersonalRecord[]
  achievements: UnlockedAchievement[]
  activeSessionId: string | null
  streakFreezes: number
}
