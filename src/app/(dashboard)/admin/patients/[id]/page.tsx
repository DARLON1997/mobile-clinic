"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Monitor, Smartphone, Tablet } from "lucide-react"
import { STATUS_LABEL, STATUS_COLOR, type PatientActivityStatus } from "@/lib/patient-activity-status"
import { computeActivityStatus } from "@/lib/patient-activity-status"

type Connexion = {
  id:          string
  connectedAt: string
  ipAddress:   string | null
  device:      string
}

type Consultation = {
  id:          string
  scheduledAt: string
  status:      string
  reason:      string
  doctor:      { doctorProfile: { firstName: string; lastName: string; speciality: string } | null }
  consultation?: {
    clinicalNotes?:        string | null
    diagnosis?:            string | null
    prescriptionTexte?:    string | null
    signesSubjectifs?:     string | null
    hypothesesDiagnostic?: string | null
  } | null
}

type PatientData = {
  id:              string
  email:           string
  phone:           string
  createdAt:       string
  lastConnectionAt:string | null
  totalConnections:number
  patientProfile:  { firstName: string; lastName: string; city: string; dateOfBirth: string; gender: string } | null
}

const STATUS_APT_FR: Record<string, string> = {
  PENDING: "En attente", CONFIRMED: "Confirmé", COMPLETED: "Terminé",
  CANCELLED: "Annulé", IN_PROGRESS: "En cours", AWAITING_APPROVAL: "Approbation", REJECTED: "Refusé",
}

function DeviceIcon({ device }: { device: string }) {
  if (device === "Mobile")   return <Smartphone size={14} className="text-[#C8906A]" />
  if (device === "Tablette") return <Tablet     size={14} className="text-blue-400" />
  return <Monitor size={14} className="text-[#888]" />
}

export default function AdminPatientDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()
  const [data,    setData]    = useState<{ patient: PatientData; connexions: Connexion[]; consultations: Consultation[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<"identite" | "journal" | "medical">("identite")

  useEffect(() => {
    fetch(`/api/admin/patients/${id}/journal`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-[#C8906A]" />
    </div>
  )

  const { patient, connexions, consultations } = data ?? {}
  if (!patient) return <div className="py-16 text-center text-[#666]">Patient introuvable.</div>

  const status = computeActivityStatus(patient.lastConnectionAt ? new Date(patient.lastConnectionAt) : null) as PatientActivityStatus

  const TABS = [
    { key: "identite", label: "Identité" },
    { key: "journal",  label: `Journal de connexions (${connexions?.length ?? 0})` },
    { key: "medical",  label: "Activité médicale" },
  ] as const

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#666] hover:text-white transition-colors">
        <ArrowLeft size={16} /> Retour
      </button>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E1E1E] text-lg font-bold text-[#C8906A] ring-2 ring-[rgba(200,144,106,0.3)]">
          {patient.patientProfile?.firstName?.[0] ?? "?"}{patient.patientProfile?.lastName?.[0] ?? ""}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">
            {patient.patientProfile?.firstName} {patient.patientProfile?.lastName}
          </h1>
          <span
            className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: `${STATUS_COLOR[status]}1A`, color: STATUS_COLOR[status] }}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-[#2A2A2A]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color:       tab === key ? "#C8906A" : "#666",
              borderBottom: tab === key ? "2px solid #C8906A" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Identité ─────────────────────────────────────────────────────── */}
      {tab === "identite" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Email",          value: patient.email },
            { label: "Téléphone",      value: patient.phone },
            { label: "Ville",          value: patient.patientProfile?.city ?? "—" },
            { label: "Date d'inscription", value: new Date(patient.createdAt).toLocaleDateString("fr-FR") },
            { label: "Dernière connexion", value: patient.lastConnectionAt ? new Date(patient.lastConnectionAt).toLocaleString("fr-FR") : "Jamais" },
            { label: "Total connexions",   value: String(patient.totalConnections) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
              <p className="text-[11px] text-[#666]">{label}</p>
              <p className="mt-0.5 font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Journal de connexions (CDR) ───────────────────────────────────── */}
      {tab === "journal" && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F] overflow-hidden">
          {!connexions?.length ? (
            <p className="py-12 text-center text-sm text-[#666]">Aucune connexion enregistrée.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#1A1A1A]">
              {connexions.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <DeviceIcon device={c.device} />
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      {new Date(c.connectedAt).toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[11px] text-[#555]">{c.device} — {c.ipAddress ?? "IP inconnue"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Activité médicale (admin uniquement) ─────────────────────────── */}
      {tab === "medical" && (
        <div className="space-y-3">
          {!consultations?.length ? (
            <p className="py-12 text-center text-sm text-[#666]">Aucune consultation enregistrée.</p>
          ) : consultations.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-white">
                  {c.doctor.doctorProfile
                    ? `Dr ${c.doctor.doctorProfile.firstName} ${c.doctor.doctorProfile.lastName}`
                    : "Médecin inconnu"}
                </p>
                <span className="rounded-full bg-[#1E1E1E] px-2.5 py-0.5 text-[11px] text-[#888]">
                  {STATUS_APT_FR[c.status] ?? c.status}
                </span>
              </div>
              <p className="text-[12px] text-[#888]">
                {new Date(c.scheduledAt).toLocaleString("fr-FR")}
              </p>
              <div className="rounded-lg bg-[#0F0F0F] p-3 space-y-1.5 text-[12px]">
                <p><span className="text-[#666]">Motif :</span> <span className="text-[#AAAAAA]">{c.reason}</span></p>
                {c.consultation?.signesSubjectifs && (
                  <p><span className="text-[#666]">Signes :</span> <span className="text-[#AAAAAA]">{c.consultation.signesSubjectifs}</span></p>
                )}
                {c.consultation?.hypothesesDiagnostic && (
                  <p><span className="text-[#666]">Hypothèses :</span> <span className="text-[#AAAAAA]">{c.consultation.hypothesesDiagnostic}</span></p>
                )}
                {c.consultation?.diagnosis && (
                  <p><span className="text-[#666]">Diagnostic :</span> <span className="text-[#AAAAAA]">{c.consultation.diagnosis}</span></p>
                )}
                {c.consultation?.prescriptionTexte && (
                  <p><span className="text-[#666]">Prescription :</span> <span className="text-[#AAAAAA]">{c.consultation.prescriptionTexte}</span></p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
