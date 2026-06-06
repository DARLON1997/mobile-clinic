import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import { FileText, Download, Copy } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function PrescriptionsPage() {
  const session = await auth()
  if (session?.user.role !== "PATIENT") redirect("/unauthorized")

  const consultations = await prisma.consultation.findMany({
    where: {
      appointment: { patientId: session.user.id },
      prescriptionUrl: { not: null },
    },
    include: {
      appointment: {
        select: {
          scheduledAt: true,
          doctor: { select: { doctorProfile: { select: { firstName: true, lastName: true, speciality: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes ordonnances</h1>
        <p className="text-sm text-gray-500">{consultations.length} ordonnance{consultations.length > 1 ? "s" : ""}</p>
      </div>

      {consultations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-400">Vos ordonnances numériques apparaîtront ici.</p>
          <p className="mt-1 text-xs text-gray-300">Format PDF — téléchargeables à tout moment.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {consultations.map((consult, idx) => {
            const dp = consult.appointment.doctor.doctorProfile
            const prescNum = `MC-${new Date(consult.createdAt).getFullYear()}-${String(idx + 1).padStart(5, "0")}`
            return (
              <div key={consult.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-red-50 p-2">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-semibold text-gray-900">{prescNum}</p>
                    <p className="text-xs text-gray-400">{formatDate(consult.appointment.scheduledAt)}</p>
                  </div>
                </div>

                {dp && (
                  <div className="mb-3 text-sm">
                    <p className="font-medium text-gray-900">Dr {dp.firstName} {dp.lastName}</p>
                    <p className="text-xs text-gray-500">{dp.speciality}</p>
                  </div>
                )}

                {consult.diagnosis && (
                  <p className="mb-3 text-xs text-gray-500 truncate">
                    {consult.diagnosis}
                  </p>
                )}

                <div className="mt-auto flex gap-2">
                  <a
                    href={consult.prescriptionUrl!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Télécharger
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(consult.prescriptionUrl!)
                    }}
                    className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Copier le lien"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
