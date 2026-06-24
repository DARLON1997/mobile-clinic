"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Loader2, Monitor, Smartphone, Tablet, Gift, ChevronDown, ChevronRight } from "lucide-react"
import { STATUS_LABEL, STATUS_COLOR, type PatientActivityStatus } from "@/lib/patient-activity-status"
import { computeActivityStatus } from "@/lib/patient-activity-status"
import { cn } from "@/lib/utils"

type Connexion = { id: string; connectedAt: string; ipAddress: string | null; device: string }

type Consultation = {
  id: string; scheduledAt: string; status: string; reason: string
  doctor: { doctorProfile: { firstName: string; lastName: string; speciality: string } | null }
  consultation?: {
    clinicalNotes?: string | null; diagnosis?: string | null
    prescriptionTexte?: string | null; signesSubjectifs?: string | null
    hypothesesDiagnostic?: string | null
  } | null
}

type PatientData = {
  id: string; email: string; phone: string; createdAt: string
  lastConnectionAt: string | null; totalConnections: number
  patientProfile: { firstName: string; lastName: string; city: string; dateOfBirth: string; gender: string } | null
}

type ReferralNode = {
  id: string; nom: string; inscritLe: string; active: boolean; niveau: number; filleuls: ReferralNode[]
}

type ReferralDetail = {
  patient: { nom: string; prenom: string; telephone: string; referralCode: string }
  totalPoints: number
  chaineComplete: ReferralNode[]
  historiqueTransactions: {
    id: string; level: number; pointsAwarded: number; createdAt: string; triggeredByName: string
  }[]
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

function ReferralTree({ nodes, maxDepth = 2 }: { nodes: ReferralNode[]; maxDepth?: number }) {
  const [expanded, setExpanded] = useState(false)
  if (nodes.length === 0) return null

  const visible = expanded ? nodes : nodes.slice(0, 3)

  return (
    <ul className="space-y-1.5">
      {visible.map((node) => (
        <li key={node.id}>
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
            "border border-[#1A1A1A] bg-[#0F0F0F]"
          )}>
            <span className={cn(
              "h-2 w-2 rounded-full flex-shrink-0",
              node.active ? "bg-green-500" : "bg-[#444]"
            )} />
            <span className="text-white font-medium flex-1">{node.nom}</span>
            <span className="text-[11px] text-[#555]">
              {new Date(node.inscritLe).toLocaleDateString("fr-FR")}
            </span>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              node.active ? "bg-green-500/10 text-green-400" : "bg-[#1A1A1A] text-[#555]"
            )}>
              {node.active ? "Activé" : "En attente"}
            </span>
          </div>
          {node.filleuls.length > 0 && node.niveau < maxDepth && (
            <div className="ml-5 mt-1.5 border-l border-[#2A2A2A] pl-3">
              <ReferralTree nodes={node.filleuls} maxDepth={maxDepth} />
            </div>
          )}
          {node.filleuls.length > 0 && node.niveau >= maxDepth && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="ml-5 mt-1 flex items-center gap-1 text-[11px] text-[#666] hover:text-[#C8906A]"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {node.filleuls.length} filleul{node.filleuls.length > 1 ? "s" : ""} de niveau {node.niveau + 1}
            </button>
          )}
        </li>
      ))}
      {nodes.length > 3 && !expanded && (
        <li>
          <button onClick={() => setExpanded(true)}
            className="text-xs text-[#C8906A] hover:underline ml-1">
            + Voir {nodes.length - 3} filleul{nodes.length - 3 > 1 ? "s" : ""} supplémentaire{nodes.length - 3 > 1 ? "s" : ""}
          </button>
        </li>
      )}
    </ul>
  )
}

type TabKey = "identite" | "journal" | "medical" | "parrainage"

export default function AdminPatientDetailPage() {
  const { id }        = useParams<{ id: string }>()
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const initialTab    = (searchParams.get("tab") ?? "identite") as TabKey
  const [tab, setTab] = useState<TabKey>(initialTab)

  useEffect(() => {
    const t = searchParams.get("tab") as TabKey | null
    if (t) setTab(t)
  }, [searchParams])

  const { data, isLoading } = useQuery<{
    patient: PatientData; connexions: Connexion[]; consultations: Consultation[]
  }>({
    queryKey: ["admin-patient-detail", id],
    queryFn:  () => fetch(`/api/admin/patients/${id}/journal`).then(r => r.json()),
  })

  const { data: referralData, isLoading: referralLoading } = useQuery<ReferralDetail>({
    queryKey: ["admin-patient-referral", id],
    queryFn:  () => fetch(`/api/admin/referrals/${id}`).then(r => r.json()),
    enabled:  tab === "parrainage",
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-[#C8906A]" />
    </div>
  )

  const { patient, connexions, consultations } = data ?? {}
  if (!patient) return <div className="py-16 text-center text-[#666]">Patient introuvable.</div>

  const status = computeActivityStatus(
    patient.lastConnectionAt ? new Date(patient.lastConnectionAt) : null
  ) as PatientActivityStatus

  const TABS = [
    { key: "identite",    label: "Identité" },
    { key: "journal",     label: `Journal de connexions (${connexions?.length ?? 0})` },
    { key: "medical",     label: "Activité médicale" },
    { key: "parrainage",  label: "🎁 Parrainage" },
  ] as const

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[#666] hover:text-white transition-colors">
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

      <div className="flex gap-1 border-b border-[#2A2A2A] overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors"
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
            { label: "Email",              value: patient.email },
            { label: "Téléphone",          value: patient.phone },
            { label: "Ville",              value: patient.patientProfile?.city ?? "—" },
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
                    <p className="text-sm text-white">{new Date(c.connectedAt).toLocaleString("fr-FR")}</p>
                    <p className="text-[11px] text-[#555]">{c.device} — {c.ipAddress ?? "IP inconnue"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              <p className="text-[12px] text-[#888]">{new Date(c.scheduledAt).toLocaleString("fr-FR")}</p>
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

      {tab === "parrainage" && (
        <div className="space-y-5">
          {referralLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#C8906A]" />
            </div>
          ) : !referralData ? (
            <p className="py-12 text-center text-sm text-[#666]">Données de parrainage indisponibles.</p>
          ) : (
            <>
              {/* En-tête parrainage */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
                  <p className="text-[11px] text-[#666] mb-1">Code de parrainage</p>
                  <code className="text-lg font-bold text-[#C8906A] tracking-widest">
                    {referralData.patient.referralCode}
                  </code>
                </div>
                <div className="rounded-xl border border-[rgba(200,144,106,0.3)] bg-[rgba(200,144,106,0.05)] p-5">
                  <p className="text-[11px] text-[#C8906A]/70 mb-1">Total de points</p>
                  <p className="text-3xl font-bold text-[#C8906A]">
                    {referralData.totalPoints.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Arbre des filleuls */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-[#C8906A]" />
                  Chaîne de filleuls
                  {referralData.chaineComplete.length === 0 && (
                    <span className="text-[#555] font-normal text-xs">(aucun filleul)</span>
                  )}
                </h3>
                {referralData.chaineComplete.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#2A2A2A] py-8 text-center">
                    <p className="text-sm text-[#555]">Ce patient n'a pas encore parrainé d'autres utilisateurs.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                    <ReferralTree nodes={referralData.chaineComplete} maxDepth={2} />
                  </div>
                )}
              </div>

              {/* Historique des transactions */}
              {referralData.historiqueTransactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Historique des transactions</h3>
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] overflow-hidden divide-y divide-[#141414]">
                    {referralData.historiqueTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                        <div>
                          <p className="text-white">Via {t.triggeredByName}</p>
                          <p className="text-[11px] text-[#555] mt-0.5">
                            Niveau {t.level} · {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <span className="font-bold text-[#C8906A]">+{t.pointsAwarded.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
