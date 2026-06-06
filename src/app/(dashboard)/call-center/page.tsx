import { auth }     from "@/auth"
import { redirect }  from "next/navigation"
import { prisma }    from "@/lib/prisma"
import Link          from "next/link"
import { formatXAF } from "@/lib/utils"
import {
  CalendarDays, Clock, Home, TestTube2, AlertCircle, ChevronRight,
} from "lucide-react"

const STATUS_COLOR: Record<string, string> = {
  PENDING:           "bg-gray-100 text-gray-600",
  AWAITING_APPROVAL: "bg-amber-100 text-amber-700",
  PAYMENT_PENDING:   "bg-orange-100 text-orange-700",
  CONFIRMED:         "bg-blue-100 text-blue-700",
  IN_PROGRESS:       "bg-purple-100 text-purple-700",
  COMPLETED:         "bg-green-100 text-green-700",
  CANCELLED:         "bg-red-100 text-red-700",
  REJECTED:          "bg-red-50 text-red-500",
}
const STATUS_LABEL: Record<string, string> = {
  PENDING:           "En attente",
  AWAITING_APPROVAL: "Soumis admin",
  PAYMENT_PENDING:   "Paiement attendu",
  CONFIRMED:         "Confirmé",
  IN_PROGRESS:       "En cours",
  COMPLETED:         "Terminé",
  CANCELLED:         "Annulé",
  REJECTED:          "Rejeté",
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function getWeekDays() {
  const today = new Date()
  const dow   = today.getDay() === 0 ? 6 : today.getDay() - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default async function CallCenterDashboard() {
  const session = await auth()
  if (session?.user.role !== "CALL_CENTER_AGENT") redirect("/unauthorized")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const weekStart = getWeekDays()[0]
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const [todayCount, pendingCount, homeVisitCount, weekAppointments, alerts] = await Promise.all([
    prisma.appointment.count({
      where: { scheduledAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.count({
      where: { status: "PENDING" },
    }),
    prisma.homeVisit.count({
      where: { status: { in: ["PENDING", "ASSIGNED", "EN_ROUTE", "ARRIVED"] } },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: weekStart, lt: weekEnd } },
      select: {
        id: true, scheduledAt: true, status: true,
        patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } },
        doctor:  { select: { doctorProfile:  { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "asc" },
      select: {
        id: true, scheduledAt: true,
        patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ])

  const weekDays = getWeekDays()

  const kpis = [
    { icon: CalendarDays, label: "RDV aujourd'hui",        value: todayCount,     color: "text-blue-600",   bg: "bg-blue-50" },
    { icon: Clock,        label: "En attente soumission",  value: pendingCount,   color: "text-amber-600",  bg: "bg-amber-50" },
    { icon: Home,         label: "Soins à domicile actifs", value: homeVisitCount, color: "text-green-600",  bg: "bg-green-50" },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Espace Call Center</h1>
          <p className="text-sm text-gray-500">
            {session.user.name} — {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/call-center/appointments"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Nouveau RDV
          </Link>
          <Link href="/call-center/home-visits"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Visites domicile
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className={`rounded-xl p-3 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Calendrier semaine */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Agenda de la semaine</h2>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString()
            const dayAppts = weekAppointments.filter((a) => {
              const d = new Date(a.scheduledAt)
              return d.toDateString() === day.toDateString()
            })
            return (
              <div key={i}
                className={`min-h-[80px] rounded-lg p-2 text-xs ${isToday ? "bg-blue-50 ring-1 ring-blue-200" : "bg-gray-50"}`}>
                <p className={`mb-1 font-semibold ${isToday ? "text-blue-600" : "text-gray-500"}`}>
                  {WEEKDAYS[i]} {day.getDate()}
                </p>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 3).map((a) => (
                    <Link key={a.id} href={`/call-center/appointments`}>
                      <div className="truncate rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700">
                        {new Date(a.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {" "}
                        {a.patient.patientProfile?.firstName ?? "—"}
                      </div>
                    </Link>
                  ))}
                  {dayAppts.length > 3 && (
                    <p className="text-[10px] text-gray-400">+{dayAppts.length - 3} autres</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">
              {alerts.length} RDV en attente de soumission à l&apos;admin
            </h2>
          </div>
          <div className="space-y-2">
            {alerts.map((a) => {
              const pp = a.patient.patientProfile
              return (
                <Link key={a.id} href="/call-center/appointments"
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-amber-50">
                  <span className="text-gray-900">
                    {pp ? `${pp.firstName} ${pp.lastName}` : "Patient"} —{" "}
                    {new Date(a.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              )
            })}
          </div>
          <Link href="/call-center/appointments"
            className="mt-3 block text-center text-xs font-medium text-amber-700 hover:underline">
            Voir tous les RDV en attente →
          </Link>
        </div>
      )}
    </div>
  )
}
