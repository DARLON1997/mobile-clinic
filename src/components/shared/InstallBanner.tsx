"use client"

import { useState } from "react"
import { X, Download, Share, MoreVertical } from "lucide-react"
import { useInstallPrompt } from "@/hooks/useInstallPrompt"

export function InstallBanner() {
  const { platform, hasNativePrompt, canInstall, triggerInstall, dismiss } = useInstallPrompt()
  const [installing, setInstalling] = useState(false)

  if (!canInstall) return null

  const handleInstall = async () => {
    setInstalling(true)
    await triggerInstall()
    setInstalling(false)
  }

  return (
    <div
      role="banner"
      aria-label="Installer l'application"
      style={{
        background:   "linear-gradient(135deg, rgba(200,144,106,0.12), rgba(200,144,106,0.04))",
        borderBottom: "1px solid rgba(200,144,106,0.25)",
        padding:      "12px 20px",
      }}
    >
      {platform === "android" ? (
        hasNativePrompt ? (
          <AndroidNativePrompt
            onInstall={handleInstall}
            onDismiss={dismiss}
            loading={installing}
          />
        ) : (
          <AndroidManualGuide onDismiss={dismiss} />
        )
      ) : (
        <IOSGuide onDismiss={dismiss} />
      )}
    </div>
  )
}

/* ─── Android — prompt natif ────────────────────────────────── */

function AndroidNativePrompt({
  onInstall,
  onDismiss,
  loading,
}: {
  onInstall: () => void
  onDismiss: () => void
  loading:   boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <AppIcon />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white leading-tight">Installer Mobile Clinic</p>
        <p className="text-[11px] leading-tight" style={{ color: "#888" }}>
          Accès rapide depuis votre écran d'accueil
        </p>
      </div>
      <button
        onClick={onInstall}
        disabled={loading}
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-60"
        style={{ background: "rgba(200,144,106,0.2)", border: "1px solid rgba(200,144,106,0.5)", color: "#C8906A" }}
      >
        <Download className="h-3.5 w-3.5" />
        {loading ? "…" : "Installer"}
      </button>
      <DismissButton onDismiss={onDismiss} />
    </div>
  )
}

/* ─── Android — guide manuel (Chrome menu) ──────────────────── */

function AndroidManualGuide({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-3">
        <AppIcon />
        <button onClick={() => setExpanded(v => !v)} className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-semibold text-white leading-tight">
            Installer Mobile Clinic
          </p>
          <p className="text-[11px]" style={{ color: "#C8906A" }}>
            {expanded ? "Masquer ▲" : "Comment faire ▼"}
          </p>
        </button>
        <DismissButton onDismiss={onDismiss} />
      </div>

      {expanded && (
        <Steps>
          <Step n={1} icon={<MoreVertical className="h-4 w-4" />}>
            Appuie sur les{" "}
            <span className="font-semibold text-white">3 points ⋮</span>{" "}
            en haut à droite de Chrome
          </Step>
          <Step n={2} icon={<Download className="h-4 w-4" />}>
            Appuie sur{" "}
            <span className="font-semibold text-white">
              « Ajouter à l'écran d'accueil »
            </span>
          </Step>
          <Step n={3} icon={<Download className="h-4 w-4" />}>
            Appuie sur{" "}
            <span className="font-semibold text-white">Ajouter</span>{" "}
            pour confirmer
          </Step>
        </Steps>
      )}
    </div>
  )
}

/* ─── iOS — guide Safari ────────────────────────────────────── */

function IOSGuide({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-3">
        <AppIcon />
        <button onClick={() => setExpanded(v => !v)} className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-semibold text-white leading-tight">
            Installer Mobile Clinic sur votre iPhone
          </p>
          <p className="text-[11px]" style={{ color: "#C8906A" }}>
            {expanded ? "Masquer ▲" : "Voir comment faire ▼"}
          </p>
        </button>
        <DismissButton onDismiss={onDismiss} />
      </div>

      {expanded && (
        <Steps>
          <Step n={1} icon={<Share className="h-4 w-4" />}>
            Appuie sur le bouton{" "}
            <span className="font-semibold text-white">Partager</span>{" "}
            <span style={{ color: "#C8906A" }}>
              (rectangle avec flèche ↑ en bas de Safari)
            </span>
          </Step>
          <Step n={2} icon={<MoreVertical className="h-4 w-4" />}>
            Fais défiler et appuie sur{" "}
            <span className="font-semibold text-white">« Sur l'écran d'accueil »</span>
          </Step>
          <Step n={3} icon={<Download className="h-4 w-4" />}>
            Appuie sur{" "}
            <span className="font-semibold text-white">Ajouter</span>{" "}
            — l'icône apparaît comme une vraie app
          </Step>
        </Steps>
      )}
    </div>
  )
}

/* ─── Sous-composants partagés ──────────────────────────────── */

function AppIcon() {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ background: "rgba(200,144,106,0.15)", border: "1px solid rgba(200,144,106,0.3)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pwa/icon-192x192.png" alt="" className="h-7 w-7 rounded-lg" />
    </div>
  )
}

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      onClick={onDismiss}
      aria-label="Fermer"
      className="shrink-0 rounded-lg p-1.5"
      style={{ color: "#555" }}
    >
      <X className="h-4 w-4" />
    </button>
  )
}

function Steps({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 flex flex-col gap-2 rounded-xl p-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {children}
    </div>
  )
}

function Step({
  n,
  icon,
  children,
}: {
  n:        number
  icon:     React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: "rgba(200,144,106,0.2)", color: "#C8906A" }}
      >
        {n}
      </div>
      <div
        className="flex items-start gap-1.5 text-[12px] leading-snug"
        style={{ color: "#aaa" }}
      >
        <span className="mt-0.5 shrink-0" style={{ color: "#C8906A" }}>{icon}</span>
        <span>{children}</span>
      </div>
    </div>
  )
}
