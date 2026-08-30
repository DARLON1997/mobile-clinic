"use client"

import { useEffect } from "react"
import Link from "next/link"
import { logServerError } from "@/lib/error-logger"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logServerError("GLOBAL_ERROR_BOUNDARY", error)
  }, [error])

  return (
    <html lang="fr">
      <body style={{ background: "#0A0A0A", color: "#EDEDED", fontFamily: "system-ui, sans-serif" }}>
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: 24,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "9999px",
            background: "rgba(232,84,84,0.1)", border: "1px solid rgba(232,84,84,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>
            ⚠️
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Mobile Clinic a rencontré un problème</h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "#AAAAAA", maxWidth: 380 }}>
              L&apos;application n&apos;a pas pu s&apos;afficher normalement. Réessayez, ou revenez à l&apos;accueil.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={reset}
              style={{
                background: "#C8906A", color: "#0A0A0A", border: "none",
                borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <Link
              href="/"
              style={{
                background: "transparent", color: "#AAAAAA", border: "1px solid #2A2A2A",
                borderRadius: 12, padding: "10px 20px", fontSize: 14, textDecoration: "none",
              }}
            >
              Accueil
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
