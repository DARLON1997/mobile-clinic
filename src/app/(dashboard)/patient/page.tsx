import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import Link         from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AppointmentStatusBadge } from "@/components/shared/StatusBadge"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { formatDateFR, formatXAF } from "@/lib/utils"
import { CalendarPlus, Home, FileText, Video } from "lucide-react"

export default async function PatientDashboard() {
  const session = await auth()
  if (session?.user.role !== "PATIENT") redirect("/unauthorized")

  const today = new Date()

  const [profile, nextAppt, recentHistory] = await Promise.all([
    prisma.patientProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.appointment.findFirst({
      where: {
        patientId: session.user.id,
        status:    { in: ["CONFIRMED", "IN_PROGRESS", "PAYMENT_PENDING", "AWAITING_APPROVAL"] },
        scheduledAt: { gte: today },
      },
      include: {
        doctor: { select: {
          doctorProfile: { select: { firstName: true, lastName: true, speciality: true } },
        } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where:   { patientId: session.user.id, status: "COMPLETED" },
      take:    3,
      orderBy: { scheduledAt: "desc" },
      include: {
        doctor:       { select: { doctorProfile: { select: { firstName: true, lastName: true } } } },
        consultation: { select: { diagnosis: true } },
      },
    }),
  ])

  const firstName = profile?.firstName ?? session.user.name?.split(" ")[0] ?? "Patient"

  const now = new Date()
  const isVideoActive = nextAppt?.status === "CONFIRMED"
    ? (now >= new Date(nextAppt.scheduledAt.getTime() - 5 * 60 * 1000) &&
       now <= new Date(nextAppt.scheduledAt.getTime() + 60 * 60 * 1000))
    : false

  const minutesLeft = nextAppt
    ? Math.max(0, Math.ceil((nextAppt.scheduledAt.getTime() - now.getTime()) / 60000))
    : null

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {firstName} 👋</h1>
          <p className="text-sm text-gray-500">
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <NotificationBell />
      </div>

      {/* Prochain RDV */}
      {nextAppt ? (
        <Card className="mb-6 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white light-surface">
          <CardContent className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">Prochain rendez-vous</p>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {nextAppt.doctor.doctorProfile
                    ? `Dr ${nextAppt.doctor.doctorProfile.firstName} ${nextAppt.doctor.doctorProfile.lastName}`
                    : "Médecin"
                  }
                </p>
                {nextAppt.doctor.doctorProfile && (
                  <p className="text-sm text-gray-500">{nextAppt.doctor.doctorProfile.speciality}</p>
                )}
                <p className="mt-1 text-sm text-gray-600">{formatDateFR(nextAppt.scheduledAt)}</p>
                <div className="mt-2">
                  <AppointmentStatusBadge status={nextAppt.status} />
                </div>
                {minutesLeft !== null && minutesLeft <= 60 && nextAppt.status === "CONFIRMED" && (
                  <p className="mt-1 text-xs font-medium text-blue-600">
                    Dans {minutesLeft < 1 ? "moins d'1 min" : `${minutesLeft} min`}
                  </p>
                )}
              </div>
              {nextAppt.status === "CONFIRMED" && (
                <Link href={`/patient/consultation/${nextAppt.id}`}>
                  <Button
                    variant={isVideoActive ? "default" : "outline"}
                    size="sm"
                    className={isVideoActive ? "animate-pulse" : "opacity-50"}
                    disabled={!isVideoActive}
                  >
                    <Video className="h-4 w-4" />
                    {isVideoActive ? "Rejoindre" : "Bientôt disponible"}
                  </Button>
                </Link>
              )}
              {nextAppt.status === "PAYMENT_PENDING" && (
                <Link href="/patient/appointments">
                  <Button size="sm">Payer maintenant</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-dashed">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-50 p-3">
              <CalendarPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Pas de rendez-vous à venir</p>
              <p className="text-sm text-gray-400">Prenez votre prochain rendez-vous</p>
            </div>
            <Link href="/patient/book" className="ml-auto shrink-0">
              <Button size="sm">Prendre RDV</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Actions rapides */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: CalendarPlus, label: "Prendre un rendez-vous", href: "/patient/book",         bg: "bg-blue-600" },
          { icon: Home,         label: "Soin à domicile",         href: "/patient/home-visit",  bg: "bg-green-600" },
          { icon: FileText,     label: "Mes ordonnances",          href: "/patient/prescriptions", bg: "bg-purple-600" },
        ].map(({ icon: Icon, label, href, bg }) => (
          <Link key={href} href={href}>
            <div className={`flex cursor-pointer items-center gap-3 rounded-xl p-4 text-white transition-opacity hover:opacity-90 ${bg}`}>
              <Icon className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium leading-snug">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Historique récent */}
      {recentHistory.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Consultations récentes</h2>
            <Link href="/patient/appointments" className="text-xs text-blue-600 hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-2">
            {recentHistory.map((appt) => (
              <div key={appt.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {appt.doctor.doctorProfile
                      ? `Dr ${appt.doctor.doctorProfile.firstName} ${appt.doctor.doctorProfile.lastName}`
                      : "Médecin"
                    }
                  </p>
                  <p className="text-xs text-gray-400">{formatDateFR(appt.scheduledAt)}</p>
                  {appt.consultation?.diagnosis && (
                    <p className="mt-0.5 text-xs text-gray-500 truncate max-w-[220px]">
                      {appt.consultation.diagnosis}
                    </p>
                  )}
                </div>
                <AppointmentStatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
