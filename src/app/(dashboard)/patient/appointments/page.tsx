import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import Link         from "next/link"
import { Button }   from "@/components/ui/button"
import { AppointmentStatusBadge } from "@/components/shared/StatusBadge"
import { formatDateFR } from "@/lib/utils"
import { Video, FileText, RefreshCw, Clock, CreditCard } from "lucide-react"
import type { AppointmentWithRelations, AppointmentStatus } from "@/types"

interface SearchParams { searchParams: Promise<{ filter?: string }> }

export default async function PatientAppointmentsPage({ searchParams }: SearchParams) {
  const session = await auth()
  if (session?.user.role !== "PATIENT") redirect("/unauthorized")

  const { filter } = await searchParams

  const extraWhere =
    filter === "upcoming"  ? { scheduledAt: { gte: new Date() }, status: { notIn: ["CANCELLED", "REJECTED", "NO_SHOW", "COMPLETED"] as AppointmentStatus[] } } :
    filter === "past"      ? { status: { in: ["COMPLETED", "NO_SHOW"] as AppointmentStatus[] } } :
    filter === "cancelled" ? { status: { in: ["CANCELLED", "REJECTED"] as AppointmentStatus[] } } :
    {}

  const appointments = await prisma.appointment.findMany({
    where:   { patientId: session.user.id, ...extraWhere },
    include: {
      patient: { select: { id: true, email: true, phone: true,
        patientProfile: { select: { firstName: true, lastName: true } } } },
      doctor:  { select: { id: true, email: true,
        doctorProfile: { select: { firstName: true, lastName: true, speciality: true, consultationFee: true } } } },
      payment:      { select: { status: true, amount: true } },
      consultation: { select: { id: true, diagnosis: true, prescriptionUrl: true } },
    },
    orderBy: { scheduledAt: "desc" },
  }) as unknown as AppointmentWithRelations[]

  const now = new Date()

  const FILTERS = [
    { value: "",          label: "Tous" },
    { value: "upcoming",  label: "À venir" },
    { value: "past",      label: "Passés" },
    { value: "cancelled", label: "Annulés" },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes rendez-vous</h1>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        {FILTERS.map(({ value, label }) => (
          <Link key={value} href={value ? `?filter=${value}` : "/patient/appointments"}>
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
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-gray-400">Aucun rendez-vous pour ce filtre.</p>
          <Link href="/patient/book">
            <Button size="sm" className="mt-4">Prendre un RDV</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const doctorName = appt.doctor.doctorProfile
              ? `Dr ${appt.doctor.doctorProfile.firstName} ${appt.doctor.doctorProfile.lastName}`
              : appt.doctor.email
            const speciality = appt.doctor.doctorProfile?.speciality

            const isActive = appt.status === "IN_PROGRESS"
            const isJoinable = appt.status === "CONFIRMED" &&
              now >= new Date(appt.scheduledAt.getTime() - 5 * 60 * 1000) &&
              now <= new Date(appt.scheduledAt.getTime() + 60 * 60 * 1000)

            const minutesUntil = Math.ceil((appt.scheduledAt.getTime() - now.getTime()) / 60000)

            return (
              <div key={appt.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
                  isActive ? "border-blue-200 bg-blue-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Avatar médecin */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    {appt.doctor.doctorProfile
                      ? `${appt.doctor.doctorProfile.firstName.charAt(0)}${appt.doctor.doctorProfile.lastName.charAt(0)}`
                      : "Dr"
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{doctorName}</p>
                      {speciality && (
                        <span className="text-xs text-gray-400">• {speciality}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDateFR(appt.scheduledAt)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{appt.reason}</p>
                    <div className="mt-2">
                      <AppointmentStatusBadge status={appt.status} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    {appt.status === "AWAITING_APPROVAL" && (
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <Clock className="h-3.5 w-3.5" />
                        En validation...
                      </span>
                    )}
                    {appt.status === "PAYMENT_PENDING" && (
                      <Link href={`/patient/book?pay=${appt.id}`}>
                        <Button size="sm" className="text-xs h-8">
                          <CreditCard className="h-3.5 w-3.5" />
                          Payer
                        </Button>
                      </Link>
                    )}
                    {(isJoinable || isActive) && (
                      <Link href={`/patient/consultation/${appt.id}`}>
                        <Button size="sm" className={`text-xs h-8 ${isActive ? "animate-pulse" : ""}`}>
                          <Video className="h-3.5 w-3.5" />
                          {isActive ? "Rejoindre" : minutesUntil <= 5 ? "Rejoindre" : `Dans ${minutesUntil}min`}
                        </Button>
                      </Link>
                    )}
                    {appt.status === "CONFIRMED" && !isJoinable && (
                      <span className="text-xs text-gray-400">
                        Dans {minutesUntil > 60 ? `${Math.ceil(minutesUntil / 60)}h` : `${minutesUntil}min`}
                      </span>
                    )}
                    {appt.status === "COMPLETED" && appt.consultation?.prescriptionUrl && (
                      <a href={appt.consultation.prescriptionUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="text-xs h-8">
                          <FileText className="h-3.5 w-3.5" />
                          Ordonnance
                        </Button>
                      </a>
                    )}
                    {appt.status === "CANCELLED" && (
                      <Link href="/patient/book">
                        <Button size="sm" variant="outline" className="text-xs h-8">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reprogrammer
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
