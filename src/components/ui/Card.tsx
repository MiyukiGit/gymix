import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
  interactive?: boolean
}

export const Card = ({ children, className, padded = true, interactive, ...props }: CardProps) => (
  <div
    className={cn(
      'glass-card rounded-2xl',
      padded && 'p-5',
      interactive && 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)

export const SectionHeader = ({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) => (
  <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
    <div>
      <h2 className="text-display text-lg font-semibold text-text sm:text-xl">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-muted sm:text-sm">{subtitle}</p>}
    </div>
    {action}
  </div>
)
