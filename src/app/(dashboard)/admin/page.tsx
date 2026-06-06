import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import Link         from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatDateFR, formatXAF } from "@/lib/utils"
import { Users, CalendarCheck, ShieldCheck, TrendingUp } from "lucide-react"

export default async function AdminDashboard() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [consultToday, revenusMonth, medecinActifs, patientsTotal, pendingApprovals, recentAudit] =
    await Promise.all([
      prisma.appointment.count({ where: { scheduledAt: { gte: today, lt: tomorrow }, status: "CONFIRMED" } }),
      prisma.payment.aggregate({ where: { status: "PAID", createdAt: { gte: firstOfMonth } }, _sum: { amount: true } }),
      prisma.doctorProfile.count({ where: { isVerifiedByAdmin: true } }),
      prisma.user.count({ where: { role: "PATIENT" } }),
      prisma.appointment.findMany({
        where: { status: "AWAITING_APPROVAL" },
        take: 5,
        orderBy: { createdAt: "asc" },
        include: {
          patient: { select: { phone: true, patientProfile: { select: { firstName: true, lastName: true } } } },
          doctor:  { select: { doctorProfile: { select: { firstName: true, lastName: true, speciality: true } } } },
        },
      }),
      prisma.auditLog.findMany({
        take: 5, orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, role: true } } },
      }),
    ])

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500">Bonjour, {session.user.name ?? session.user.email}</p>
        </div>
        <NotificationBell />
      </div>

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: CalendarCheck, label: "Consultations aujourd'hui", value: consultToday,   color: "text-blue-600",  bg: "bg-blue-50" },
          { icon: TrendingUp,    label: "Revenus ce mois",           value: formatXAF(revenusMonth._sum.amount ?? 0), color: "text-green-600", bg: "bg-green-50" },
          { icon: Users,         label: "Médecins actifs",           value: medecinActifs,  color: "text-purple-600", bg: "bg-purple-50" },
          { icon: Users,         label: "Patients inscrits",         value: patientsTotal,  color: "text-amber-600", bg: "bg-amber-50" },
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Autorisations en attente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              Autorisations en attente
              {pendingApprovals.length > 0 && (
                <span className="animate-pulse rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  {pendingApprovals.length}
                </span>
              )}
            </CardTitle>
            <Link href="/admin/approvals">
              <Button variant="ghost" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune demande en attente.</p>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((appt) => {
                  const patient = appt.patient.patientProfile
                    ? `${appt.patient.patientProfile.firstName} ${appt.patient.patientProfile.lastName}`
                    : appt.patient.phone
                  const doctor = appt.doctor.doctorProfile
                    ? `Dr ${appt.doctor.doctorProfile.firstName} ${appt.doctor.doctorProfile.lastName}`
                    : "—"
                  return (
                    <div key={appt.id} className="flex items-center justify-between gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{patient}</p>
                        <p className="text-xs text-gray-500 truncate">{doctor} · {formatDateFR(appt.scheduledAt)}</p>
                      </div>
                      <Link href="/admin/approvals" className="shrink-0">
                        <Button size="sm" className="text-xs h-7 px-2">Traiter</Button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune activité récente.</p>
            ) : (
              <div className="space-y-3">
                {recentAudit.map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-400 truncate">{log.user.email}</p>
                    </div>
                    <p className="shrink-0 text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
