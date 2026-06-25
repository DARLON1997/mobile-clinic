"use client"

import { useEffect, useState } from "react"

export type Platform = "ios" | "android" | "other"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window {
    // Variable globale remplie par le script inline de layout.tsx avant l'hydratation
    __pwa_dip: BeforeInstallPromptEvent | null
  }
}

export interface InstallPromptState {
  platform:        Platform
  hasNativePrompt: boolean   // true = bouton natif dispo, false = guide manuel
  canInstall:      boolean
  isInstalled:     boolean
  isDismissed:     boolean
  triggerInstall:  () => Promise<void>
  dismiss:         () => void
}

const STORAGE_KEY  = "pwa-install-dismissed-until"
const DISMISS_DAYS = 30

export function useInstallPrompt(): InstallPromptState {
  const [platform, setPlatform]             = useState<Platform>("other")
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [isDismissed, setIsDismissed]       = useState(false)

  useEffect(() => {
    // App déjà installée → rien à faire
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Vérifier le dismiss persistent
    const until = localStorage.getItem(STORAGE_KEY)
    if (until && Date.now() < Number(until)) {
      setIsDismissed(true)
    }

    const ua = navigator.userAgent

    // ── iOS Safari ──────────────────────────────────────────────────────────────
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isSafariIOS = isIOS && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
    if (isSafariIOS) {
      setPlatform("ios")
      return
    }

    // ── Android Chrome / Samsung Internet ───────────────────────────────────────
    // On détecte Android dès maintenant — on n'attend pas beforeinstallprompt
    // car l'événement a peut-être déjà été capturé par le script inline.
    const isAndroid = /android/i.test(ua)
    const isMobileChrome =
      isAndroid && (/chrome/i.test(ua) || /samsungbrowser/i.test(ua))

    if (!isMobileChrome) return

    setPlatform("android")

    // Lire la capture précoce du script layout.tsx
    if (window.__pwa_dip) {
      setDeferredPrompt(window.__pwa_dip)
      window.__pwa_dip = null
    }

    // Continuer à écouter au cas où l'événement arrive après le mount
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
    }
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") setIsInstalled(true)
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(STORAGE_KEY, String(until))
    setIsDismissed(true)
  }

  // Android sans prompt natif → on affiche quand même le guide manuel
  const canInstall =
    !isInstalled &&
    !isDismissed &&
    (platform === "ios" || platform === "android")

  return {
    platform,
    hasNativePrompt: deferredPrompt !== null,
    canInstall,
    isInstalled,
    isDismissed,
    triggerInstall,
    dismiss,
  }
}
