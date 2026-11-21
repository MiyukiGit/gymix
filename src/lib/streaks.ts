import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, subDays } from 'date-fns'
import type { UserProfile, WorkoutSession } from '../types'
import { dateKey } from './utils'

export interface StreakInfo {
  current: number
  longest: number
  activeDays: number
  lastActiveDate: string | null
  consistency: number
  scheduledDays: number
  completedScheduledDays: number
  missedScheduledDays: number
}

const activeDates = (sessions: WorkoutSession[]) => {
  const keys = new Set<string>()
  sessions.forEach((session) => {
    if (session.status === 'completed') keys.add(dateKey(session.date))
  })
  return keys
}

const isScheduled = (date: Date, profile: UserProfile) => profile.preferredDays.includes(date.getDay())

export const getStreakInfo = (sessions: WorkoutSession[], profile: UserProfile): StreakInfo => {
  const active = activeDates(sessions)
  const today = startOfDay(new Date())
  const dates = Array.from(active)
    .map((key) => parseISO(key))
    .sort((a, b) => a.getTime() - b.getTime())
  const earliest = dates[0] ?? today

  let longest = 0
  let run = 0
  let cursor = earliest <= today ? earliest : today
  while (cursor <= today) {
    const key = format(cursor, 'yyyy-MM-dd')
    if (active.has(key)) {
      run += 1
      longest = Math.max(longest, run)
    } else if (!isScheduled(cursor, profile)) {
      // Planned recovery: keeps the streak alive without adding a day.
    } else {
      run = 0
    }
    cursor = addDays(cursor, 1)
  }

  let current = 0
  let backward = today
  const todayKey = format(today, 'yyyy-MM-dd')

  // Give today a grace period — a scheduled workout is not "missed" until the day ends.
  if (!active.has(todayKey)) backward = subDays(today, 1)

  const maxSteps = 730
  for (let step = 0; step < maxSteps; step += 1) {
    if (backward < earliest) break
    const key = format(backward, 'yyyy-MM-dd')
    if (active.has(key)) {
      current += 1
    } else if (!isScheduled(backward, profile)) {
      // Rest day: skip without breaking.
    } else {
      break
    }
    backward = subDays(backward, 1)
  }

  const lastActiveDate = dates.length ? format(dates[dates.length - 1], 'yyyy-MM-dd') : null

  let scheduledDays = 0
  let completedScheduledDays = 0
  for (let i = 29; i >= 0; i -= 1) {
    const day = subDays(today, i)
    if (!isScheduled(day, profile)) continue
    scheduledDays += 1
    if (active.has(format(day, 'yyyy-MM-dd'))) completedScheduledDays += 1
  }

  const consistency = scheduledDays ? Math.round((completedScheduledDays / scheduledDays) * 100) : 0

  return {
    current,
    longest: Math.max(longest, current),
    activeDays: active.size,
    lastActiveDate,
    consistency,
    scheduledDays,
    completedScheduledDays,
    missedScheduledDays: scheduledDays - completedScheduledDays,
  }
}

export const daysSinceLastWorkout = (sessions: WorkoutSession[]) => {
  const dates = sessions
    .filter((session) => session.status === 'completed')
    .map((session) => parseISO(dateKey(session.date)))
    .sort((a, b) => b.getTime() - a.getTime())
  if (!dates.length) return null
  return differenceInCalendarDays(startOfDay(new Date()), startOfDay(dates[0]))
}
