"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Eye, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "UPLOADED" | "PROCESSING" | "done"

interface OrdonnanceItem {
  id: string
  createdAt: string
  status: string
  ordonnanceUrl: string
  ordonnanceType: string
  notesCallCenter: string | null
  patient: {
    phone: string
    patientProfile: { firstName: string; lastName: string } | null
  }
}

const STATUS_COLOR: Record<string, string> = {
  UPLOADED:       "bg-orange-100 text-orange-700",
  PROCESSING:     "bg-blue-100 text-blue-700",
  FOUND:          "bg-green-100 text-green-700",
  PARTIALLY_FOUND: "bg-amber-100 text-amber-700",
  NOT_FOUND:      "bg-red-100 text-red-700",
  ORDERED:        "bg-[rgba(200,144,106,0.15)] text-[#C8906A]",
}
const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Nouvelle", PROCESSING: "En traitement",
  FOUND: "Trouvés", PARTIALLY_FOUND: "Partiellement trouvés",
  NOT_FOUND: "Non trouvés", ORDERED: "Commandés",
}

export default function CallCenterOrdonnancesPage() {
  const queryClient = useQueryClient()
  const [tab,      setTab]      = useState<Tab>("UPLOADED")
  const [selected, setSelected] = useState<OrdonnanceItem | null>(null)
  const [notes,    setNotes]    = useState("")
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState("")

  const { data: ordonnances = [], isLoading: loading } = useQuery<OrdonnanceItem[]>({
    queryKey: ["cc-ordonnances", tab],
    queryFn:  async () => {
      const res  = await fetch("/api/pharmacies/ordonnances")
      const json = await res.json()
      const all  = (json.data ?? []) as OrdonnanceItem[]
      return tab === "done"
        ? all.filter((o) => ["FOUND", "PARTIALLY_FOUND", "NOT_FOUND", "ORDERED"].includes(o.status))
        : all.filter((o) => o.status === tab)
    },
  })

  async function traiter(status: "FOUND" | "PARTIALLY_FOUND" | "NOT_FOUND") {
    if (!selected) return
    setSaving(true); setError("")
    const res = await fetch(`/api/pharmacies/ordonnances/${selected.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status, notesCallCenter: notes }),
    })
    setSaving(false)
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Erreur"); return }
    setSelected(null); setNotes("")
    queryClient.invalidateQueries({ queryKey: ["cc-ordonnances"] })
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "UPLOADED",   label: "Nouvelles" },
    { key: "PROCESSING", label: "En traitement" },
    { key: "done",       label: "Traitées" },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes d'ordonnances</h1>
      </div>

      {/* Onglets */}
      <div className="mb-6 flex gap-2">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            )}>
            {label}
            {key === "UPLOADED" && ordonnances.length > 0 && tab !== "UPLOADED" && null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" /></div>
      ) : ordonnances.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-400">Aucune demande dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordonnances.map((o) => {
            const patient = o.patient.patientProfile
              ? `${o.patient.patientProfile.firstName} ${o.patient.patientProfile.lastName}`
              : o.patient.phone
            return (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{patient}</p>
                  <p className="text-xs text-gray-500">{o.patient.phone} · {new Date(o.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLOR[o.status])}>
                  {STATUS_LABEL[o.status]}
                </span>
                {(o.status === "UPLOADED" || o.status === "PROCESSING") && (
                  <button onClick={() => { setSelected(o); setNotes("") }}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                    <Eye className="h-3.5 w-3.5" /> Traiter
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal traitement */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Traiter l'ordonnance</h2>

            {error && <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

            {/* Aperçu ordonnance */}
            <div className="mb-4 rounded-xl border border-gray-200 overflow-hidden">
              {selected.ordonnanceUrl.endsWith(".pdf") ? (
                <a href={selected.ordonnanceUrl} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-gray-50 py-8 text-sm text-blue-600 hover:bg-gray-100">
                  <Eye className="h-4 w-4" /> Voir le PDF
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.ordonnanceUrl} alt="Ordonnance" className="w-full max-h-64 object-contain bg-gray-50" />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes pour le patient</label>
              <textarea value={notes} rows={3} onChange={(e) => setNotes(e.target.value)}
                placeholder="Indiquez les médicaments trouvés, leurs prix, les pharmacies disponibles..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => traiter("FOUND")} disabled={saving}
                className="flex-1 min-w-0 rounded-xl bg-green-600 py-2.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Médicaments trouvés
              </button>
              <button onClick={() => traiter("PARTIALLY_FOUND")} disabled={saving}
                className="flex-1 min-w-0 rounded-xl bg-amber-500 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Partiellement
              </button>
              <button onClick={() => traiter("NOT_FOUND")} disabled={saving}
                className="flex-1 min-w-0 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> Non disponibles
              </button>
            </div>

            <button onClick={() => setSelected(null)} className="mt-3 w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
