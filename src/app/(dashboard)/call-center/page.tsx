import { auth }     from "@/auth"
import { redirect }  from "next/navigation"
import { prisma }    from "@/lib/prisma"
import Link          from "next/link"
import {
  CalendarDays, Clock, Home, AlertCircle, ChevronRight,
  MessageCircle, BookUser, TrendingUp,
} from "lucide-react"

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

  const [todayCount, pendingCount, homeVisitCount, openChatsCount, weekAppointments, alerts, recentChats] = await Promise.all([
    prisma.appointment.count({
      where: { scheduledAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.count({
      where: { status: "PENDING" },
    }),
    prisma.homeVisit.count({
      where: { status: { in: ["PENDING", "ASSIGNED", "EN_ROUTE", "ARRIVED"] } },
    }),
    prisma.supportChat.count({
      where: { isOpen: true },
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
    prisma.supportChat.findMany({
      where: { isOpen: true },
      take: 4,
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true, subject: true, lastMessageAt: true, callCenterId: true,
        patient: { select: { email: true, patientProfile: { select: { firstName: true, lastName: true } } } },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true },
        },
      },
    }),
  ])

  const weekDays = getWeekDays()

  const kpis = [
    { icon: CalendarDays,   label: "RDV aujourd'hui",         value: todayCount,     color: "text-blue-600",   bg: "bg-blue-50",   href: "/call-center/appointments" },
    { icon: Clock,          label: "En attente soumission",   value: pendingCount,   color: "text-amber-600",  bg: "bg-amber-50",  href: "/call-center/appointments" },
    { icon: Home,           label: "Soins domicile actifs",   value: homeVisitCount, color: "text-green-600",  bg: "bg-green-50",  href: "/call-center/home-visits"  },
    { icon: MessageCircle,  label: "Conversations ouvertes",  value: openChatsCount, color: "text-purple-600", bg: "bg-purple-50", href: "/call-center/chats"        },
  ]

  const quickLinks = [
    { href: "/call-center/agenda",   label: "Agenda médecins",    icon: CalendarDays,  desc: "Planning de la semaine" },
    { href: "/call-center/doctors",  label: "Répertoire médical", icon: BookUser,      desc: "Contacts & disponibilités" },
    { href: "/call-center/chats",    label: "Conversations",      icon: MessageCircle, desc: `${openChatsCount} en cours` },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* En-tête */}
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
            Soins domicile
          </Link>
        </div>
      </div>

      {/* KPIs 4 colonnes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ icon: Icon, label, value, color, bg, href }) => (
          <Link key={label} href={href}>
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className={`rounded-xl p-3 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Raccourcis rapides */}
      <div className="grid gap-4 sm:grid-cols-3">
        {quickLinks.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 group-hover:bg-blue-100 transition-colors">
                <Icon className="h-5 w-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Mini agenda semaine */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Agenda de la semaine</h2>
            <Link href="/call-center/agenda" className="text-xs font-medium text-blue-600 hover:underline">
              Vue complète →
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, i) => {
              const isToday  = day.toDateString() === new Date().toDateString()
              const dayAppts = weekAppointments.filter(a =>
                new Date(a.scheduledAt).toDateString() === day.toDateString()
              )
              return (
                <div key={i}
                  className={`min-h-[80px] rounded-lg p-2 text-xs ${isToday ? "bg-blue-50 ring-1 ring-blue-200 light-surface" : "bg-gray-50"}`}>
                  <p className={`mb-1 font-semibold ${isToday ? "text-blue-600" : "text-gray-500"}`}>
                    {WEEKDAYS[i]} {day.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map((a) => (
                      <Link key={a.id} href="/call-center/appointments">
                        <div className="truncate rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700">
                          {new Date(a.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          {" "}{a.patient.patientProfile?.firstName ?? "—"}
                        </div>
                      </Link>
                    ))}
                    {dayAppts.length > 3 && (
                      <p className="text-[10px] text-gray-400">+{dayAppts.length - 3}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conversations ouvertes */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Conversations ouvertes
              {openChatsCount > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700">
                  {openChatsCount}
                </span>
              )}
            </h2>
            <Link href="/call-center/chats" className="text-xs font-medium text-blue-600 hover:underline">
              Voir tout →
            </Link>
          </div>

          {recentChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="mb-2 h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">Aucune conversation ouverte</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentChats.map(chat => {
                const name = chat.patient.patientProfile
                  ? `${chat.patient.patientProfile.firstName} ${chat.patient.patientProfile.lastName}`
                  : chat.patient.email
                const preview = chat.messages[0]?.content ?? chat.subject
                const isNew   = !chat.callCenterId

                return (
                  <Link key={chat.id} href="/call-center/chats">
                    <div className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-[11px] font-bold text-white">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                          {isNew && (
                            <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">NOUVEAU</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{preview}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alertes RDV en attente */}
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
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-amber-50 transition-colors">
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
