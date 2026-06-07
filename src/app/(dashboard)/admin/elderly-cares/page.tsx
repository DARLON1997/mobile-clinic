import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ElderlyCareActions } from "./ElderlyCareActions"

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:     { label: "En attente",   color: "bg-yellow-100 text-yellow-800" },
  ASSIGNED:    { label: "Assigné",      color: "bg-blue-100 text-blue-800" },
  ACTIVE:      { label: "Actif",        color: "bg-teal-100 text-teal-800" },
  EN_ROUTE:    { label: "En route",     color: "bg-purple-100 text-purple-800" },
  IN_PROGRESS: { label: "En cours",     color: "bg-orange-100 text-orange-800" },
  COMPLETED:   { label: "Terminé",      color: "bg-green-100 text-green-800" },
  CANCELLED:   { label: "Annulé",       color: "bg-red-100 text-red-700" },
}

const FREQ_LABELS: Record<string, string> = {
  PONCTUEL: "Ponctuel", QUOTIDIEN: "Quotidien", HEBDOMADAIRE: "Hebdomadaire", MENSUEL: "Mensuel",
}

export default async function AdminElderlyCaresPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const [cares, agents] = await Promise.all([
    prisma.elderlyCare.findMany({
      include: {
        patient: { include: { patientProfile: { select: { firstName: true, lastName: true } } } },
        agent:   { include: { agentProfile:   { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.user.findMany({
      where:   { role: "AGENT_TERRAIN", isActive: true },
      include: { agentProfile: { select: { firstName: true, lastName: true } } },
    }),
  ])

  const pending   = cares.filter(c => c.status === "PENDING").length
  const todayCares = cares.filter(c => {
    const d = new Date(c.scheduledAt)
    const now = new Date()
    return d.toDateString() === now.toDateString() && !["COMPLETED","CANCELLED"].includes(c.status)
  })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Soins personnes âgées</h1>
        <div className="flex gap-4 mt-1">
          {pending > 0 && (
            <p className="text-sm font-medium text-orange-600">{pending} en attente d&apos;assignation</p>
          )}
          {todayCares.length > 0 && (
            <p className="text-sm font-medium text-blue-600">{todayCares.length} visite(s) aujourd&apos;hui</p>
          )}
        </div>
      </div>

      {todayCares.length > 0 && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="mb-2 text-sm font-semibold text-blue-800">Interventions du jour</p>
          <div className="space-y-2">
            {todayCares.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span className="font-medium text-gray-800">
                  {c.patient.patientProfile
                    ? `${c.patient.patientProfile.firstName} ${c.patient.patientProfile.lastName}`
                    : c.patient.email}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(c.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {c.agent?.agentProfile && ` — ${c.agent.agentProfile.firstName} ${c.agent.agentProfile.lastName}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Fréquence</th>
              <th className="px-4 py-3 text-left">Date / Heure</th>
              <th className="px-4 py-3 text-left">Durée</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cares.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun soin senior enregistré.</td>
              </tr>
            ) : cares.map(care => {
              const s = STATUS_LABEL[care.status] ?? { label: care.status, color: "bg-gray-100 text-gray-600" }
              return (
                <tr key={care.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {care.patient.patientProfile
                      ? `${care.patient.patientProfile.firstName} ${care.patient.patientProfile.lastName}`
                      : care.patient.email}
                    {care.patientAge && <span className="ml-1 text-xs text-gray-400">({care.patientAge} ans)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{FREQ_LABELS[care.frequency] ?? care.frequency}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(care.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{care.duration / 60}h</td>
                  <td className="px-4 py-3 text-gray-600">
                    {care.agent?.agentProfile
                      ? `${care.agent.agentProfile.firstName} ${care.agent.agentProfile.lastName}`
                      : <span className="text-gray-400 italic">Non assigné</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ElderlyCareActions care={care} agents={agents} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
