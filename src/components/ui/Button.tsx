import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-[#11140f] font-bold hover:bg-accent-soft shadow-[0_10px_30px_-16px_rgba(198,243,106,0.85)]',
  secondary: 'bg-card-2 text-text border border-border hover:border-accent/40 hover:bg-card',
  ghost: 'text-muted hover:text-text hover:bg-white/5',
  outline: 'border border-border text-text hover:border-accent/50 hover:bg-accent/5',
  danger: 'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-sm rounded-2xl gap-2',
  icon: 'h-9 w-9 rounded-xl justify-center',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.97] disabled:active:scale-100',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
)

Button.displayName = 'Button'
