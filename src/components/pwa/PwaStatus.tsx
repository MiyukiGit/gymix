import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, CloudOff, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/Button'

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

const isTextEntryFocused = () => {
  const element = document.activeElement as HTMLElement | null
  if (!element) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable
}

export const PwaStatus = () => {
  const activeSessionId = useAppStore((state) => state.activeSessionId)
  const [offline, setOffline] = useState(() => (typeof navigator === 'undefined' ? false : !navigator.onLine))
  const [textEntryFocused, setTextEntryFocused] = useState(false)
  const [applying, setApplying] = useState(false)
  const updateStarted = useRef(false)
  const updateTimer = useRef<number | undefined>(undefined)

  const checkForUpdates = useCallback(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {})
  }, [])

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_scriptUrl, registration) => {
      if (!registration) return
      if (updateTimer.current) window.clearInterval(updateTimer.current)
      // This timer only runs while GYMIX is open; iOS controls background wakes.
      updateTimer.current = window.setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL)
    },
    onRegisterError: (error) => console.warn('[GYMIX] Service worker registration failed:', error),
  })

  useEffect(() => {
    const handleOffline = () => setOffline(true)
    const handleOnline = () => {
      setOffline(false)
      checkForUpdates()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdates()
    }
    const handleFocusIn = () => setTextEntryFocused(isTextEntryFocused())
    const handleFocusOut = () => window.setTimeout(() => setTextEntryFocused(isTextEntryFocused()), 0)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      if (updateTimer.current) window.clearInterval(updateTimer.current)
    }
  }, [checkForUpdates])

  useEffect(() => {
    if (!offlineReady) return
    const timer = window.setTimeout(() => setOfflineReady(false), 5000)
    return () => window.clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  const updateDeferred = Boolean(activeSessionId) || textEntryFocused

  const applyUpdate = useCallback(async () => {
    if (updateStarted.current) return
    // Re-check at click time so a workout or input opened after render cannot be interrupted.
    if (useAppStore.getState().activeSessionId || isTextEntryFocused()) return

    updateStarted.current = true
    setApplying(true)
    setNeedRefresh(false)

    try {
      await updateServiceWorker(true)
    } catch (error) {
      console.warn('[GYMIX] Update could not be applied:', error)
      setNeedRefresh(true)
    } finally {
      updateStarted.current = false
      setApplying(false)
    }
  }, [setNeedRefresh, updateServiceWorker])

  const postponeUpdate = useCallback(() => setNeedRefresh(false), [setNeedRefresh])

  return (
    <>
      <AnimatePresence>
        {offline && !needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="pointer-events-none fixed inset-x-0 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-[180] flex justify-center px-4 sm:bottom-[calc(10.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-warning/30 bg-[#2a2418]/95 px-4 py-2 text-xs font-semibold text-warning shadow-2xl backdrop-blur-xl" role="status">
              <CloudOff size={14} className="shrink-0" />
              <span className="truncate">Offline — saved workouts and cached screens are available.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {offlineReady && !needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[185] flex justify-center px-4 sm:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
          >
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-accent/30 bg-[#232a1d]/95 px-4 py-2 text-xs font-semibold text-accent shadow-2xl backdrop-blur-xl" role="status">
              <CheckCircle2 size={14} />
              Offline ready — GYMIX can open without a connection.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[190] flex justify-center px-4 sm:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
          >
            <div className="w-full max-w-md rounded-3xl border border-accent/30 bg-surface/95 p-4 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl" role="alertdialog" aria-live="polite" aria-label="GYMIX update available">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <RefreshCw size={18} className={applying ? 'animate-spin' : ''} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text">GYMIX update ready</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {updateDeferred
                      ? 'Finish your workout or close the keyboard, then update. Your training data stays on this device.'
                      : 'A new version is downloaded and ready. Update when you’re ready.'}
                  </p>
                </div>
                <button onClick={postponeUpdate} className="rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-text" aria-label="Postpone update">
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" fullWidth onClick={postponeUpdate}>
                  Later
                </Button>
                <Button size="sm" fullWidth disabled={updateDeferred || applying} onClick={() => void applyUpdate()}>
                  {applying ? 'Updating…' : 'Update now'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
