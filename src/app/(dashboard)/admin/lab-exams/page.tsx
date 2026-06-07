import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { LabExamActions } from "./LabExamActions"

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:          { label: "En attente",           color: "bg-yellow-100 text-yellow-800" },
  ASSIGNED:         { label: "Agent assigné",         color: "bg-blue-100 text-blue-800" },
  SAMPLE_COLLECTED: { label: "Prélèvement effectué", color: "bg-purple-100 text-purple-800" },
  IN_ANALYSIS:      { label: "En analyse",            color: "bg-orange-100 text-orange-800" },
  RESULTS_READY:    { label: "Résultats disponibles", color: "bg-green-100 text-green-800" },
  DELIVERED:        { label: "Livré",                 color: "bg-gray-100 text-gray-700" },
  CANCELLED:        { label: "Annulé",                color: "bg-red-100 text-red-700" },
}

const EXAM_LABELS: Record<string, string> = {
  BILAN_SANGUIN:"Bilan sanguin", GLYCEMIE:"Glycémie", BILAN_LIPIDIQUE:"Bilan lipidique",
  BILAN_HEPATIQUE:"Bilan hépatique", BILAN_RENAL:"Bilan rénal", BILAN_THYROIDIEN:"Bilan thyroïdien",
  EXAMEN_URINE:"Analyse urinaire", EXAMEN_SELLES:"Parasitologie selles", TEST_PALUDISME:"Test paludisme",
  TEST_VIH:"Sérologie VIH", TEST_GROSSESSE:"Test grossesse", BILAN_COMPLET:"Bilan complet", AUTRE:"Autre",
}

export default async function AdminLabExamsPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const [exams, agents] = await Promise.all([
    prisma.labExam.findMany({
      include: {
        patient: { include: { patientProfile: { select: { firstName: true, lastName: true } } } },
        agent:   { include: { agentProfile:   { select: { firstName: true, lastName: true } } } },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where:   { role: "AGENT_TERRAIN", isActive: true },
      include: { agentProfile: { select: { firstName: true, lastName: true } } },
    }),
  ])

  const pending = exams.filter(e => e.status === "PENDING").length

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Examens de laboratoire</h1>
        <p className="text-sm text-gray-500">
          {pending > 0 ? <span className="font-medium text-orange-600">{pending} en attente d'assignation</span> : "Tous les examens gérés"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Examens demandés</th>
              <th className="px-4 py-3 text-left">Date prévue</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {exams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun examen enregistré.</td>
              </tr>
            ) : exams.map(exam => {
              const s = STATUS_LABEL[exam.status] ?? { label: exam.status, color: "bg-gray-100 text-gray-600" }
              return (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {exam.patient.patientProfile
                      ? `${exam.patient.patientProfile.firstName} ${exam.patient.patientProfile.lastName}`
                      : exam.patient.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {exam.examTypes.slice(0, 2).map(t => (
                        <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          {EXAM_LABELS[t] ?? t}
                        </span>
                      ))}
                      {exam.examTypes.length > 2 && (
                        <span className="text-xs text-gray-400">+{exam.examTypes.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(exam.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {exam.agent?.agentProfile
                      ? `${exam.agent.agentProfile.firstName} ${exam.agent.agentProfile.lastName}`
                      : <span className="text-gray-400 italic">Non assigné</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <LabExamActions exam={exam} agents={agents} />
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
