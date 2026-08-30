import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NursingCareActions } from "./NursingCareActions"

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:     { label: "En attente",   color: "bg-yellow-100 text-yellow-800" },
  ASSIGNED:    { label: "Assigné",      color: "bg-blue-100 text-blue-800" },
  EN_ROUTE:    { label: "En route",     color: "bg-purple-100 text-purple-800" },
  IN_PROGRESS: { label: "En cours",     color: "bg-orange-100 text-orange-800" },
  COMPLETED:   { label: "Terminé",      color: "bg-green-100 text-green-800" },
  CANCELLED:   { label: "Annulé",       color: "bg-red-100 text-red-700" },
}

const CARE_LABELS: Record<string, string> = {
  PRISE_TENSION:"Prise de tension", INJECTION:"Injection", PANSEMENT:"Pansement",
  PERFUSION:"Perfusion", PRISE_DE_SANG:"Prise de sang", SUIVI_POST_OPERATOIRE:"Suivi post-op.",
  ADMINISTRATION_MED:"Administration méd.", SOINS_PLAIE:"Soin de plaie", AUTRE_SOIN:"Autre",
}

export default async function AdminNursingCaresPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const [cares, agents] = await Promise.all([
    prisma.nursingCare.findMany({
      include: {
        patient: { include: { patientProfile: { select: { firstName: true, lastName: true } } } },
        agent:   { include: { agentProfile:   { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where:   { role: "AGENT_TERRAIN", isActive: true },
      include: { agentProfile: { select: { firstName: true, lastName: true } } },
    }),
  ])

  const pending = cares.filter(c => c.status === "PENDING").length

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Soins infirmiers</h1>
        <p className="text-sm text-gray-500">
          {pending > 0 ? <span className="font-medium text-orange-600">{pending} en attente d&apos;assignation</span> : "Tous les soins gérés"}
        </p>
      </div>

      {cares.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
          Aucun soin infirmier enregistré.
        </div>
      ) : (
        <>
          {/* Desktop : tableau — inchangé */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Soins demandés</th>
                  <th className="px-4 py-3 text-left">Date prévue</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cares.map(care => {
                  const s = STATUS_LABEL[care.status] ?? { label: care.status, color: "bg-gray-100 text-gray-600" }
                  return (
                    <tr key={care.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {care.patient.patientProfile
                          ? `${care.patient.patientProfile.firstName} ${care.patient.patientProfile.lastName}`
                          : care.patient.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {care.careTypes.slice(0, 2).map(t => (
                            <span key={t} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                              {CARE_LABELS[t] ?? t}
                            </span>
                          ))}
                          {care.careTypes.length > 2 && <span className="text-xs text-gray-400">+{care.careTypes.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(care.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {care.agent?.agentProfile
                          ? `${care.agent.agentProfile.firstName} ${care.agent.agentProfile.lastName}`
                          : <span className="text-gray-400 italic">Non assigné</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <NursingCareActions care={care} agents={agents} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile : liste de cartes empilées (audit C4) */}
          <div className="flex flex-col gap-3 md:hidden">
            {cares.map(care => {
              const s = STATUS_LABEL[care.status] ?? { label: care.status, color: "bg-gray-100 text-gray-600" }
              return (
                <div key={care.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-800">
                      {care.patient.patientProfile
                        ? `${care.patient.patientProfile.firstName} ${care.patient.patientProfile.lastName}`
                        : care.patient.email}
                    </p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                  </div>
                  <div className="mb-3 space-y-1.5 text-sm text-gray-600">
                    <div className="flex flex-wrap gap-1">
                      {care.careTypes.map(t => (
                        <span key={t} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                          {CARE_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-500">
                      {new Date(care.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p>
                      Agent : {care.agent?.agentProfile
                        ? `${care.agent.agentProfile.firstName} ${care.agent.agentProfile.lastName}`
                        : <span className="italic text-gray-400">Non assigné</span>}
                    </p>
                  </div>
                  <NursingCareActions care={care} agents={agents} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
