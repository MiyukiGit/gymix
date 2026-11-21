import { Award, CalendarDays, Crown, Dumbbell, Flame, Lock, Target, Trophy, Zap } from 'lucide-react'
import { cn } from '../../lib/utils'

const icons = { dumbbell: Dumbbell, flame: Flame, crown: Crown, target: Target, trophy: Trophy, zap: Zap, barbell: Dumbbell, calendar: CalendarDays }

export const AchievementBadge = ({ icon, unlocked, size = 'md' }: { icon: string; unlocked: boolean; size?: 'sm' | 'md' }) => {
  const Icon = icons[icon as keyof typeof icons] ?? Award
  return <div className={cn('relative flex items-center justify-center rounded-2xl border', size === 'sm' ? 'h-10 w-10' : 'h-12 w-12', unlocked ? 'border-accent/50 bg-accent/[0.12] text-accent shadow-[0_0_24px_rgba(198,243,106,0.12)]' : 'border-border bg-card-2 text-muted')}>
    {unlocked ? <Icon size={size === 'sm' ? 17 : 21} /> : <Lock size={size === 'sm' ? 15 : 17} />}
    {unlocked && <span className="absolute inset-1 rounded-xl border border-accent/20" />}
  </div>
}
