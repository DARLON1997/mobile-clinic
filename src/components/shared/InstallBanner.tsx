"use client"

import { useState } from "react"
import { X, Download, Share, MoreVertical } from "lucide-react"
import { useInstallPrompt } from "@/hooks/useInstallPrompt"

export function InstallBanner() {
  const { platform, canInstall, triggerInstall, dismiss } = useInstallPrompt()
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
        <AndroidPrompt onInstall={handleInstall} onDismiss={dismiss} loading={installing} />
      ) : (
        <IOSGuide onDismiss={dismiss} />
      )}
    </div>
  )
}

/* ─── Android ──────────────────────────────────────────────── */

function AndroidPrompt({
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
      {/* Icône app */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "rgba(200,144,106,0.15)", border: "1px solid rgba(200,144,106,0.3)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pwa/icon-192x192.png" alt="" className="h-7 w-7 rounded-lg" />
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white leading-tight">
          Installer Mobile Clinic
        </p>
        <p className="text-[11px] leading-tight" style={{ color: "#888" }}>
          Accès rapide depuis votre écran d'accueil
        </p>
      </div>

      {/* Bouton installer */}
      <button
        onClick={onInstall}
        disabled={loading}
        className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-60"
        style={{
          background: "rgba(200,144,106,0.2)",
          border:     "1px solid rgba(200,144,106,0.5)",
          color:      "#C8906A",
        }}
      >
        <Download className="h-3.5 w-3.5" />
        {loading ? "…" : "Installer"}
      </button>

      {/* Fermer */}
      <button
        onClick={onDismiss}
        aria-label="Fermer"
        className="shrink-0 rounded-lg p-1.5 transition-colors"
        style={{ color: "#555" }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─── iOS ───────────────────────────────────────────────────── */

function IOSGuide({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      {/* En-tête cliquable */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(200,144,106,0.15)", border: "1px solid rgba(200,144,106,0.3)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pwa/icon-192x192.png" alt="" className="h-7 w-7 rounded-xl" />
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 text-left"
        >
          <p className="text-[13px] font-semibold text-white leading-tight">
            Installer Mobile Clinic sur votre iPhone
          </p>
          <p className="text-[11px]" style={{ color: "#C8906A" }}>
            {expanded ? "Masquer les instructions ▲" : "Voir comment faire ▼"}
          </p>
        </button>

        <button
          onClick={onDismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-lg p-1.5"
          style={{ color: "#555" }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Étapes (expandable) */}
      {expanded && (
        <div
          className="mt-3 flex flex-col gap-2 rounded-xl p-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Step n={1} icon={<Share className="h-4 w-4" />}>
            Appuyez sur le bouton <span className="font-semibold text-white">Partager</span>{" "}
            <span style={{ color: "#C8906A" }}>
              (le rectangle avec la flèche en bas de Safari)
            </span>
          </Step>
          <Step n={2} icon={<MoreVertical className="h-4 w-4" />}>
            Faites défiler vers le bas et appuyez sur{" "}
            <span className="font-semibold text-white">« Sur l'écran d'accueil »</span>
          </Step>
          <Step n={3} icon={<Download className="h-4 w-4" />}>
            Appuyez sur <span className="font-semibold text-white">Ajouter</span> — l'app
            apparaît sur votre écran d'accueil comme une app native
          </Step>
        </div>
      )}
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
      <div className="flex items-start gap-1.5 text-[12px] leading-snug" style={{ color: "#aaa" }}>
        <span className="mt-0.5 shrink-0" style={{ color: "#C8906A" }}>{icon}</span>
        <span>{children}</span>
      </div>
    </div>
  )
}
