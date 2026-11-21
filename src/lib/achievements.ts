import type { AchievementDef, AppState } from '../types'
import { getStats } from './stats'

export type UnlockedAchievementDef = AchievementDef & { unlockedAt: string }

export const achievementDefs: AchievementDef[] = [
  { id: 'first-workout', name: 'First Workout', description: 'Complete your very first session.', icon: 'dumbbell', target: 1, stat: 'workouts' },
  { id: 'streak-3', name: '3-Day Streak', description: 'Train three days in a row.', icon: 'flame', target: 3, stat: 'streak' },
  { id: 'streak-7', name: '7-Day Streak', description: 'Keep a seven-day training streak alive.', icon: 'flame', target: 7, stat: 'streak' },
  { id: 'streak-14', name: '14-Day Streak', description: 'Two full weeks without missing a session.', icon: 'flame', target: 14, stat: 'streak' },
  { id: 'streak-30', name: '30-Day Streak', description: 'A month of relentless consistency.', icon: 'crown', target: 30, stat: 'streak' },
  { id: 'workouts-50', name: '50 Workouts', description: 'Log fifty completed workouts.', icon: 'target', target: 50, stat: 'workouts' },
  { id: 'workouts-100', name: '100 Workouts', description: 'Log one hundred completed workouts.', icon: 'trophy', target: 100, stat: 'workouts' },
  { id: 'first-pr', name: 'First Personal Record', description: 'Set your first documented PR.', icon: 'zap', target: 1, stat: 'prs' },
  { id: 'volume-10000', name: '10,000 Club', description: 'Move 10,000 kg-equivalents of total training volume.', icon: 'barbell', target: 10000, stat: 'volume' },
  { id: 'consistency', name: 'Consistency Champion', description: 'Hit 90% of your planned sessions.', icon: 'calendar', target: 90, stat: 'consistency' },
]

export const achievementProgress = (def: AchievementDef, state: AppState) => {
  const stats = getStats(state.sessions, state.profile, 3650, state.exercises)
  const value =
    def.stat === 'workouts'
      ? stats.totalWorkouts
      : def.stat === 'streak'
        ? Math.max(stats.currentStreak, stats.longestStreak)
        : def.stat === 'prs'
          ? state.prs.length
          : def.stat === 'volume'
            ? stats.totalVolume
            : stats.consistency
  return { value: Math.min(value, def.target), target: def.target, ratio: Math.min(1, value / def.target) }
}

export const checkNewAchievements = (state: AppState): UnlockedAchievementDef[] => {
  const unlocked = new Set(state.achievements.map((item) => item.id))
  return achievementDefs
    .filter((def) => !unlocked.has(def.id) && achievementProgress(def, state).ratio >= 1)
    .map((def) => ({ ...def, unlockedAt: new Date().toISOString() }))
}
