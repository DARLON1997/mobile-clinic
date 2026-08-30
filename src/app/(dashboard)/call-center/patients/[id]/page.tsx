"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Monitor, Smartphone, Tablet, Phone, Gift, Users } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { STATUS_LABEL, STATUS_COLOR, computeActivityStatus } from "@/lib/patient-activity-status"
import type { PatientActivityStatus } from "@/lib/patient-activity-status"

// ⚠️ Règle sécurité : pas d'onglet "Activité médicale" ni de détail de chaîne filleuls.
// L'onglet Parrainage affiche uniquement totalPoints + nombreFilleulsDirects (chiffres seuls).

type Connexion = { id: string; connectedAt: string; ipAddress: string | null; device: string }
type Patient   = {
  id: string; email: string; phone: string; createdAt: string
  lastConnectionAt: string | null; totalConnections: number
  patientProfile: { firstName: string; lastName: string; city: string } | null
}

type CCReferralRow = {
  totalPoints: number
  nombreFilleulsDirects: number
}

function DeviceIcon({ device }: { device: string }) {
  if (device === "Mobile")   return <Smartphone size={14} className="text-blue-600" />
  if (device === "Tablette") return <Tablet     size={14} className="text-blue-400" />
  return <Monitor size={14} className="text-gray-400" />
}

type TabKey = "identite" | "journal" | "parrainage"

export default function CallCenterPatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab,   setTab] = useState<TabKey>("identite")

  const { data, isLoading } = useQuery<{ patient: Patient; connexions: Connexion[] }>({
    queryKey: ["cc-patient-detail", id],
    queryFn:  () => fetch(`/api/call-center/patients/${id}/journal`).then(r => r.json()),
  })

  // Récupère les stats parrainage de la liste CC (filtrée sur ce patient)
  const { data: refData, isLoading: refLoading } = useQuery<CCReferralRow | null>({
    queryKey: ["cc-referral-patient", id],
    queryFn:  async () => {
      const res  = await fetch(`/api/call-center/referrals?limit=1000`)
      const json = await res.json()
      const row = (json.patients ?? []).find((p: { id: string }) => p.id === id)
      return row ?? null
    },
    enabled: tab === "parrainage",
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
    </div>
  )

  const { patient, connexions } = data ?? {}
  if (!patient) return <div className="py-16 text-center text-gray-400">Patient introuvable.</div>

  const status = computeActivityStatus(
    patient.lastConnectionAt ? new Date(patient.lastConnectionAt) : null
  ) as PatientActivityStatus

  const TABS = [
    { key: "identite",   label: "Identité" },
    { key: "journal",    label: `Journal de connexions (${connexions?.length ?? 0})` },
    { key: "parrainage", label: "🎁 Parrainage" },
    // ⚠️ PAS d'onglet "Activité médicale" — volontairement absent pour Call Center
  ] as const

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <BackButton />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-600 ring-2 ring-blue-100">
            {patient.patientProfile?.firstName?.[0] ?? "?"}{patient.patientProfile?.lastName?.[0] ?? ""}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
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
          className="flex items-center gap-2 rounded-xl border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Phone size={16} /> Appeler
        </a>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color:        tab === key ? "#2563eb" : "#6b7280",
              borderBottom: tab === key ? "2px solid #2563eb" : "2px solid transparent",
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
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="mt-0.5 font-medium text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "journal" && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {!connexions?.length ? (
            <p className="py-12 text-center text-sm text-gray-400">Aucune connexion enregistrée.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {connexions.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <DeviceIcon device={c.device} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{new Date(c.connectedAt).toLocaleString("fr-FR")}</p>
                    <p className="text-[11px] text-gray-400">{c.device} — {c.ipAddress ?? "IP inconnue"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "parrainage" && (
        <div className="space-y-4">
          {refLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-4 w-4 text-blue-600" />
                    <p className="text-[11px] text-blue-600/70">Points de parrainage</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {refData ? refData.totalPoints.toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <p className="text-[11px] text-gray-400">Filleuls directs</p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {refData ? refData.nombreFilleulsDirects : 0}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                Vue allégée — le détail de la chaîne n'est pas accessible depuis le Call Center.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
