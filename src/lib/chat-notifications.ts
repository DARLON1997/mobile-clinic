let _audioCtx: AudioContext | null = null

export function playNotificationSound() {
  try {
    if (typeof window === "undefined") return
    if (!_audioCtx) _audioCtx = new AudioContext()
    const ctx = _audioCtx
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
  } catch {
    // navigateur bloqué — silencieux
  }
}

export async function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission === "default") {
    await Notification.requestPermission().catch(() => {})
  }
  if (Notification.permission !== "granted") return
  try {
    const n = new Notification(title, { body, icon: "/icon.png" })
    setTimeout(() => n.close(), 5000)
  } catch { /* ignore */ }
}
