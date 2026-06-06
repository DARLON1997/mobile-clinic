"use client"

import { useEffect, useState, useCallback } from "react"
import { HomeVisitStatusBadge } from "@/components/shared/StatusBadge"
import { Plus, X, MapPin, User, Clock, Home, TestTube2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { cn }     from "@/lib/utils"

type Visit = {
  id: string; type: string; status: string; address: string; city: string
  scheduledAt: string; reason: string
  patient: {
    phone: string | null
    patientProfile: { firstName: string; lastName: string } | null
  }
  agent: { agentProfile: { firstName: string; lastName: string; zone: string } | null } | null
}

type PatientResult = {
  id: string; email: string
  patientProfile: { firstName: string; lastName: string; phone: string | null } | null
}

const STATUS_FILTER_OPTS = [
  { value: "ALL",      label: "Tous" },
  { value: "PENDING",  label: "En attente" },
  { value: "ASSIGNED", label: "Assigné" },
  { value: "EN_ROUTE", label: "En route" },
  { value: "ARRIVED",  label: "Arrivé" },
  { value: "COMPLETED", label: "Terminé" },
  { value: "CANCELLED", label: "Annulé" },
]

export default function CCHomeVisitsPage() {
  const [visits,       setVisits]       = useState<Visit[]>([])
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState("")
  const [success,      setSuccess]      = useState(false)

  // Formulaire modale
  const [patientSearch,   setPatientSearch]   = useState("")
  const [patientResults,  setPatientResults]  = useState<PatientResult[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)
  const [visitType,       setVisitType]       = useState<"CARE" | "SAMPLING">("CARE")
  const [address,         setAddress]         = useState("")
  const [city,            setCity]            = useState("Brazzaville")
  const [date,            setDate]            = useState("")
  const [reason,          setReason]          = useState("")
  const [notes,           setNotes]           = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "ALL") params.set("status", statusFilter)
    const res  = await fetch(`/api/home-visits?${params}`)
    const json = await res.json()
    setVisits(json.data ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function searchPatients() {
    if (patientSearch.length < 2) return
    const res  = await fetch(`/api/patients/search?q=${encodeURIComponent(patientSearch)}`)
    const json = await res.json()
    setPatientResults(json.data ?? [])
  }

  async function createVisit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatient || !address.trim() || !date || !reason.trim()) {
      setError("Patient, adresse, date et motif sont obligatoires.")
      return
    }
    setSaving(true)
    setError("")
    const res = await fetch("/api/home-visits", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId:   selectedPatient.id,
        type:        visitType,
        address:     address.trim(),
        city:        city.trim(),
        scheduledAt: new Date(date).toISOString(),
        reason:      reason.trim(),
        notes:       notes || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Erreur serveur.")
      setSaving(false)
      return
    }
    setSuccess(true)
    await load()
    setTimeout(() => {
      setModal(false); setSuccess(false)
      setSelectedPatient(null); setAddress(""); setDate(""); setReason(""); setNotes("")
      setPatientSearch(""); setPatientResults([])
    }, 1500)
    setSaving(false)
  }

  function openModal() {
    setModal(true); setError(""); setSuccess(false)
    setSelectedPatient(null); setAddress(""); setDate(""); setReason(""); setNotes("")
    setPatientSearch(""); setPatientResults([])
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Soins à domicile</h1>
        <Button onClick={openModal} size="sm">
          <Plus className="h-4 w-4" /> Nouvelle demande
        </Button>
      </div>

      {/* Filtres statut */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTER_OPTS.map(({ value, label }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              statusFilter === value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : visits.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">Aucune visite trouvée.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Patient", "Adresse", "Date / Heure", "Type", "Agent", "Statut"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visits.map((v) => {
                const pp = v.patient.patientProfile
                const ap = v.agent?.agentProfile
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {pp ? `${pp.firstName} ${pp.lastName}` : "—"}
                      </p>
                      {v.patient.phone && <p className="text-xs text-gray-400">{v.patient.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-start gap-1">
                        <MapPin className="mt-0.5 h-3 w-3 text-gray-400 shrink-0" />
                        <span>{v.address}, {v.city}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(v.scheduledAt).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.type === "CARE" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                      }`}>
                        {v.type === "CARE" ? <Home className="h-3 w-3" /> : <TestTube2 className="h-3 w-3" />}
                        {v.type === "CARE" ? "Soin" : "Prélèvement"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ap ? `${ap.firstName} ${ap.lastName}` : <span className="text-gray-300">Non assigné</span>}
                    </td>
                    <td className="px-4 py-3">
                      <HomeVisitStatusBadge status={v.status as Parameters<typeof HomeVisitStatusBadge>[0]["status"]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nouvelle demande */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-y-auto max-h-[90vh] rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-900">Nouvelle demande de visite</h2>
              <button onClick={() => setModal(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={createVisit} className="space-y-4 px-6 py-5">
              {success ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                  <p className="font-medium text-gray-900">Demande créée avec succès !</p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
                  )}

                  {/* Recherche patient */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Patient *
                    </label>
                    <div className="flex gap-2">
                      <input value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchPatients())}
                        placeholder="Nom ou téléphone..."
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
                      <button type="button" onClick={searchPatients}
                        className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600 hover:bg-gray-200">
                        Chercher
                      </button>
                    </div>
                    {patientResults.length > 0 && (
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        {patientResults.map((p) => (
                          <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setPatientResults([]) }}
                            className={`w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-gray-50 ${selectedPatient?.id === p.id ? "bg-blue-50" : ""}`}>
                            <p className="font-medium">{p.patientProfile ? `${p.patientProfile.firstName} ${p.patientProfile.lastName}` : p.email}</p>
                            <p className="text-xs text-gray-400">{p.patientProfile?.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedPatient && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ {selectedPatient.patientProfile ? `${selectedPatient.patientProfile.firstName} ${selectedPatient.patientProfile.lastName}` : selectedPatient.email}
                      </p>
                    )}
                  </div>

                  {/* Type */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-700">Type *</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "CARE" as const,     icon: Home,      label: "Soin à domicile" },
                        { value: "SAMPLING" as const, icon: TestTube2, label: "Prélèvement" },
                      ].map(({ value, icon: Icon, label }) => (
                        <button type="button" key={value} onClick={() => setVisitType(value)}
                          className={cn("flex items-center gap-2 rounded-xl border-2 p-3 text-xs font-medium",
                            visitType === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
                          )}>
                          <Icon className="h-4 w-4" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Adresse *</label>
                    <input value={address} onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rue, quartier..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">Ville *</label>
                      <input value={city} onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Date / heure *
                      </label>
                      <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Motif *</label>
                    <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                      placeholder="Symptômes ou soin demandé..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Instructions agent (optionnel)</label>
                    <input value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Code d'accès, étage..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModal(false)}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                      Annuler
                    </button>
                    <button type="submit" disabled={saving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                      {saving ? "Création..." : "Créer la demande"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
