import { NextResponse }            from "next/server"
import { auth }                    from "@/auth"
import { prisma }                  from "@/lib/prisma"
import { computeActivityStatus }   from "@/lib/patient-activity-status"

function parseDevice(ua: string | null): string {
  if (!ua) return "Inconnu"
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile"
  if (/iPad|Tablet/i.test(ua))           return "Tablette"
  return "Bureau"
}

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, Number(searchParams.get("page")  ?? 1))
  const limit  = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)))
  const search = searchParams.get("search")?.trim() ?? ""
  const status = searchParams.get("status") ?? ""

  const now          = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
  const oneDayAgo    = new Date(now.getTime() - 1  * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // ── Statistiques globales ──────────────────────────────────────────────────
  const [
    totalPatients,
    nouveauxCetteSemaine,
    actifsAujourdhui,
    actifs,
    dormants,
    inactifs,
    jamaisConnectes,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.user.count({ where: { role: "PATIENT", createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { role: "PATIENT", lastConnectionAt: { gte: oneDayAgo } } }),
    prisma.user.count({ where: { role: "PATIENT", lastConnectionAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { role: "PATIENT", lastConnectionAt: { gte: ninetyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.user.count({ where: { role: "PATIENT", lastConnectionAt: { lt: ninetyDaysAgo } } }),
    prisma.user.count({ where: { role: "PATIENT", lastConnectionAt: null } }),
  ])

  // ── Filtres liste ──────────────────────────────────────────────────────────
  const searchWhere = search ? {
    OR: [
      { patientProfile: { firstName: { contains: search, mode: "insensitive" as const } } },
      { patientProfile: { lastName:  { contains: search, mode: "insensitive" as const } } },
      { phone:  { contains: search } },
      { email:  { contains: search, mode: "insensitive" as const } },
    ],
  } : {}

  const statusWhere: Record<string, object> = {
    ACTIF:           { lastConnectionAt: { gte: thirtyDaysAgo } },
    DORMANT:         { lastConnectionAt: { gte: ninetyDaysAgo, lt: thirtyDaysAgo } },
    INACTIF:         { lastConnectionAt: { lt: ninetyDaysAgo } },
    JAMAIS_CONNECTE: { lastConnectionAt: null },
  }

  const where = {
    role: "PATIENT" as const,
    isActive: true,
    ...searchWhere,
    ...(status && statusWhere[status] ? statusWhere[status] : {}),
  }

  const [total, patients] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: "desc" },
      select: {
        id:              true,
        email:           true,
        phone:           true,
        createdAt:       true,
        lastConnectionAt:true,
        totalConnections:true,
        patientProfile: {
          select: { firstName: true, lastName: true, avatarUrl: true, city: true },
        },
        appointmentsAsPatient: {
          orderBy: { scheduledAt: "desc" },
          take: 1,
          select: {
            id:          true,
            scheduledAt: true,
            status:      true,
            reason:      true,       // admin uniquement
            doctor: {
              select: {
                doctorProfile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        referralCode:   true,
        pointsReceived: {
          select: { pointsAwarded: true },
        },
      },
    }),
  ])

  const data = patients.map((p) => {
    const lastAppt = p.appointmentsAsPatient[0]
    const totalPoints = p.pointsReceived.reduce((acc, t) => acc + t.pointsAwarded, 0)
    return {
      id:              p.id,
      email:           p.email,
      phone:           p.phone,
      dateInscription: p.createdAt,
      lastConnectionAt: p.lastConnectionAt,
      totalConnections: p.totalConnections,
      activityStatus:  computeActivityStatus(p.lastConnectionAt),
      nom:             p.patientProfile?.lastName  ?? "",
      prenom:          p.patientProfile?.firstName ?? "",
      ville:           p.patientProfile?.city      ?? "",
      derniereConsultation: lastAppt ? {
        id:      lastAppt.id,
        date:    lastAppt.scheduledAt,
        statut:  lastAppt.status,
        motif:   lastAppt.reason,
        medecin: lastAppt.doctor.doctorProfile
          ? `Dr ${lastAppt.doctor.doctorProfile.firstName} ${lastAppt.doctor.doctorProfile.lastName}`
          : "—",
      } : null,
      referralCode:        p.referralCode,
      totalPointsParrainage: totalPoints,
    }
  })

  return NextResponse.json({
    stats: {
      totalPatients,
      nouveauxCetteSemaine,
      actifsAujourdhui,
      repartitionStatut: { ACTIF: actifs, DORMANT: dormants, INACTIF: inactifs, JAMAIS_CONNECTE: jamaisConnectes },
    },
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    data,
  })
}
