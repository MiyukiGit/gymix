import { motion } from 'framer-motion'
import { Award, CalendarDays, Check, Crown, Download, Dumbbell, Flame, FlameKindling, Lock, RotateCcw, Save, ShieldCheck, Sparkles, Target, Trash2, Upload, Zap } from 'lucide-react'
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, Experience, Goal, UserProfile, WeightUnit } from '../types'
import { useAppStore } from '../store/useAppStore'
import { achievementDefs, achievementProgress } from '../lib/achievements'
import { getStats } from '../lib/stats'
import { cn, dateKey, formatDate, formatVolume, fromDisplayWeight, getInitials, round, toDisplayWeight } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { ConfirmDialog, ProgressBar } from '../components/ui/Misc'
import { useToast } from '../components/ui/Toast'
import { AchievementBadge } from '../components/visual/AchievementBadge'

const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const goals: Goal[] = ['Fat loss', 'Muscle building', 'Strength', 'General fitness', 'Endurance', 'Body recomposition']
const experiences: Experience[] = ['Beginner', 'Intermediate', 'Advanced']
const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const achievementIcons: Record<string, typeof Award> = {
  dumbbell: Dumbbell,
  flame: Flame,
  crown: Crown,
  target: Target,
  trophy: Award,
  zap: Zap,
  barbell: Dumbbell,
  calendar: CalendarDays,
}

export const ProfileScreen = () => {
  const { toast } = useToast()
  const profile = useAppStore((state) => state.profile)
  const sessions = useAppStore((state) => state.sessions)
  const exercises = useAppStore((state) => state.exercises)
  const prs = useAppStore((state) => state.prs)
  const achievements = useAppStore((state) => state.achievements)
  const updateProfile = useAppStore((state) => state.updateProfile)
  const importState = useAppStore((state) => state.importState)
  const resetToSeed = useAppStore((state) => state.resetToSeed)
  const clearAllData = useAppStore((state) => state.clearAllData)
  const fileRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<UserProfile>(profile)
  const [month, setMonth] = useState(new Date())
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => setDraft(profile), [profile])

  const stats = useMemo(() => getStats(sessions, profile, 3650, exercises), [sessions, profile, exercises])
  const appState = { profile, sessions, exercises, prs, achievements } as unknown as AppState

  const activeDates = useMemo(() => new Set(sessions.filter((session) => session.status === 'completed').map((session) => dateKey(session.date))), [sessions])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month))
    const end = endOfWeek(endOfMonth(month))
    return eachDayOfInterval({ start, end }).map((date) => {
      const key = dateKey(date)
      const active = activeDates.has(key)
      const scheduled = profile.preferredDays.includes(date.getDay())
      const past = date < new Date() && !isToday(date)
      return { date, key, active, scheduled, past, missed: past && scheduled && !active, rest: !scheduled }
    })
  }, [month, activeDates, profile.preferredDays])

  const toggleDay = (day: number) => {
    const days = draft.preferredDays.includes(day) ? draft.preferredDays.filter((item) => item !== day) : [...draft.preferredDays, day]
    setDraft({ ...draft, preferredDays: days.sort((a, b) => a - b) })
  }

  const saveProfile = () => {
    updateProfile(draft)
    toast('Profile saved', 'success', 'Your settings are updated everywhere.')
  }

  const exportData = () => {
    const state = useAppStore.getState()
    const payload: AppState = {
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
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gymix-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast('Backup exported', 'success', 'Your GYMIX data is saved as a JSON file.')
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState
        if (!parsed.profile || !Array.isArray(parsed.sessions)) throw new Error('Invalid backup')
        importState(parsed)
        toast('Data imported', 'success', 'Your GYMIX backup has been restored.')
      } catch {
        toast('Import failed', 'error', 'That file is not a valid GYMIX backup.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <Card className="relative overflow-hidden border-accent/20 bg-gradient-to-br from-accent/[0.09] via-card to-card">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-bg text-2xl font-bold text-[#11140f]" style={{ background: profile.avatarColor }}>{getInitials(profile.name)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Your profile</p>
            <h1 className="text-display mt-1 text-2xl font-semibold text-text sm:text-3xl">{profile.name}</h1>
            <p className="mt-1 text-sm text-muted">{profile.goal} · {profile.experience} · Training since {formatDate(profile.joinDate, 'MMM yyyy')}</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <div><p className="text-display text-2xl font-semibold text-text">{stats.totalWorkouts}</p><p className="text-[11px] text-muted">Workouts</p></div>
            <div><p className="text-display text-2xl font-semibold text-warning">{stats.currentStreak}</p><p className="text-[11px] text-muted">Streak</p></div>
            <div><p className="text-display text-2xl font-semibold text-accent">{formatVolume(stats.totalVolume, profile.unit)}</p><p className="text-[11px] text-muted">Total volume</p></div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Personal details" subtitle="Your metrics and training preferences" action={<Button size="sm" onClick={saveProfile}><Save size={14} /> Save</Button>} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Display name</label><input className="field" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
            <div><label className="label">Avatar color</label><div className="flex gap-2">{['#c6f36a', '#8edb78', '#f4b860', '#a9d94f', '#d9a5f3', '#7fc9b5'].map((color) => <button key={color} onClick={() => setDraft({ ...draft, avatarColor: color })} className={cn('h-8 w-8 rounded-full border-2 transition', draft.avatarColor === color ? 'border-text scale-110' : 'border-transparent')} style={{ background: color }} aria-label={`Choose ${color}`} />)}</div></div>
            <div><label className="label">Weight unit</label><div className="flex gap-2">{(['kg', 'lb'] as WeightUnit[]).map((unit) => <button key={unit} onClick={() => setDraft({ ...draft, unit })} className={cn('flex-1 rounded-xl border py-2 text-xs font-semibold transition', draft.unit === unit ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:text-text')}>{unit.toUpperCase()}</button>)}</div></div>
            <div><label className="label">Age</label><input className="field" type="number" min="10" max="100" value={draft.age} onChange={(event) => setDraft({ ...draft, age: Number(event.target.value) })} /></div>
            <div><label className="label">Height (cm)</label><input className="field" type="number" min="100" max="250" value={draft.heightCm} onChange={(event) => setDraft({ ...draft, heightCm: Number(event.target.value) })} /></div>
            <div>
              <label className="label">Bodyweight ({draft.unit})</label>
              <input
                className="field"
                type="number"
                min={draft.unit === 'kg' ? 30 : 66}
                max={draft.unit === 'kg' ? 300 : 660}
                step="0.1"
                value={round(toDisplayWeight(draft.weightKg, draft.unit), 1)}
                onChange={(event) => setDraft({ ...draft, weightKg: fromDisplayWeight(Number(event.target.value), draft.unit) })}
              />
            </div>
            <div><label className="label">Weekly target</label><input className="field" type="number" min="1" max="7" value={draft.weeklyTarget} onChange={(event) => setDraft({ ...draft, weeklyTarget: Number(event.target.value) })} /></div>
          </div>
          <div className="mt-4"><label className="label">Experience</label><div className="flex flex-wrap gap-2">{experiences.map((item) => <button key={item} onClick={() => setDraft({ ...draft, experience: item })} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition', draft.experience === item ? 'border-accent bg-accent text-[#11140f]' : 'border-border text-muted hover:text-text')}>{item}</button>)}</div></div>
          <div className="mt-4"><label className="label">Fitness goal</label><div className="flex flex-wrap gap-2">{goals.map((item) => <button key={item} onClick={() => setDraft({ ...draft, goal: item })} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition', draft.goal === item ? 'border-accent bg-accent text-[#11140f]' : 'border-border text-muted hover:text-text')}>{item}</button>)}</div></div>
          <div className="mt-4"><label className="label">Preferred training days</label><div className="flex flex-wrap gap-2">{weekDayLabels.map((label, day) => <button key={label} onClick={() => toggleDay(day)} className={cn('flex h-9 w-12 items-center justify-center rounded-xl border text-xs font-semibold transition', draft.preferredDays.includes(day) ? 'border-accent bg-accent text-[#11140f]' : 'border-border text-muted hover:text-text')}>{label}</button>)}</div></div>
          <div className="mt-4"><label className="label">Default rest between sets (seconds)</label><input className="field max-w-xs" type="number" min="30" step="15" value={draft.restBetweenSets} onChange={(event) => setDraft({ ...draft, restBetweenSets: Number(event.target.value) })} /></div>
        </Card>

        <Card>
          <SectionHeader
            title="Consistency calendar"
            subtitle={`${format(month, 'MMMM yyyy')} · ${stats.completedScheduledDays}/${stats.scheduledDays} planned sessions hit`}
            action={<div className="flex gap-1"><button className="rounded-lg border border-border p-1.5 text-xs text-muted hover:text-text" onClick={() => setMonth(subMonths(month, 1))}>‹</button><button className="rounded-lg border border-border p-1.5 text-xs text-muted hover:text-text" onClick={() => setMonth(new Date())}>Today</button></div>}
          />
          <div className="grid grid-cols-7 gap-1.5">
            {dayNames.map((label, index) => <div key={index} className="pb-1 text-center text-[10px] font-bold uppercase text-muted">{label}</div>)}
            {calendarDays.map((day) => (
              <div
                key={day.key}
                title={`${format(day.date, 'EEEE, MMM d')} — ${day.active ? 'Workout completed' : day.missed ? 'Missed planned session' : day.rest ? 'Rest day' : 'Planned'}`}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg border text-[11px] font-semibold transition',
                  !isSameMonth(day.date, month) && 'opacity-25',
                  day.active ? 'border-accent bg-accent text-[#11140f]' : day.missed ? 'border-danger/30 bg-danger/10 text-danger' : day.rest ? 'border-border/50 bg-bg/30 text-muted/60' : 'border-border bg-card text-muted',
                  isToday(day.date) && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                )}
              >
                {format(day.date, 'd')}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-border/60 pt-3 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-accent" /> Workout</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-bg" /> Planned</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-danger/40" /> Missed</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-border" /> Rest</span>
          </div>
          <div className="mt-5 rounded-2xl border border-border bg-bg/40 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-text"><ShieldCheck size={15} className="text-accent" /> Streak policy</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">A completed workout adds one active day. Multiple sessions on the same day count once. Days outside your preferred schedule are planned recovery and keep your streak alive without adding a day. A missed scheduled day resets the current streak. Today gets a grace period until it ends.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-bg/40 p-3"><Flame size={14} className="text-warning" /><p className="mt-2 text-display text-lg font-semibold text-text">{stats.currentStreak}</p><p className="text-[10px] text-muted">Current</p></div>
            <div className="rounded-xl border border-border bg-bg/40 p-3"><Crown size={14} className="text-accent" /><p className="mt-2 text-display text-lg font-semibold text-text">{stats.longestStreak}</p><p className="text-[10px] text-muted">Longest</p></div>
            <div className="rounded-xl border border-border bg-bg/40 p-3"><FlameKindling size={14} className="text-muted" /><p className="mt-2 text-display text-lg font-semibold text-text">{stats.activeDays}</p><p className="text-[10px] text-muted">Active days</p></div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Achievements" subtitle="Unlock milestones as you build consistency" action={<span className="text-xs text-muted">{achievements.length}/{achievementDefs.length} unlocked</span>} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {achievementDefs.map((def) => {
            const unlocked = achievements.some((item) => item.id === def.id)
            const progress = achievementProgress(def, appState)
            const Icon = achievementIcons[def.icon] ?? Award
            return (
              <motion.div key={def.id} whileHover={{ y: -3 }} className={cn('relative rounded-2xl border p-4 text-center', unlocked ? 'border-accent/40 bg-accent/[0.06]' : 'border-border bg-bg/40')}>
                {unlocked && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[#11140f]"><Check size={12} strokeWidth={3} /></span>}
                <div className="mx-auto"><AchievementBadge icon={def.icon} unlocked={unlocked} /></div>
                <p className="mt-3 text-xs font-semibold text-text">{def.name}</p>
                <p className="mt-1 min-h-8 text-[10px] leading-relaxed text-muted">{def.description}</p>
                <div className="mt-3"><ProgressBar value={progress.ratio * 100} color={unlocked ? '#c6f36a' : '#92978f'} /></div>
                <p className="mt-1.5 text-[10px] text-muted">{Math.round(progress.value)} / {progress.target}</p>
              </motion.div>
            )
          })}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Data & backup" subtitle="Your data stays on this device and can be exported anytime" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Button variant="secondary" onClick={exportData}><Download size={16} /> Export backup</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import backup</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) importData(file); event.target.value = '' }} />
          <Button variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> Reset demo data</Button>
          <Button variant="danger" onClick={() => setConfirmClear(true)}><Trash2 size={16} /> Clear workout data</Button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-bg/40 p-3 text-[11px] leading-relaxed text-muted">
          <Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />
          GYMIX persists your workouts, routines, PRs, achievements and settings in this browser. Export a backup before clearing browser storage or switching devices.
        </div>
      </Card>

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={() => { resetToSeed(); toast('Demo data restored', 'success') }} title="Reset to demo data?" description="This replaces all current workouts, PRs and settings with the original sample data. Export a backup first if you want to keep your progress." confirmLabel="Reset" />
      <ConfirmDialog open={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={() => { clearAllData(); toast('Workout data cleared', 'info') }} title="Clear workout data?" description="All completed sessions, PRs and achievements will be removed. Your profile and exercise library are kept." confirmLabel="Clear data" />
    </motion.div>
  )
}
