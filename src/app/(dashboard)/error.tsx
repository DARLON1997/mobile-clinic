"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { logServerError } from "@/lib/error-logger"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logServerError("DASHBOARD_ERROR_BOUNDARY", error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(232,84,84,0.1)] border border-[rgba(232,84,84,0.25)]">
        <AlertTriangle className="h-7 w-7 text-[#E85454]" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Une erreur est survenue</h2>
        <p className="mt-1 text-sm text-[#AAAAAA]">
          Cet écran a rencontré un problème inattendu. Vos données déjà enregistrées ne sont pas affectées.
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-xl bg-[#C8906A] px-5 py-2.5 text-sm font-medium text-[#0A0A0A] hover:bg-[#E8B49A] transition-colors"
      >
        <RotateCcw className="h-4 w-4" /> Réessayer
      </button>
    </div>
  )
}
