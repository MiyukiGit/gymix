import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'
import { Modal } from './Modal'

export { Modal } from './Modal'
export { SectionHeader } from './Card'

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  compact,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: string
  onAction?: () => void
  compact?: boolean
}) => (
  <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14')}>
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-accent">
      <Icon size={24} />
    </div>
    <p className="text-base font-semibold text-text">{title}</p>
    <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
    {action && onAction && (
      <Button className="mt-5" variant="secondary" onClick={onAction}>
        {action}
      </Button>
    )}
  </div>
)

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton rounded-xl', className)} />

export const ProgressBar = ({ value, color = '#c6f36a', className }: { value: number; color?: string; className?: string }) => (
  <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}>
    <motion.div
      className="h-full rounded-full"
      style={{ background: color }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    />
  </div>
)

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}) => (
  <div className={cn('inline-flex items-center gap-1 rounded-xl border border-border bg-bg/60 p-1', className)}>
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          'relative rounded-lg font-semibold transition-colors',
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
          value === option.value ? 'text-[#11140f]' : 'text-muted hover:text-text',
        )}
      >
        {value === option.value && (
          <motion.span
            layoutId={`segmented-${options.map((opt) => opt.value).join('-')}`}
            className="absolute inset-0 rounded-lg bg-accent"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10">{option.label}</span>
      </button>
    ))}
  </div>
)

export const StatTile = ({
  label,
  value,
  suffix,
  icon: Icon,
  hint,
  accent,
}: {
  label: string
  value: string
  suffix?: string
  icon: LucideIcon
  hint?: string
  accent?: boolean
}) => (
  <div className={cn('rounded-2xl border border-border bg-card/70 p-4', accent && 'border-accent/30 bg-accent/[0.04]')}>
    <div className="flex items-start justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <Icon size={16} className={accent ? 'text-accent' : 'text-muted'} />
    </div>
    <div className="mt-3 flex items-baseline gap-1.5">
      <span className="text-display text-2xl font-semibold text-text">{value}</span>
      {suffix && <span className="text-xs font-medium text-muted">{suffix}</span>}
    </div>
    {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
  </div>
)

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <p className="text-sm leading-relaxed text-muted">{description}</p>
    <div className="mt-6 flex gap-3">
      <Button variant="secondary" fullWidth onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="danger"
        fullWidth
        onClick={() => {
          onConfirm()
          onClose()
        }}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
)

export const PageIntro = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>}
      <h1 className="text-display text-3xl font-semibold text-text sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>}
    </div>
    {action}
  </div>
)
