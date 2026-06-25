"use client"

import { WifiOff, RefreshCw } from "lucide-react"

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: "#0A0A0A" }}
    >
      {/* Logo simplifié */}
      <div
        className="mb-8 flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: "rgba(200,144,106,0.08)",
          border:     "2px solid rgba(200,144,106,0.3)",
        }}
      >
        <WifiOff className="h-9 w-9" style={{ color: "#C8906A" }} />
      </div>

      <h1
        className="mb-3 text-2xl font-bold text-white"
        style={{ fontFamily: "var(--font-cormorant, serif)", fontStyle: "italic" }}
      >
        Vous êtes hors connexion
      </h1>

      <p className="mb-2 max-w-sm text-sm leading-relaxed" style={{ color: "#888" }}>
        Certaines pages restent disponibles depuis le cache, mais la consultation vidéo,
        la prise de rendez-vous et le paiement nécessitent une connexion internet.
      </p>
      <p className="mb-8 max-w-sm text-sm leading-relaxed" style={{ color: "#555" }}>
        Reconnectez-vous pour continuer.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors"
        style={{
          background:   "rgba(200,144,106,0.12)",
          border:       "1px solid rgba(200,144,106,0.4)",
          color:        "#C8906A",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,144,106,0.2)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(200,144,106,0.12)")}
      >
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </button>

      <p
        className="mt-12 text-[11px] uppercase tracking-widest"
        style={{ color: "#333" }}
      >
        Mobile Clinic · Télémédecine Congo-Brazzaville
      </p>
    </div>
  )
}
