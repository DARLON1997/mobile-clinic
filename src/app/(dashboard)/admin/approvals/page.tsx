"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AppointmentStatusBadge } from "@/components/shared/StatusBadge"
import { AvailabilityBadge } from "@/components/shared/AvailabilityBadge"
import { formatDateFR } from "@/lib/utils"
import { ShieldCheck, X, Check, AlertCircle, Zap } from "lucide-react"
import type { SlotCheck } from "@/lib/check-doctor-availability"

type ApptRow = {
  id: string; scheduledAt: string; reason: string; status: string; isInstant: boolean
  patient: { phone: string; patientProfile: { firstName: string; lastName: string } | null }
  doctor:  { id: string; email: string; doctorProfile: { firstName: string; lastName: string; speciality: string } | null }
  availabilityCheck?: SlotCheck | null
}

type Filter = "ALL" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED"

export default function ApprovalsPage() {
  const [rows,       setRows]       = useState<ApptRow[]>([])
  const [filter,     setFilter]     = useState<Filter>("AWAITING_APPROVAL")
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState<{
    id: string; decision: "APPROVE" | "REJECT"; patientName: string; doctorName: string
    availabilityCheck?: SlotCheck | null
  } | null>(null)
  const [adminNote,  setAdminNote]  = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = filter !== "ALL" ? `?status=${filter}` : ""
    const res  = await fetch(`/api/appointments${params}`)
    const json = await res.json()
    // Demandes instantanées en tête de liste
    const sorted = [...(json.data ?? [])].sort(
      (a: ApptRow, b: ApptRow) => (b.isInstant ? 1 : 0) - (a.isInstant ? 1 : 0)
    )
    setRows(sorted)
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
      const res = await fetch("/api/approvals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: modal.id,
          decision:      modal.decision,
          adminNote:     adminNote || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
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
    { value: "ALL",               label: "Tous" },
    { value: "AWAITING_APPROVAL", label: "En attente" },
    { value: "APPROVED",          label: "Approuvés" },
    { value: "REJECTED",          label: "Refusés" },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes d&apos;autorisation</h1>
        <p className="text-sm text-gray-500">Gérez les autorisations médecin ↔ patient</p>
      </div>

      <div className="mb-6 flex gap-2">
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
                <th className="px-4 py-3 text-left">Date du RDV</th>
                <th className="px-4 py-3 text-left">Motif</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((appt) => {
                const patientName = appt.patient.patientProfile
                  ? `${appt.patient.patientProfile.firstName} ${appt.patient.patientProfile.lastName}`
                  : appt.patient.phone
                const doctorName = appt.doctor.doctorProfile
                  ? `Dr ${appt.doctor.doctorProfile.firstName} ${appt.doctor.doctorProfile.lastName}`
                  : appt.doctor.email
                return (
                  <tr key={appt.id} className={`hover:bg-gray-50 ${appt.isInstant ? "bg-orange-50/60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {appt.isInstant && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 ring-1 ring-orange-300">
                            <Zap className="h-3 w-3" />
                            URGENT
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{patientName}</p>
                          <p className="text-xs text-gray-400">{appt.patient.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{doctorName}</p>
                      {appt.doctor.doctorProfile && (
                        <p className="text-xs text-gray-400">{appt.doctor.doctorProfile.speciality}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDateFR(new Date(appt.scheduledAt))}
                      <AvailabilityBadge check={appt.availabilityCheck} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{appt.reason}</td>
                    <td className="px-4 py-3">
                      <AppointmentStatusBadge status={appt.status as Parameters<typeof AppointmentStatusBadge>[0]["status"]} />
                    </td>
                    <td className="px-4 py-3">
                      {appt.status === "AWAITING_APPROVAL" && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="secondary" className="h-7 px-2 text-xs"
                            onClick={() => { setModal({ id: appt.id, decision: "APPROVE", patientName, doctorName, availabilityCheck: appt.availabilityCheck }); setAdminNote(""); setError("") }}>
                            <Check className="h-3 w-3" /> Approuver
                          </Button>
                          <Button size="sm" variant="danger" className="h-7 px-2 text-xs"
                            onClick={() => { setModal({ id: appt.id, decision: "REJECT", patientName, doctorName, availabilityCheck: appt.availabilityCheck }); setAdminNote(""); setError("") }}>
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              {modal.decision === "APPROVE"
                ? <Check className="h-5 w-5 text-green-600" />
                : <AlertCircle className="h-5 w-5 text-red-600" />
              }
              <h2 className="text-base font-semibold text-gray-900">
                {modal.decision === "APPROVE" ? "Approuver ce rendez-vous ?" : "Refuser ce rendez-vous ?"}
              </h2>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              {modal.patientName} avec {modal.doctorName}
            </p>

            {modal.availabilityCheck && (
              <div className="mb-4">
                <AvailabilityBadge check={modal.availabilityCheck} />
              </div>
            )}

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {modal.decision === "REJECT" ? "Raison du refus *" : "Note pour le patient (optionnel)"}
              </label>
              <textarea rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder={modal.decision === "REJECT" ? "Expliquez la raison..." : "Ex : Apportez votre carnet de santé..."}
                value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => { setModal(null); setError("") }}>
                Annuler
              </Button>
              <Button variant={modal.decision === "APPROVE" ? "secondary" : "danger"} className="flex-1"
                loading={submitting} onClick={submitDecision}>
                {modal.decision === "APPROVE" ? "Confirmer l'approbation" : "Confirmer le refus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
