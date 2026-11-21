import { clsx, type ClassValue } from 'clsx'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { WeightUnit } from '../types'

export const cn = (...inputs: ClassValue[]) => clsx(inputs)

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export const formatNumber = (value: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(value)

export const formatCompact = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

export const formatDuration = (seconds: number) => {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export const formatTimer = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const dateKey = (date: Date | string) => format(typeof date === 'string' ? parseISO(date) : date, 'yyyy-MM-dd')

export const formatDate = (date: Date | string, pattern = 'MMM d, yyyy') =>
  format(typeof date === 'string' ? parseISO(date) : date, pattern)

export const relativeDate = (date: string) => formatDistanceToNow(parseISO(date), { addSuffix: true })

export const today = () => new Date()

export const toDisplayWeight = (kg: number, unit: WeightUnit) => (unit === 'kg' ? kg : kg * 2.20462)

export const fromDisplayWeight = (value: number, unit: WeightUnit) => (unit === 'kg' ? value : value / 2.20462)

export const formatWeight = (kg: number, unit: WeightUnit, decimals = 1) =>
  `${round(toDisplayWeight(kg, unit), decimals).toFixed(decimals)} ${unit}`

export const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'GY'

export const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Still grinding'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export const rangeDates = (days: number) => {
  const result: Date[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - i)
    result.push(date)
  }
  return result
}

export const handleError = (error: unknown) => {
  console.error(error)
  return error instanceof Error ? error.message : 'Something went wrong'
}
