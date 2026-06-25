"use client"

import { useEffect, useState } from "react"

type Platform = "ios" | "android" | "other"

interface InstallPromptState {
  platform:      Platform
  canInstall:    boolean
  isInstalled:   boolean
  isDismissed:   boolean
  triggerInstall: () => Promise<void>
  dismiss:        () => void
}

const STORAGE_KEY    = "pwa-install-dismissed-until"
const DISMISS_DAYS   = 30

// BeforeInstallPromptEvent n'est pas dans les types DOM standards
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function useInstallPrompt(): InstallPromptState {
  const [platform, setPlatform]           = useState<Platform>("other")
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled]     = useState(false)
  const [isDismissed, setIsDismissed]     = useState(false)

  useEffect(() => {
    // Déjà installée (mode standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Vérifier si l'utilisateur a déjà dismissé récemment
    const until = localStorage.getItem(STORAGE_KEY)
    if (until && Date.now() < Number(until)) {
      setIsDismissed(true)
    }

    // Détection plateforme
    const ua    = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    // Sur iOS, Safari sans "CriOS" (Chrome iOS) ni "FxiOS" (Firefox iOS)
    const isSafariIOS = isIOS && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)

    if (isSafariIOS) {
      setPlatform("ios")
    }

    // Android : intercepter beforeinstallprompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setPlatform("android")
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    // Détecter si l'app vient d'être installée
    window.addEventListener("appinstalled", () => setIsInstalled(true))

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

  const canInstall =
    !isInstalled &&
    !isDismissed &&
    (platform === "ios" || (platform === "android" && deferredPrompt !== null))

  return { platform, canInstall, isInstalled, isDismissed, triggerInstall, dismiss }
}
