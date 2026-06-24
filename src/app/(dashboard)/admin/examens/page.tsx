"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FlaskConical, ChevronDown } from "lucide-react"

type Examen = {
  id:           string
  typeExamen:   string
  instructions: string | null
  statut:       "EN_ATTENTE" | "EFFECTUE" | "RESULTATS_RECUS"
  resultatNote: string | null
  createdAt:    string
  patient: { patientProfile: { firstName: string; lastName: string } | null }
  doctor:  { doctorProfile:  { firstName: string; lastName: string } | null }
}

const STATUTS = ["Tous", "EN_ATTENTE", "EFFECTUE", "RESULTATS_RECUS"] as const

const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE:      "En attente",
  EFFECTUE:        "Effectué",
  RESULTATS_RECUS: "Résultats reçus",
}

const STATUT_COLOR: Record<string, string> = {
  EN_ATTENTE:      "bg-amber-100 text-amber-700",
  EFFECTUE:        "bg-blue-100 text-blue-700",
  RESULTATS_RECUS: "bg-green-100 text-green-700",
}

export default function AdminExamensPage() {
  const queryClient = useQueryClient()
  const [filtre,     setFiltre]     = useState<typeof STATUTS[number]>("Tous")
  const [editId,     setEditId]     = useState<string | null>(null)
  const [editStatut, setEditStatut] = useState<string>("")
  const [editNote,   setEditNote]   = useState("")
  const [saving,     setSaving]     = useState(false)

  const { data: examens = [], isLoading: loading } = useQuery<Examen[]>({
    queryKey: ["admin-examens"],
    queryFn:  () => fetch("/api/examens-prescrits").then(r => r.json()).then(j => j.data ?? []),
  })

  const filtered = filtre === "Tous" ? examens : examens.filter(e => e.statut === filtre)

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch(`/api/examens-prescrits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: editStatut, resultatNote: editNote || undefined }),
    })
    if (res.ok) {
      setEditId(null)
      queryClient.invalidateQueries({ queryKey: ["admin-examens"] })
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-blue-600" />
            Examens prescrits
          </h1>
          <p className="text-sm text-gray-500">Tous les examens prescrits par les médecins</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {STATUTS.map(s => (
          <button key={s} onClick={() => setFiltre(s)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              filtre === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}>
            {s === "Tous" ? "Tous" : STATUT_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
          Aucun examen pour ce filtre.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Médecin</th>
                <th className="px-4 py-3 text-left">Examen</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(e => {
                const pp = e.patient.patientProfile
                const dp = e.doctor.doctorProfile
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {pp ? `${pp.firstName} ${pp.lastName}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {dp ? `Dr ${dp.firstName} ${dp.lastName}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{e.typeExamen}</p>
                      {e.instructions && <p className="text-xs text-gray-400">{e.instructions}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(e.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUT_COLOR[e.statut]}`}>
                        {STATUT_LABEL[e.statut]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editId === e.id ? (
                        <div className="space-y-2 min-w-[200px]">
                          <div className="relative">
                            <select value={editStatut} onChange={ev => setEditStatut(ev.target.value)}
                              className="w-full appearance-none rounded-lg border border-gray-200 px-2 py-1 pr-6 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300">
                              <option value="EN_ATTENTE">En attente</option>
                              <option value="EFFECTUE">Effectué</option>
                              <option value="RESULTATS_RECUS">Résultats reçus</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 text-gray-400" />
                          </div>
                          <textarea rows={2} value={editNote} onChange={ev => setEditNote(ev.target.value)}
                            placeholder="Note de résultat (optionnel)"
                            className="w-full resize-none rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(e.id)} disabled={saving}
                              className="flex-1 rounded-lg bg-blue-600 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                              {saving ? "…" : "Enregistrer"}
                            </button>
                            <button onClick={() => setEditId(null)}
                              className="flex-1 rounded-lg border border-gray-200 py-1 text-xs text-gray-500 hover:bg-gray-50">
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setEditId(e.id); setEditStatut(e.statut); setEditNote(e.resultatNote ?? "") }}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                          Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
