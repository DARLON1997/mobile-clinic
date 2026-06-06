import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import Link         from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { AppointmentStatusBadge } from "@/components/shared/StatusBadge"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { Button } from "@/components/ui/button"
import { formatDateFR } from "@/lib/utils"
import { Video, Calendar, FileText, Lock } from "lucide-react"

export default async function DoctorDashboard() {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") redirect("/unauthorized")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const [nextAppt, todayAppts, countOrdo] = await Promise.all([
    // Prochain RDV approuvé et confirmé
    prisma.appointment.findFirst({
      where: {
        doctorId:        session.user.id,
        adminApprovedAt: { not: null },
        status:          { in: ["CONFIRMED", "IN_PROGRESS", "PAYMENT_PENDING"] },
        scheduledAt:     { gte: new Date() },
      },
      include: {
        patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId:        session.user.id,
        adminApprovedAt: { not: null },
        scheduledAt:     { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.consultation.count({ where: { appointment: { doctorId: session.user.id } } }),
  ])

  const now = new Date()
  const isVideoActive = nextAppt
    ? (now >= new Date(nextAppt.scheduledAt.getTime() - 5 * 60 * 1000) &&
       now <= new Date(nextAppt.scheduledAt.getTime() + 60 * 60 * 1000))
    : false

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {session.user.name ?? "Docteur"}
          </h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Disponible
          </span>
          <NotificationBell />
        </div>
      </div>

      {/* Alerte règle critique */}
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <p>L&apos;accès au dossier patient n&apos;est autorisé que si l&apos;Admin a approuvé le rendez-vous.</p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Calendar, label: "RDV aujourd'hui",  value: todayAppts.length, color: "text-blue-600",  bg: "bg-blue-50" },
          { icon: Video,    label: "Consultations en cours", value: todayAppts.filter((a) => a.status === "IN_PROGRESS").length, color: "text-green-600", bg: "bg-green-50" },
          { icon: FileText, label: "Ordonnances rédigées",   value: countOrdo, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl p-3 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prochain RDV */}
      {nextAppt && (
        <Card className="mb-6 border-2 border-blue-100 bg-blue-50/30">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-600 tracking-wide">Prochain rendez-vous</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {nextAppt.patient.patientProfile
                  ? `${nextAppt.patient.patientProfile.firstName} ${nextAppt.patient.patientProfile.lastName}`
                  : "Patient"
                }
              </p>
              <p className="text-sm text-gray-500">{formatDateFR(nextAppt.scheduledAt)}</p>
              <AppointmentStatusBadge status={nextAppt.status} />
            </div>
            <Link href={`/doctor/consultation/${nextAppt.id}`}>
              <Button
                variant={isVideoActive ? "default" : "outline"}
                className={isVideoActive ? "animate-pulse" : "opacity-60"}
                disabled={!isVideoActive && nextAppt.status !== "IN_PROGRESS"}
              >
                <Video className="h-4 w-4" />
                {isVideoActive ? "Rejoindre" : "Pas encore disponible"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Planning du jour */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Planning du jour</h2>
        {todayAppts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
            Aucun rendez-vous approuvé aujourd&apos;hui.
          </div>
        ) : (
          <div className="space-y-2">
            {todayAppts.map((appt) => {
              const name = appt.patient.patientProfile
                ? `${appt.patient.patientProfile.firstName} ${appt.patient.patientProfile.lastName}`
                : "Patient"
              return (
                <div key={appt.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">
                      {appt.scheduledAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AppointmentStatusBadge status={appt.status} />
                    {(appt.status === "CONFIRMED" || appt.status === "IN_PROGRESS") && (
                      <Link href={`/doctor/consultation/${appt.id}`}>
                        <Button size="sm" className="h-8 px-3 text-xs">
                          <Video className="h-3 w-3" /> Ouvrir
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
