import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import Link         from "next/link"
import { Button }   from "@/components/ui/button"
import { AppointmentStatusBadge } from "@/components/shared/StatusBadge"
import { formatDateFR } from "@/lib/utils"
import { Video, FileText } from "lucide-react"
import type { AppointmentWithRelations } from "@/types"

interface SearchParams { searchParams: Promise<{ filter?: string }> }

export default async function DoctorAppointmentsPage({ searchParams }: SearchParams) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") redirect("/unauthorized")

  const { filter } = await searchParams

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)

  const extraWhere =
    filter === "today" ? { scheduledAt: { gte: today, lt: new Date(today.getTime() + 86_400_000) } } :
    filter === "week"  ? { scheduledAt: { gte: today, lt: weekEnd } } :
    {}

  const appointments = await prisma.appointment.findMany({
    where: { doctorId: session.user.id, adminApprovedAt: { not: null }, ...extraWhere },
    include: {
      patient: { select: { id: true, email: true, phone: true,
        patientProfile: { select: { firstName: true, lastName: true } } } },
      doctor:  { select: { id: true, email: true,
        doctorProfile: { select: { firstName: true, lastName: true, speciality: true, consultationFee: true } } } },
      payment:      { select: { status: true, amount: true } },
      consultation: { select: { id: true, diagnosis: true, prescriptionUrl: true } },
    },
    orderBy: { scheduledAt: "asc" },
  }) as unknown as AppointmentWithRelations[]

  const FILTERS = [
    { value: "",      label: "Tous" },
    { value: "today", label: "Aujourd'hui" },
    { value: "week",  label: "Cette semaine" },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes rendez-vous</h1>
        <p className="text-sm text-gray-500">Uniquement les RDV approuvés par l&apos;Admin</p>
      </div>

      <div className="mb-6 flex gap-2">
        {FILTERS.map(({ value, label }) => (
          <Link key={value} href={value ? `?filter=${value}` : "/doctor/appointments"}>
            <button className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              (filter ?? "") === value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            }`}>
              {label}
            </button>
          </Link>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          Aucun rendez-vous pour ce filtre.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Motif</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map((appt) => {
                const patientName = appt.patient.patientProfile
                  ? `${appt.patient.patientProfile.firstName} ${appt.patient.patientProfile.lastName}`
                  : appt.patient.email
                return (
                  <tr key={appt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {formatDateFR(appt.scheduledAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{patientName}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{appt.reason}</td>
                    <td className="px-4 py-3">
                      <AppointmentStatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3">
                      {(appt.status === "CONFIRMED" || appt.status === "IN_PROGRESS") && (
                        <Link href={`/doctor/consultation/${appt.id}`}>
                          <Button size="sm" className="h-7 px-2 text-xs">
                            <Video className="h-3 w-3" /> Rejoindre
                          </Button>
                        </Link>
                      )}
                      {appt.status === "COMPLETED" && appt.consultation?.prescriptionUrl && (
                        <a href={appt.consultation.prescriptionUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                            <FileText className="h-3 w-3" /> Ordonnance
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
