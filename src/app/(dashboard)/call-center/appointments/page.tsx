"use client"

import { useEffect, useState, useCallback } from "react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { AvailabilityBadge } from "@/components/shared/AvailabilityBadge"
import type { AppointmentStatus } from "@prisma/client"
import { Search, Plus, X, ChevronRight, ChevronLeft, User, Stethoscope, Calendar, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import type { SlotCheck } from "@/lib/check-doctor-availability"

type Appointment = {
  id: string; status: AppointmentStatus; type: string; scheduledAt: string; reason: string
  patient: { phone: string | null; patientProfile: { firstName: string; lastName: string } | null }
  doctor:  { doctorProfile: { firstName: string; lastName: string; speciality: string } | null }
  availabilityCheck?: SlotCheck | null
}

type Doctor = {
  id: string
  doctorProfile: { firstName: string; lastName: string; speciality: string; consultationFee: number } | null
}

type PatientResult = {
  id: string; email: string
  patientProfile: { firstName: string; lastName: string; phone: string | null } | null
}

const TYPE_LABEL: Record<string, string> = { VIDEO: "Téléconsultation", CARE: "Soin domicile", SAMPLING: "Prélèvement" }

const SLOTS = Array.from({ length: 8 }, (_, i) => {
  const h = 9 + i
  return `${String(h).padStart(2, "0")}:00`
})

function generateSlots(doctorId: string) {
  const today = new Date()
  const slots: { date: string; time: string; label: string }[] = []
  for (let d = 1; d <= 7; d++) {
    const day = new Date(today)
    day.setDate(today.getDate() + d)
    if (day.getDay() === 0 || day.getDay() === 6) continue
    for (const t of SLOTS) {
      const label = `${day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${t}`
      slots.push({ date: day.toISOString().slice(0, 10), time: t, label })
    }
  }
  return slots
}

export default function CCAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [search,       setSearch]       = useState("")
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState<string | null>(null)

  // Modal état
  const [modal,  setModal]  = useState(false)
  const [step,   setStep]   = useState(1)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")
  const [success, setSuccess] = useState(false)

  // Étape 1 — recherche patient
  const [patientSearch,  setPatientSearch]  = useState("")
  const [patientResults, setPatientResults] = useState<PatientResult[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)

  // Étape 2 — médecin
  const [doctors,         setDoctors]         = useState<Doctor[]>([])
  const [specialityFilter, setSpecialityFilter] = useState("")
  const [selectedDoctor,   setSelectedDoctor]   = useState<Doctor | null>(null)

  // Étape 3 — créneau
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string; label: string } | null>(null)
  const [apptType,     setApptType]     = useState("VIDEO")

  // Étape 4 — motif
  const [reason, setReason] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "ALL") params.set("status", statusFilter)
    const res  = await fetch(`/api/appointments?${params}`)
    const json = await res.json()
    setAppointments(json.data ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function searchPatients() {
    if (patientSearch.length < 2) return
    const res  = await fetch(`/api/patients/search?q=${encodeURIComponent(patientSearch)}`)
    const json = await res.json()
    setPatientResults(json.data ?? [])
  }

  async function loadDoctors() {
    const params = new URLSearchParams()
    if (specialityFilter) params.set("speciality", specialityFilter)
    const res  = await fetch(`/api/doctors?${params}`)
    const json = await res.json()
    setDoctors(json.data ?? [])
  }

  useEffect(() => {
    if (step === 2) loadDoctors()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, specialityFilter])

  async function submitToAdmin(id: string) {
    setSubmitting(id)
    await fetch("/api/approvals", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: id }),
    })
    await load()
    setSubmitting(null)
  }

  async function createAppointment() {
    if (!selectedPatient || !selectedDoctor || !selectedSlot || !reason.trim()) {
      setError("Tous les champs sont obligatoires.")
      return
    }
    setSaving(true)
    setError("")
    const scheduledAt = new Date(`${selectedSlot.date}T${selectedSlot.time}:00`).toISOString()
    const res = await fetch("/api/appointments", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId:  selectedPatient.id,
        doctorId:   selectedDoctor.id,
        type:       apptType,
        scheduledAt,
        reason:     reason.trim(),
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
      setModal(false); setStep(1); setSuccess(false)
      setSelectedPatient(null); setSelectedDoctor(null); setSelectedSlot(null); setReason("")
    }, 1500)
    setSaving(false)
  }

  function openModal() {
    setModal(true); setStep(1); setError(""); setSuccess(false)
    setSelectedPatient(null); setSelectedDoctor(null); setSelectedSlot(null)
    setReason(""); setPatientSearch(""); setPatientResults([])
  }

  const filtered = appointments.filter((a) => {
    if (!search) return true
    const pp = a.patient.patientProfile
    const name = pp ? `${pp.firstName} ${pp.lastName}`.toLowerCase() : ""
    return name.includes(search.toLowerCase())
  })

  const specialities = [...new Set(doctors.map((d) => d.doctorProfile?.speciality).filter(Boolean) as string[])]
  const slots = selectedDoctor ? generateSlots(selectedDoctor.id) : []

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
        <Button onClick={openModal} size="sm">
          <Plus className="h-4 w-4" /> Nouveau RDV
        </Button>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un patient..."
            className="rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="AWAITING_APPROVAL">Soumis admin</option>
          <option value="PAYMENT_PENDING">Paiement attendu</option>
          <option value="CONFIRMED">Confirmés</option>
          <option value="COMPLETED">Terminés</option>
          <option value="CANCELLED">Annulés</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">Aucun rendez-vous trouvé.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Patient", "Médecin", "Date", "Type", "Statut", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a) => {
                const pp = a.patient.patientProfile
                const dp = a.doctor.doctorProfile
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{pp ? `${pp.firstName} ${pp.lastName}` : "—"}</p>
                      {a.patient.phone && <p className="text-xs text-gray-400">{a.patient.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {dp ? (
                        <>
                          <p className="text-gray-900">Dr {dp.firstName} {dp.lastName}</p>
                          <p className="text-xs text-gray-400">{dp.speciality}</p>
                        </>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(a.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {a.status === "PENDING" && <AvailabilityBadge check={a.availabilityCheck} />}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {TYPE_LABEL[a.type] ?? a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      {a.status === "PENDING" && (
                        <button
                          onClick={() => submitToAdmin(a.id)}
                          disabled={submitting === a.id}
                          className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {submitting === a.id ? "..." : "Soumettre admin"}
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

      {/* Modal création RDV — 4 étapes */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">Nouveau rendez-vous</h2>
                <p className="text-xs text-gray-400">Étape {step} / 4</p>
              </div>
              <button onClick={() => setModal(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full bg-gray-100">
              <div className="h-1 bg-blue-600 transition-all" style={{ width: `${(step / 4) * 100}%` }} />
            </div>

            <div className="p-6">
              {success ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                  <p className="font-medium text-gray-900">Rendez-vous créé avec succès !</p>
                  <p className="text-xs text-gray-400">Vous pouvez maintenant le soumettre à l&apos;admin.</p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
                  )}

                  {/* Étape 1 — Recherche patient */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-semibold">Rechercher le patient</h3>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && searchPatients()}
                          placeholder="Nom, email ou téléphone..."
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <button onClick={searchPatients}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                          <Search className="h-4 w-4" />
                        </button>
                      </div>
                      {patientResults.length > 0 && (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {patientResults.map((p) => (
                            <button key={p.id} onClick={() => setSelectedPatient(p)}
                              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                                selectedPatient?.id === p.id ? "border-blue-600 bg-blue-50 light-surface" : "border-gray-200 hover:bg-gray-50"
                              }`}>
                              <p className="font-medium text-gray-900">
                                {p.patientProfile ? `${p.patientProfile.firstName} ${p.patientProfile.lastName}` : p.email}
                              </p>
                              <p className="text-xs text-gray-400">{p.email} {p.patientProfile?.phone ? `· ${p.patientProfile.phone}` : ""}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Étape 2 — Sélection médecin */}
                  {step === 2 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-semibold">Choisir un médecin</h3>
                      </div>
                      {specialities.length > 0 && (
                        <select
                          value={specialityFilter}
                          onChange={(e) => setSpecialityFilter(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none">
                          <option value="">Toutes les spécialités</option>
                          {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                      <div className="max-h-56 space-y-1 overflow-y-auto">
                        {doctors.map((d) => (
                          <button key={d.id} onClick={() => setSelectedDoctor(d)}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                              selectedDoctor?.id === d.id ? "border-blue-600 bg-blue-50 light-surface" : "border-gray-200 hover:bg-gray-50"
                            }`}>
                            <p className="font-medium text-gray-900">
                              Dr {d.doctorProfile?.firstName} {d.doctorProfile?.lastName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {d.doctorProfile?.speciality} · {d.doctorProfile?.consultationFee.toLocaleString()} FCFA
                            </p>
                          </button>
                        ))}
                        {doctors.length === 0 && (
                          <p className="text-center text-xs text-gray-400 py-4">Aucun médecin disponible.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Étape 3 — Créneau + type */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-semibold">Choisir un créneau</h3>
                      </div>
                      <div className="flex gap-2">
                        {[
                          { v: "VIDEO",    l: "Téléconsultation" },
                          { v: "CARE",     l: "Soin domicile" },
                          { v: "SAMPLING", l: "Prélèvement" },
                        ].map(({ v, l }) => (
                          <button key={v} onClick={() => setApptType(v)}
                            className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
                              apptType === v ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
                            }`}>{l}</button>
                        ))}
                      </div>
                      <div className="max-h-56 space-y-1 overflow-y-auto">
                        {slots.map((s) => (
                          <button key={`${s.date}-${s.time}`} onClick={() => setSelectedSlot(s)}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                              selectedSlot?.date === s.date && selectedSlot?.time === s.time
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Étape 4 — Motif + récapitulatif */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">Motif de consultation</h3>
                      <textarea rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        placeholder="Décrivez les symptômes ou la raison de la consultation..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)} />

                      <div className="rounded-xl bg-gray-50 p-4 text-xs space-y-1.5">
                        <p className="font-semibold text-gray-700 mb-2">Récapitulatif</p>
                        <p><span className="text-gray-400">Patient :</span> {selectedPatient?.patientProfile ? `${selectedPatient.patientProfile.firstName} ${selectedPatient.patientProfile.lastName}` : selectedPatient?.email}</p>
                        <p><span className="text-gray-400">Médecin :</span> Dr {selectedDoctor?.doctorProfile?.firstName} {selectedDoctor?.doctorProfile?.lastName}</p>
                        <p><span className="text-gray-400">Créneau :</span> {selectedSlot?.label}</p>
                        <p><span className="text-gray-400">Type :</span> {TYPE_LABEL[apptType]}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer modal */}
            {!success && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <button
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step === 1}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                {step < 4 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={
                      (step === 1 && !selectedPatient) ||
                      (step === 2 && !selectedDoctor) ||
                      (step === 3 && !selectedSlot)
                    }
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
                    Suivant <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={createAppointment}
                    disabled={saving || !reason.trim()}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40">
                    {saving ? "Création..." : "Créer le RDV"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
