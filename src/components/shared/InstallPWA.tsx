"use client"

import { useState, useEffect } from "react"
import { Download, CheckCircle } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed,       setInstalled]      = useState(false)
  const [success,         setSuccess]        = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // App déjà installée en mode standalone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setSuccess(true)
      setDeferredPrompt(null)
      setTimeout(() => setSuccess(false), 4000)
    }
  }

  if (installed || !deferredPrompt) return null

  if (success) return (
    <div className="flex items-center gap-2 text-xs text-[#4CAF87]">
      <CheckCircle className="h-4 w-4" />
      Mobile Clinic installé avec succès !
    </div>
  )

  return (
    <button onClick={install}
      className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2.5 font-montserrat text-xs font-medium text-[#AAAAAA] transition-all hover:border-[rgba(200,144,106,0.3)] hover:text-[#C8906A]"
    >
      <Download className="h-3.5 w-3.5" />
      📱 Installer l&apos;application
    </button>
  )
}
