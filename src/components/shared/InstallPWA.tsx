"use client"

import { useState } from "react"
import { Download, CheckCircle } from "lucide-react"
import { useInstallPrompt } from "@/hooks/useInstallPrompt"

/**
 * Bouton d'installation compact pour le pied de page public (Footer.tsx).
 * Détection déléguée à useInstallPrompt — même source de vérité que la
 * bannière du dashboard (InstallBanner.tsx), pour ne plus dupliquer la
 * capture de `beforeinstallprompt` (audit M6). Android + prompt natif
 * uniquement, comme avant : pas de guide iOS ici, ce composant reste un
 * simple lien de pied de page, pas une bannière.
 */
export function InstallPWA() {
  const { hasNativePrompt, isInstalled, triggerInstall } = useInstallPrompt()
  const [success, setSuccess] = useState(false)

  async function handleInstall() {
    const outcome = await triggerInstall()
    if (outcome === "accepted") {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    }
  }

  if (isInstalled || !hasNativePrompt) return null

  if (success) return (
    <div className="flex items-center gap-2 text-xs text-[#4CAF87]">
      <CheckCircle className="h-4 w-4" />
      Mobile Clinic installé avec succès !
    </div>
  )

  return (
    <button onClick={handleInstall}
      className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-4 py-2.5 font-montserrat text-xs font-medium text-[#AAAAAA] transition-all hover:border-[rgba(200,144,106,0.3)] hover:text-[#C8906A]"
    >
      <Download className="h-3.5 w-3.5" />
      📱 Installer l&apos;application
    </button>
  )
}
