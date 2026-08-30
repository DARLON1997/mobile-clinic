"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { PresentielStatusBadge } from "@/components/shared/StatusBadge"
import { formatDate } from "@/lib/utils"
import { CalendarDays, Check, Clock, FileText, MapPin, UserX } from "lucide-react"
import type { PresentielStatus } from "@/types"

type PresentielRow = {
  id: string
  scheduledAt: string
  duration: number
  reason: string
  status: PresentielStatus
  notes: string | null
  cabinet: { name: string; address: string; city: string; phone: string } | null
  patient: {
    patientProfile: { firstName: string; lastName: string } | null
  }
}

type TerminerModal = { id: string; patientName: string } | null

export default function DoctorPresentielPage() {
  const queryClient = useQueryClient()
  const [filter,       setFilter]       = useState<"TODAY" | "ALL">("TODAY")
  const [terminerModal, setTerminerModal] = useState<TerminerModal>(null)
  const [notes,        setNotes]        = useState("")
  const [submitting,   setSubmitting]   = useState(false)
  const [actionError,  setActionError]  = useState("")

  const todayStr = new Date().toISOString().split("T")[0]

  const { data: rows = [], isLoading: loading } = useQuery<PresentielRow[]>({
    queryKey: ["doctor-presentiel", filter, todayStr],
    queryFn:  async () => {
      const params = filter === "TODAY" ? `?date=${todayStr}` : ""
      const res  = await fetch(`/api/presentiel${params}`)
      const json = await res.json()
      return json.data ?? []
    },
  })

  async function updateStatus(id: string, status: PresentielStatus, extraNotes?: string) {
    setSubmitting(true)
    setActionError("")
    try {
      const body: Record<string, unknown> = { status }
      if (extraNotes !== undefined) body.notes = extraNotes
      const res  = await fetch(`/api/presentiel/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur.")
      setTerminerModal(null)
      setNotes("")
      queryClient.invalidateQueries({ queryKey: ["doctor-presentiel"] })
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Erreur serveur.")
    } finally {
      setSubmitting(false)
    }
  }

  const kpis = {
    aRecevoir: rows.filter(r => r.status === "CONFIRME" || r.status === "CRENEAU_ACCEPTE").length,
    enCours:   rows.filter(r => r.status === "EN_COURS").length,
    termines:  rows.filter(r => r.status === "TERMINE").length,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultations présentiel</h1>
          <p className="text-sm text-gray-500">Gérez vos patients en cabinet</p>
        </div>
        <div className="flex gap-2">
          {(["TODAY", "ALL"] as const).map((v) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === v
                  ? "bg-[#C8906A] text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-[#C8906A]"
              }`}>
              {v === "TODAY" ? "Aujourd'hui" : "Toutes"}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">À recevoir</p>
          <p className="mt-1 text-3xl font-bold text-[#C8906A]">{kpis.aRecevoir}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">En cours</p>
          <p className="mt-1 text-3xl font-bold text-amber-500">{kpis.enCours}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Terminées</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{kpis.termines}</p>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="h-4 w-36 skeleton-light" />
                <div className="h-4 w-20 skeleton-light" />
              </div>
              <div className="mb-1.5 h-3 w-48 skeleton-light" />
              <div className="h-3 w-24 skeleton-light" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-14 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-400">
            Aucune consultation présentiel{filter === "TODAY" ? " aujourd'hui" : ""}.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop : tableau — inchangé */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3 text-left">Heure</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Cabinet</th>
                  <th className="px-4 py-3 text-left">Motif</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((item) => {
                  const patientName = item.patient.patientProfile
                    ? `${item.patient.patientProfile.firstName} ${item.patient.patientProfile.lastName}`
                    : "Patient"
                  const heure = formatDate(new Date(item.scheduledAt)).slice(11)
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-gray-900">{heure}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" /> {item.duration} min
                        </p>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{patientName}</td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{item.cabinet?.name ?? "—"}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />{item.cabinet?.city ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-gray-600">{item.reason}</td>
                      <td className="px-4 py-3">
                        <PresentielStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.status === "CONFIRME" || item.status === "CRENEAU_ACCEPTE") && (
                            <Button size="sm" className="h-7 px-2 text-xs"
                              onClick={() => updateStatus(item.id, "EN_COURS")}>
                              <Check className="h-3 w-3" /> Patient arrivé
                            </Button>
                          )}
                          {item.status === "EN_COURS" && (
                            <>
                              <Button size="sm" variant="secondary" className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setTerminerModal({ id: item.id, patientName })
                                  setNotes("")
                                  setActionError("")
                                }}>
                                <FileText className="h-3 w-3" /> Terminer
                              </Button>
                              <Button size="sm" variant="danger" className="h-7 px-2 text-xs"
                                onClick={() => updateStatus(item.id, "ABSENT")}>
                                <UserX className="h-3 w-3" /> Absent
                              </Button>
                            </>
                          )}
                          {item.status === "TERMINE" && item.notes && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <FileText className="h-3 w-3" /> Note rédigée
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile : liste de cartes empilées (audit C4) */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((item) => {
              const patientName = item.patient.patientProfile
                ? `${item.patient.patientProfile.firstName} ${item.patient.patientProfile.lastName}`
                : "Patient"
              const heure = formatDate(new Date(item.scheduledAt)).slice(11)
              return (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{patientName}</p>
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        {heure} · <Clock className="h-3 w-3" /> {item.duration} min
                      </p>
                    </div>
                    <PresentielStatusBadge status={item.status} />
                  </div>
                  <div className="mb-3 space-y-1 text-sm text-gray-600">
                    <p className="flex items-center gap-1 text-gray-700">
                      <MapPin className="h-3 w-3 text-gray-400" /> {item.cabinet?.name ?? "—"}{item.cabinet?.city ? `, ${item.cabinet.city}` : ""}
                    </p>
                    <p className="truncate">{item.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(item.status === "CONFIRME" || item.status === "CRENEAU_ACCEPTE") && (
                      <Button size="sm" className="h-8 flex-1 text-xs"
                        onClick={() => updateStatus(item.id, "EN_COURS")}>
                        <Check className="h-3 w-3" /> Patient arrivé
                      </Button>
                    )}
                    {item.status === "EN_COURS" && (
                      <>
                        <Button size="sm" variant="secondary" className="h-8 flex-1 text-xs"
                          onClick={() => {
                            setTerminerModal({ id: item.id, patientName })
                            setNotes("")
                            setActionError("")
                          }}>
                          <FileText className="h-3 w-3" /> Terminer
                        </Button>
                        <Button size="sm" variant="danger" className="h-8 flex-1 text-xs"
                          onClick={() => updateStatus(item.id, "ABSENT")}>
                          <UserX className="h-3 w-3" /> Absent
                        </Button>
                      </>
                    )}
                    {item.status === "TERMINE" && item.notes && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <FileText className="h-3 w-3" /> Note rédigée
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Modal — Terminer & rédiger ordonnance */}
      {terminerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#C8906A]" />
              <h2 className="text-base font-semibold text-gray-900">Terminer la consultation</h2>
            </div>
            <p className="mb-5 text-sm text-gray-500">{terminerModal.patientName}</p>

            {actionError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Ordonnance / notes de consultation
              </label>
              <textarea
                rows={7}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Diagnostic, médicaments prescrits, posologie, recommandations au patient…"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-[#C8906A] focus:ring-2 focus:ring-[rgba(200,144,106,0.2)]"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1"
                onClick={() => { setTerminerModal(null); setActionError("") }}>
                Annuler
              </Button>
              <Button className="flex-1" loading={submitting}
                onClick={() => updateStatus(terminerModal.id, "TERMINE", notes || undefined)}>
                Valider et terminer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
