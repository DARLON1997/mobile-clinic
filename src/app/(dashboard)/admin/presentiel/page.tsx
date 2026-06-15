"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { PresentielStatusBadge } from "@/components/shared/StatusBadge"
import { formatDateFR } from "@/lib/utils"
import { AlertCircle, Check, ShieldCheck, X } from "lucide-react"
import type { PresentielStatus } from "@/types"

type PresentielRow = {
  id: string
  scheduledAt: string
  duration: number
  reason: string
  status: PresentielStatus
  cabinet: { name: string; city: string } | null
  patient: { phone: string; patientProfile: { firstName: string; lastName: string } | null }
  doctor: { email: string; doctorProfile: { firstName: string; lastName: string; speciality: string } | null }
}

type Filter = "ALL" | PresentielStatus

export default function AdminPresentielPage() {
  const [rows, setRows] = useState<PresentielRow[]>([])
  const [filter, setFilter] = useState<Filter>("EN_ATTENTE")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{
    id: string
    decision: "APPROVE" | "REJECT"
    patientName: string
    doctorName: string
  } | null>(null)
  const [adminNote, setAdminNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = filter !== "ALL" ? `?status=${filter}` : ""
    const res = await fetch(`/api/presentiel${params}`)
    const json = await res.json()
    setRows(json.data ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function submitDecision() {
    if (!modal) return
    if (modal.decision === "REJECT" && !adminNote.trim()) {
      setError("La raison du refus est obligatoire.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/presentiel/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentielId: modal.id,
          decision: modal.decision,
          adminNote: adminNote || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur.")
      setModal(null)
      setAdminNote("")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur serveur.")
    } finally {
      setSubmitting(false)
    }
  }

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "ALL", label: "Tous" },
    { value: "EN_ATTENTE", label: "En attente" },
    { value: "CONFIRME", label: "Confirmés" },
    { value: "ANNULE", label: "Annulés" },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes de présentiel</h1>
        <p className="text-sm text-gray-500">Suivez et confirmez les demandes de consultations en cabinet.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-gray-300" />
          <p className="text-gray-400">Aucune demande pour ce filtre.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Médecin</th>
                <th className="px-4 py-3 text-left">Cabinet</th>
                <th className="px-4 py-3 text-left">Créneau</th>
                <th className="px-4 py-3 text-left">Motif</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((item) => {
                const patientName = item.patient.patientProfile
                  ? `${item.patient.patientProfile.firstName} ${item.patient.patientProfile.lastName}`
                  : item.patient.phone
                const doctorName = item.doctor.doctorProfile
                  ? `Dr ${item.doctor.doctorProfile.firstName} ${item.doctor.doctorProfile.lastName}`
                  : item.doctor.email
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{patientName}</p>
                      <p className="text-xs text-gray-400">{item.patient.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{doctorName}</p>
                      {item.doctor.doctorProfile && (
                        <p className="text-xs text-gray-400">{item.doctor.doctorProfile.speciality}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{item.cabinet?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{item.cabinet?.city ?? ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDateFR(new Date(item.scheduledAt))}
                      <p className="text-xs text-gray-400">{item.duration} min</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{item.reason}</td>
                    <td className="px-4 py-3">
                      <PresentielStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      {(item.status === "EN_ATTENTE" || item.status === "NOUVEAU_CRENEAU") && (
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="secondary" className="h-7 px-2 text-xs"
                            onClick={() => { setModal({ id: item.id, decision: "APPROVE", patientName, doctorName }); setAdminNote(""); setError("") }}>
                            <Check className="h-3 w-3" /> Confirmer
                          </Button>
                          <Button size="sm" variant="danger" className="h-7 px-2 text-xs"
                            onClick={() => { setModal({ id: item.id, decision: "REJECT", patientName, doctorName }); setAdminNote(""); setError("") }}>
                            <X className="h-3 w-3" /> Refuser
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              {modal.decision === "APPROVE"
                ? <Check className="h-5 w-5 text-green-600" />
                : <AlertCircle className="h-5 w-5 text-red-600" />
              }
              <h2 className="text-base font-semibold text-gray-900">
                {modal.decision === "APPROVE" ? "Confirmer cette demande" : "Refuser cette demande"}
              </h2>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              {modal.patientName} · {modal.doctorName}
            </p>

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {modal.decision === "REJECT" ? "Raison du refus *" : "Note pour le patient (optionnel)"}
              </label>
              <textarea rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder={modal.decision === "REJECT" ? "Expliquez la raison..." : "Ex : Merci de vous présenter 10 min avant..."}
                value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => { setModal(null); setError("") }}>
                Annuler
              </Button>
              <Button variant={modal.decision === "APPROVE" ? "secondary" : "danger"} className="flex-1"
                loading={submitting} onClick={submitDecision}>
                {modal.decision === "APPROVE" ? "Confirmer" : "Confirmer le refus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
