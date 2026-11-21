import { useEffect, useRef } from 'react'
import { playRestChime, unlockRestAudio } from '../lib/restAudio'
import { useAppStore } from '../store/useAppStore'
import { useToast } from './ui/Toast'

/** Keeps rest-timer notifications alive across workout sub-tabs and screens. */
export const RestTimerWatcher = () => {
  const restTimer = useAppStore((state) => state.restTimer)
  const { toast } = useToast()
  const notifiedEnd = useRef<number | null>(null)

  // iOS only permits Web Audio after a real user gesture.
  useEffect(() => {
    const unlock = () => unlockRestAudio()
    document.addEventListener('pointerdown', unlock, { passive: true })
    document.addEventListener('touchstart', unlock, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  useEffect(() => {
    const check = () => {
      if (!restTimer || restTimer.endsAt > Date.now()) return
      if (notifiedEnd.current === restTimer.endsAt) return
      notifiedEnd.current = restTimer.endsAt
      playRestChime()
      try {
        navigator.vibrate?.([80, 50, 80])
      } catch {
        // Some browsers block vibration without a recent user gesture.
      }
      toast('Rest complete', 'info', 'Ready for the next set.')
    }

    check()
    const interval = window.setInterval(check, 1000)
    const refresh = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [restTimer, toast])

  return null
}
