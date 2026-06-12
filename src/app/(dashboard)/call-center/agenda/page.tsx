import { auth }     from "@/auth"
import { redirect }  from "next/navigation"
import { prisma }    from "@/lib/prisma"
import Link          from "next/link"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING:           { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400"   },
  AWAITING_APPROVAL: { bg: "bg-amber-100",  text: "text-amber-800",  dot: "bg-amber-500"  },
  PAYMENT_PENDING:   { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  CONFIRMED:         { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  IN_PROGRESS:       { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  COMPLETED:         { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  CANCELLED:         { bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-400"    },
  REJECTED:          { bg: "bg-red-50",     text: "text-red-500",    dot: "bg-red-300"    },
}

function getWeekRange(offset: number) {
  const today = new Date()
  const dow   = today.getDay() === 0 ? 6 : today.getDay() - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  return { monday, sunday: days[6], days }
}

interface PageProps {
  searchParams: Promise<{ week?: string; doctorId?: string }>
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const session = await auth()
  if (session?.user.role !== "CALL_CENTER_AGENT") redirect("/unauthorized")

  const { week: weekParam, doctorId } = await searchParams
  const weekOffset = Number.isFinite(parseInt(weekParam ?? "0")) ? parseInt(weekParam ?? "0") : 0

  const { monday, sunday, days } = getWeekRange(weekOffset)
  const weekEnd = new Date(sunday)
  weekEnd.setHours(23, 59, 59, 999)

  const [doctors, appointments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MEDECIN", isActive: true },
      select: {
        id: true,
        doctorProfile: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: monday, lte: weekEnd },
        ...(doctorId ? { doctorId } : {}),
      },
      select: {
        id:          true,
        scheduledAt: true,
        status:      true,
        reason:      true,
        duration:    true,
        patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } },
        doctor:  { select: { id: true, doctorProfile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ])

  const byDay = days.map(day =>
    appointments.filter(a => new Date(a.scheduledAt).toDateString() === day.toDateString())
  )

  const totalWeek      = appointments.length
  const confirmedCount = appointments.filter(a => ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(a.status)).length
  const pendingCount   = appointments.filter(a => ["PENDING", "AWAITING_APPROVAL"].includes(a.status)).length

  const buildUrl = (offset: number, dId?: string) => {
    const params = new URLSearchParams()
    if (offset !== 0) params.set("week", String(offset))
    if (dId) params.set("doctorId", dId)
    const qs = params.toString()
    return `/call-center/agenda${qs ? `?${qs}` : ""}`
  }

  const weekLabel =
    weekOffset === 0 ? "Semaine actuelle" :
    weekOffset === 1 ? "Semaine prochaine" :
    weekOffset === -1 ? "Semaine dernière" :
    `${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`

  return (
    <div className="mx-auto max-w-7xl space-y-5">

      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda médical</h1>
          <p className="text-sm text-gray-500">{weekLabel}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* KPIs rapides */}
          <div className="hidden sm:flex items-center gap-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
            <span className="text-gray-600 pr-3">
              <span className="font-semibold text-gray-900">{totalWeek}</span> RDV
            </span>
            <span className="text-green-700 pl-3 pr-3 font-medium">
              {confirmedCount} confirmés
            </span>
            {pendingCount > 0 && (
              <span className="text-amber-700 pl-3 font-medium">
                {pendingCount} en attente
              </span>
            )}
          </div>

          {/* Navigation semaine */}
          <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Link href={buildUrl(weekOffset - 1, doctorId)}
              className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href={buildUrl(0, doctorId)}
              className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 border-x border-gray-200 transition-colors">
              Aujourd&apos;hui
            </Link>
            <Link href={buildUrl(weekOffset + 1, doctorId)}
              className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Filtre médecin */}
      <div className="flex gap-2 flex-wrap">
        <Link href={buildUrl(weekOffset)}>
          <span className={`inline-block cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            !doctorId ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
          }`}>
            Tous les médecins
          </span>
        </Link>
        {doctors.filter(d => d.doctorProfile).map(d => {
          const isActive = doctorId === d.id
          return (
            <Link key={d.id} href={buildUrl(weekOffset, d.id)}>
              <span className={`inline-block cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
              }`}>
                Dr {d.doctorProfile!.lastName}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Grille 7 colonnes */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday   = day.toDateString() === new Date().toDateString()
          const dayAppts  = byDay[i]
          const isPast    = day < new Date(new Date().setHours(0, 0, 0, 0))

          return (
            <div key={i}
              className={`flex flex-col overflow-hidden rounded-xl border ${
                isToday
                  ? "border-blue-300 ring-1 ring-blue-300"
                  : isPast
                    ? "border-gray-100 bg-gray-50/50 opacity-75"
                    : "border-gray-200 bg-white"
              }`}>

              {/* Header jour */}
              <div className={`px-2 py-2 text-center ${isToday ? "bg-blue-600" : isPast ? "bg-gray-100" : "bg-gray-50"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-blue-100" : "text-gray-500"}`}>
                  {WEEKDAYS[i].slice(0, 3)}
                </p>
                <p className={`text-lg font-bold leading-none mt-0.5 ${isToday ? "text-white" : isPast ? "text-gray-400" : "text-gray-900"}`}>
                  {day.getDate()}
                </p>
                {dayAppts.length > 0 && (
                  <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isToday ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"}`}>
                    {dayAppts.length}
                  </span>
                )}
              </div>

              {/* Appointments */}
              <div className="flex-1 space-y-1 p-1.5 min-h-[100px]">
                {dayAppts.length === 0 ? (
                  <p className="pt-4 text-center text-[10px] text-gray-300">—</p>
                ) : dayAppts.map(appt => {
                  const s = STATUS_STYLE[appt.status] ?? STATUS_STYLE.PENDING
                  const patientName = appt.patient.patientProfile
                    ? `${appt.patient.patientProfile.firstName.charAt(0)}. ${appt.patient.patientProfile.lastName}`
                    : "Patient"
                  const time = new Date(appt.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })

                  return (
                    <Link key={appt.id} href="/call-center/appointments">
                      <div className={`rounded-md px-1.5 py-1 text-[10px] leading-tight ${s.bg} ${s.text} hover:opacity-80 transition-opacity cursor-pointer`}>
                        <div className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                          <span className="font-semibold">{time}</span>
                        </div>
                        <div className="mt-0.5 truncate font-medium">{patientName}</div>
                        {!doctorId && appt.doctor.doctorProfile && (
                          <div className="mt-0.5 truncate opacity-60">
                            Dr {appt.doctor.doctorProfile.lastName}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Légende statuts */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
        {([
          ["PENDING",           "En attente"],
          ["AWAITING_APPROVAL", "Soumis admin"],
          ["CONFIRMED",         "Confirmé"],
          ["IN_PROGRESS",       "En cours"],
          ["COMPLETED",         "Terminé"],
          ["CANCELLED",         "Annulé"],
        ] as const).map(([k, v]) => {
          const s = STATUS_STYLE[k]
          return (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className="text-xs text-gray-500">{v}</span>
            </div>
          )
        })}
      </div>

      {/* Aucun RDV cette semaine */}
      {totalWeek === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Aucun rendez-vous cette semaine.</p>
          <Link href="/call-center/appointments" className="mt-3 inline-block text-xs font-medium text-blue-600 hover:underline">
            Créer un rendez-vous →
          </Link>
        </div>
      )}
    </div>
  )
}
