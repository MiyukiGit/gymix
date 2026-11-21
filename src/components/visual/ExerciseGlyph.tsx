import type { Exercise } from '../../types'
import { cn } from '../../lib/utils'

const glyphFor = (equipment: Exercise['equipment'], category: Exercise['category']) => {
  if (category === 'Cardio') return 'cardio'
  if (equipment === 'Bodyweight' || equipment === 'TRX' || equipment === 'Resistance Band') return 'bodyweight'
  if (equipment === 'Barbell' || equipment === 'EZ Bar' || equipment === 'Smith Machine') return 'barbell'
  if (equipment === 'Dumbbell' || equipment === 'Kettlebell') return 'dumbbell'
  if (equipment === 'Cable' || equipment === 'Machine') return 'machine'
  return 'functional'
}

const movementFor = (exercise: Exercise) => {
  const n = exercise.name.toLowerCase()
  if (n.includes('curl')) return 'curl'
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg press')) return 'squat'
  if (n.includes('pulldown') || n.includes('pull-up') || n.includes('row')) return 'pull'
  if (n.includes('bench') || n.includes('push-up') || n.includes('press')) return 'press'
  if (n.includes('deadlift') || n.includes('hinge')) return 'hinge'
  return 'neutral'
}

export const ExerciseGlyph = ({ exercise, className }: { exercise: Exercise; className?: string }) => {
  const type = glyphFor(exercise.equipment, exercise.category)
  const movement = movementFor(exercise)
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#252a24] to-[#1a1d1a]', className)}>
      <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
      <svg viewBox="0 0 120 100" className="relative h-full w-full max-h-24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <g className="text-accent" strokeWidth="3">
          {movement === 'curl' && <><circle cx="60" cy="25" r="7" /><path d="M60 33v27M60 42l-20 15M60 42l20 15M40 57l-2 24M80 57l2 24M40 58l-16-13M80 58l16-13" /><path d="M23 45h-12M97 45h12" /></>}
          {movement === 'squat' && <><circle cx="60" cy="20" r="7" /><path d="M60 28v26M60 36l-22 14M60 36l22 14M60 54l-22 25M60 54l22 25M38 79l-12 0M82 79l12 0" /><path d="M20 42h80" opacity=".7" /></>}
          {movement === 'pull' && <><circle cx="60" cy="35" r="7" /><path d="M60 43v28M60 50l-23-12M60 50l23-12M60 70l-17 18M60 70l17 18M30 18h60" /><path d="M37 38L30 18M83 38l7-20" opacity=".7" /></>}
          {movement === 'press' && <><circle cx="36" cy="38" r="7" /><path d="M43 45l28 12M53 49l-10 25M53 49l15-22M43 75l-15 10M43 75l17 5M68 27h32M68 23v8M96 23v8" /><path d="M72 57l22-18" opacity=".7" /></>}
          {movement === 'hinge' && <><circle cx="43" cy="30" r="7" /><path d="M48 37l28 18M48 42l-25 10M76 55l-11 27M76 55l22 17M65 82H50M98 72h12M20 62h88" /><path d="M18 58h94" opacity=".7" /></>}
          {type === 'barbell' && (
            <>
              <path d="M22 50h76" strokeWidth="4" />
              <rect x="12" y="38" width="9" height="24" rx="2" />
              <rect x="21" y="41" width="6" height="18" rx="2" />
              <rect x="99" y="38" width="9" height="24" rx="2" />
              <rect x="93" y="41" width="6" height="18" rx="2" />
              <path d="M46 63v16M74 63v16M46 79h28" strokeWidth="2.5" opacity="0.55" />
            </>
          )}
          {type === 'dumbbell' && (
            <>
              <path d="M45 50h30" strokeWidth="4" />
              <rect x="28" y="36" width="16" height="28" rx="5" />
              <rect x="18" y="41" width="10" height="18" rx="4" />
              <rect x="76" y="36" width="16" height="28" rx="5" />
              <rect x="92" y="41" width="10" height="18" rx="4" />
              <path d="M60 76v10M50 86h20" strokeWidth="2" opacity="0.4" />
            </>
          )}
          {type === 'machine' && (
            <>
              <path d="M32 82h56M40 82V28h40v54" strokeWidth="2.5" />
              <path d="M40 42h40M52 42v18M68 42v18" />
              <circle cx="60" cy="64" r="8" strokeWidth="2.5" />
              <path d="M30 24h60" strokeWidth="2" opacity="0.45" />
            </>
          )}
          {type === 'bodyweight' && (
            <>
              <circle cx="34" cy="34" r="8" strokeWidth="2.5" />
              <path d="M42 40l24 12M66 52l18-10M44 44l10 22-14 12M54 66l20 8" strokeWidth="3" />
              <path d="M20 80h84" strokeWidth="2" opacity="0.4" />
            </>
          )}
          {type === 'cardio' && (
            <>
              <circle cx="36" cy="68" r="10" strokeWidth="2.5" />
              <circle cx="84" cy="68" r="10" strokeWidth="2.5" />
              <path d="M36 68h48M84 68V34h-16M68 34l-14 16M46 34h14" strokeWidth="3" />
              <circle cx="54" cy="28" r="6" strokeWidth="2.5" />
            </>
          )}
          {type === 'functional' && (
            <>
              <circle cx="60" cy="26" r="7" strokeWidth="2.5" />
              <path d="M60 33v26M60 40L40 54M60 40l20 14M60 59l-12 22M60 59l12 22" strokeWidth="3" />
              <path d="M24 84h72" strokeWidth="2" opacity="0.4" />
            </>
          )}
        </g>
      </svg>
    </div>
  )
}
