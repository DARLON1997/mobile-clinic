"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Loader2, Monitor, Smartphone, Tablet, Phone } from "lucide-react"
import { STATUS_LABEL, STATUS_COLOR, computeActivityStatus } from "@/lib/patient-activity-status"
import type { PatientActivityStatus } from "@/lib/patient-activity-status"

// ⚠️ Ce composant ne demande QUE le journal de connexions via l'API Call Center.
// Il n'y a aucun onglet "Activité médicale" — l'exclusion est structurelle.

type Connexion = { id: string; connectedAt: string; ipAddress: string | null; device: string }
type Patient   = {
  id: string; email: string; phone: string; createdAt: string
  lastConnectionAt: string | null; totalConnections: number
  patientProfile: { firstName: string; lastName: string; city: string } | null
}

function DeviceIcon({ device }: { device: string }) {
  if (device === "Mobile")   return <Smartphone size={14} className="text-[#C8906A]" />
  if (device === "Tablette") return <Tablet     size={14} className="text-blue-400" />
  return <Monitor size={14} className="text-[#888]" />
}

export default function CallCenterPatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [tab,   setTab] = useState<"identite" | "journal">("identite")

  const { data, isLoading } = useQuery<{ patient: Patient; connexions: Connexion[] }>({
    queryKey: ["cc-patient-detail", id],
    queryFn:  () => fetch(`/api/call-center/patients/${id}/journal`).then(r => r.json()),
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-[#C8906A]" />
    </div>
  )

  const { patient, connexions } = data ?? {}
  if (!patient) return <div className="py-16 text-center text-[#666]">Patient introuvable.</div>

  const status = computeActivityStatus(patient.lastConnectionAt ? new Date(patient.lastConnectionAt) : null) as PatientActivityStatus

  const TABS = [
    { key: "identite", label: "Identité" },
    { key: "journal",  label: `Journal de connexions (${connexions?.length ?? 0})` },
    // ⚠️ PAS d'onglet "Activité médicale" — volontairement absent pour Call Center
  ] as const

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#666] hover:text-white transition-colors">
        <ArrowLeft size={16} /> Retour
      </button>

      <div className="flex items-center justify-between">
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
        <a
          href={`tel:${patient.phone}`}
          className="flex items-center gap-2 rounded-xl border border-[#C8906A] px-4 py-2 text-sm font-medium text-[#C8906A] hover:bg-[rgba(200,144,106,0.1)] transition-colors"
        >
          <Phone size={16} /> Appeler
        </a>
      </div>

      <div className="flex gap-1 border-b border-[#2A2A2A]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color:        tab === key ? "#C8906A" : "#666",
              borderBottom: tab === key ? "2px solid #C8906A" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "identite" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Email",             value: patient.email },
            { label: "Téléphone",         value: patient.phone },
            { label: "Ville",             value: patient.patientProfile?.city ?? "—" },
            { label: "Date d'inscription",value: new Date(patient.createdAt).toLocaleDateString("fr-FR") },
            { label: "Dernière connexion",value: patient.lastConnectionAt ? new Date(patient.lastConnectionAt).toLocaleString("fr-FR") : "Jamais" },
            { label: "Total connexions",  value: String(patient.totalConnections) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
              <p className="text-[11px] text-[#666]">{label}</p>
              <p className="mt-0.5 font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

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
    </div>
  )
}
