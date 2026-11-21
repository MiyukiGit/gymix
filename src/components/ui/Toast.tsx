import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, Sparkles, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn, uid } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'info' | 'achievement'
interface ToastItem {
  id: string
  message: string
  description?: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, description?: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  achievement: Sparkles,
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), [])

  const toast = useCallback(
    (message: string, type: ToastType = 'success', description?: string) => {
      const id = uid('toast')
      setItems((current) => [...current.slice(-3), { id, message, type, description }])
      window.setTimeout(() => remove(id), type === 'achievement' ? 5200 : 3400)
    },
    [remove],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-6 sm:items-end">
        <AnimatePresence>
          {items.map((item) => {
            const Icon = icons[item.type]
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -18, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.95 }}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl',
                  item.type === 'achievement'
                    ? 'border-accent/40 bg-[#232a1d]/95'
                    : item.type === 'error'
                      ? 'border-danger/35 bg-[#2a1d1d]/95'
                      : 'border-border bg-surface/95',
                )}
              >
                <Icon size={18} className={cn('mt-0.5 shrink-0', item.type === 'error' ? 'text-danger' : 'text-accent')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text">{item.message}</p>
                  {item.description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>}
                </div>
                <button className="text-muted transition hover:text-text" onClick={() => remove(item.id)} aria-label="Dismiss">
                  <X size={15} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
