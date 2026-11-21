let audioContext: AudioContext | null = null

/** iOS only allows audio after a user gesture; call this from the rest button. */
export const unlockRestAudio = () => {
  if (typeof window === 'undefined') return
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  try {
    if (!audioContext) audioContext = new Ctor()
    if (audioContext.state === 'suspended') void audioContext.resume()
  } catch {
    audioContext = null
  }
}

/** Short, gentle chime that works while the PWA is in the foreground or locked but alive. */
export const playRestChime = () => {
  if (!audioContext) unlockRestAudio()
  if (!audioContext) return
  if (audioContext.state === 'suspended') void audioContext.resume()
  if (audioContext.state !== 'running') return
  const now = audioContext.currentTime
  const notes = [660, 880, 990]

  notes.forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator()
    const gain = audioContext!.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    const start = now + index * 0.12
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.16, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)
    oscillator.connect(gain)
    gain.connect(audioContext!.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.24)
  })
}
