import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays, Clock3, Dumbbell, Flame, Play, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import type { AppState, TabId } from '../types'
import { useAppStore } from '../store/useAppStore'
import { getStats, getWeeklyActivity, getPRList } from '../lib/stats'
import { achievementDefs, achievementProgress } from '../lib/achievements'
import { cn, formatCompact, formatDuration, formatDate, greeting, relativeDate } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Card, SectionHeader } from '../components/ui/Card'
import { ProgressBar, StatTile } from '../components/ui/Misc'
import { WeeklyBars } from '../components/charts/Charts'
import { useToast } from '../components/ui/Toast'

const dayRoutine: Record<number, string> = {
  1: 'push-day',
  2: 'pull-day',
  3: 'leg-day',
  4: 'upper-body',
  5: 'leg-day',
  6: 'full-body',
  0: 'full-body',
}

const quotes = [
  'The work you do in the dark shows up in the light.',
  'Consistency beats intensity. Show up again.',
  'Strong bodies are built one set at a time.',
  'Your future self is watching every rep.',
]

export const HomeScreen = ({ onNavigate }: { onNavigate: (tab: TabId) => void }) => {
  const { toast } = useToast()
  const profile = useAppStore((state) => state.profile)
  const sessions = useAppStore((state) => state.sessions)
  const routines = useAppStore((state) => state.routines)
  const achievements = useAppStore((state) => state.achievements)
  const activeSessionId = useAppStore((state) => state.activeSessionId)
  const startWorkout = useAppStore((state) => state.startWorkout)
  const activeSession = sessions.find((session) => session.id === activeSessionId)

  const stats = getStats(sessions, profile)
  const weekly = getWeeklyActivity(sessions, 7)
  const recent = sessions.filter((session) => session.status === 'completed').slice(0, 4)
  const prs = getPRList(sessions, profile.unit)
  const scheduled = routines.find((routine) => routine.id === dayRoutine[new Date().getDay()]) ?? routines[0]
  const quote = quotes[new Date().getDate() % quotes.length]
  const appState = { profile, sessions, prs, achievements } as unknown as AppState
  const nextAchievement = achievementDefs
    .filter((def) => !achievements.some((unlocked) => unlocked.id === def.id))
    .map((def) => ({ def, ...achievementProgress(def, appState) }))
    .sort((a, b) => b.ratio - a.ratio)[0]

  const handleStart = () => {
    startWorkout(scheduled?.id)
    toast('Workout started', 'success', `${scheduled?.name ?? 'Custom'} is ready. Let’s get it.`)
    onNavigate('workout')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{format(new Date(), 'EEEE, MMMM d')}</p>
          <h1 className="mt-2 text-display text-3xl font-semibold text-text sm:text-4xl">
            {greeting()}, <span className="text-accent">{profile.name.split(' ')[0]}</span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Target size={15} className="text-accent" />
            {profile.goal} · {profile.experience} lifter
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 py-2 pl-2 pr-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-[#11140f]" style={{ background: profile.avatarColor }}>
            {profile.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="text-xs font-semibold text-text">{profile.name}</p>
            <p className="text-[11px] text-muted">Member since {formatDate(profile.joinDate, 'MMM yyyy')}</p>
          </div>
        </div>
      </section>

      {activeSession && (
        <button
          onClick={() => onNavigate('workout')}
          className="flex w-full items-center gap-3 rounded-2xl border border-accent/35 bg-accent/[0.07] px-4 py-3 text-left transition hover:bg-accent/[0.11]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-[#11140f]">
            <Play size={18} fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text">Workout in progress</p>
            <p className="text-xs text-muted">{activeSession.name} · {activeSession.exercises.length} exercises logged</p>
          </div>
          <ArrowRight size={18} className="text-accent" />
        </button>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-accent/25 bg-gradient-to-br from-accent/[0.11] via-card to-card lg:col-span-2">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">Today’s plan</span>
                  <span className="text-[11px] text-muted">{scheduled?.type ?? 'Custom'}</span>
                </div>
                <h2 className="text-display text-2xl font-semibold text-text sm:text-3xl">{scheduled?.name ?? 'Custom Workout'}</h2>
                <p className="mt-2 max-w-md text-sm text-muted">{scheduled?.description ?? 'Build your own session.'}</p>
              </div>
              <div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent sm:flex">
                <Dumbbell size={28} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="flex items-center gap-2 text-xs text-muted"><Dumbbell size={15} className="text-accent" /> {scheduled?.exercises.length ?? 0} exercises</span>
              <span className="flex items-center gap-2 text-xs text-muted"><Clock3 size={15} className="text-accent" /> ~{Math.max(25, (scheduled?.exercises.length ?? 4) * 8)} min</span>
              <Button size="lg" onClick={handleStart} disabled={!!activeSession} className="ml-auto">
                <Play size={16} fill="currentColor" /> {activeSession ? 'Continue workout' : 'Start workout'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Current streak</span>
            <Flame size={18} className="text-warning" />
          </div>
          <div className="mt-4 flex items-end gap-2">
            <motion.span key={stats.currentStreak} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-display text-5xl font-semibold text-text">
              {stats.currentStreak}
            </motion.span>
            <span className="mb-2 text-sm text-muted">days</span>
          </div>
          <p className="mt-2 text-xs text-muted">Best: {stats.longestStreak} days · {stats.consistency}% monthly consistency</p>
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-[11px] text-muted"><span>Weekly target</span><span className="font-semibold text-text">{stats.weeklyFrequency}/{profile.weeklyTarget}</span></div>
            <ProgressBar value={(stats.weeklyFrequency / Math.max(1, profile.weeklyTarget)) * 100} />
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={Flame} label="Active days" value={String(stats.activeDays)} hint="All-time consistency" accent />
        <StatTile icon={Dumbbell} label="Workouts" value={String(stats.totalWorkouts)} hint="Sessions completed" />
        <StatTile icon={TrendingUp} label="Total volume" value={formatCompact(stats.totalVolume)} suffix={profile.unit} hint="All lifts combined" />
        <StatTile icon={Clock3} label="Training time" value={formatDuration(stats.totalTime)} hint="Hours in the gym" />
        <StatTile icon={CalendarDays} label="This week" value={String(stats.weeklyFrequency)} suffix="sessions" hint="Last 7 days" accent />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionHeader
            title="Weekly activity"
            subtitle="Your training rhythm over the last seven days"
            action={<button onClick={() => onNavigate('progress')} className="text-xs font-semibold text-accent hover:underline">View analytics</button>}
          />
          <WeeklyBars data={weekly} />
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted">
            <span>{weekly.filter((day) => day.active).length} active days</span>
            <span>{formatCompact(weekly.reduce((sum, day) => sum + day.volume, 0))} {profile.unit} moved</span>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionHeader title="Recent workouts" subtitle="Your latest sessions" />
          <div className="space-y-2">
            {recent.length === 0 && <p className="py-8 text-center text-sm text-muted">No workouts yet. Start your first session above.</p>}
            {recent.map((session, index) => (
              <motion.button
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onNavigate('progress')}
                className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-bg/40 p-3 text-left transition hover:border-accent/30 hover:bg-bg/70"
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', index === 0 ? 'bg-accent/15 text-accent' : 'bg-card-2 text-muted')}>
                  <Dumbbell size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{session.name}</p>
                  <p className="text-[11px] text-muted">{relativeDate(session.date)} · {session.exercises.length} exercises</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-text">{formatDuration(session.durationSec)}</p>
                  <p className="text-[10px] text-muted">{formatCompact(session.volume)} {profile.unit}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-accent/20 lg:col-span-2">
          <Sparkles size={18} className="text-accent" />
          <p className="mt-4 text-lg font-medium leading-snug text-text sm:text-xl">“{quote}”</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2 text-xs text-muted"><Trophy size={15} className="text-warning" /> {achievements.length} achievements unlocked</div>
            {prs[0] && <div className="flex items-center gap-2 text-xs text-muted"><TrendingUp size={15} className="text-accent" /> Latest PR: {prs[0].exerciseName} · {prs[0].displayValue}</div>}
          </div>
        </Card>
        <Card>
          <SectionHeader title="Next milestone" subtitle="Almost there" />
          {nextAchievement ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text">{nextAchievement.def.name}</p>
                <span className="text-xs font-semibold text-accent">{Math.round(nextAchievement.ratio * 100)}%</span>
              </div>
              <p className="mt-1 text-xs text-muted">{nextAchievement.def.description}</p>
              <div className="mt-4"><ProgressBar value={nextAchievement.ratio * 100} /></div>
              <p className="mt-2 text-[11px] text-muted">{nextAchievement.value} / {nextAchievement.target}</p>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted">All milestones unlocked. Legendary.</p>
          )}
        </Card>
      </section>
    </motion.div>
  )
}
