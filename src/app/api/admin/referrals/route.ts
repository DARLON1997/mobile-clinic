import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"
import {
  getPatientTotalPoints,
  getPatientDirectReferralsCount,
} from "@/lib/referral-stats"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page    = Math.max(1, Number(searchParams.get("page")  ?? 1))
  const limit   = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)))
  const search  = (searchParams.get("search") ?? "").trim()

  const where = search
    ? {
        role: "PATIENT" as const,
        OR: [
          { patientProfile: { firstName: { contains: search, mode: "insensitive" as const } } },
          { patientProfile: { lastName:  { contains: search, mode: "insensitive" as const } } },
          { phone: { contains: search } },
          { referralCode: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : { role: "PATIENT" as const }

  const [total, patients] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id:           true,
        phone:        true,
        referralCode: true,
        patientProfile: { select: { firstName: true, lastName: true } },
      },
    }),
  ])

  // Enrichir chaque patient avec ses stats de parrainage
  const enriched = await Promise.all(
    patients.map(async (p) => {
      const [totalPoints, nombreFilleulsDirects] = await Promise.all([
        getPatientTotalPoints(p.id),
        getPatientDirectReferralsCount(p.id),
      ])
      return {
        id:                    p.id,
        nom:                   p.patientProfile?.lastName  ?? "—",
        prenom:                p.patientProfile?.firstName ?? "—",
        telephone:             p.phone ?? "—",
        referralCode:          p.referralCode ?? "—",
        totalPoints,
        nombreFilleulsDirects,
      }
    })
  )

  // Trier par points décroissants côté JS (déjà paginé)
  enriched.sort((a, b) => b.totalPoints - a.totalPoints)

  // Statistiques globales
  const [totalPtsAgg, patientsAvecFilleuls, meilleurData] = await Promise.all([
    prisma.referralPointTransaction.aggregate({ _sum: { pointsAwarded: true } }),
    prisma.user.count({
      where: { role: "PATIENT", referrals: { some: {} } },
    }),
    // Meilleur parraineur = patient ayant le max de filleuls directs
    prisma.user.findFirst({
      where:   { role: "PATIENT" },
      orderBy: { referrals: { _count: "desc" } },
      select: {
        id:   true,
        phone: true,
        patientProfile: { select: { firstName: true, lastName: true } },
        _count: { select: { referrals: true } },
      },
    }),
  ])

  const meilleurPoints = meilleurData
    ? await getPatientTotalPoints(meilleurData.id)
    : 0

  return NextResponse.json({
    statistiquesGlobales: {
      totalPointsDistribuesTousPatients: totalPtsAgg._sum.pointsAwarded ?? 0,
      nombrePatientsAvecAuMoinsUnFilleul: patientsAvecFilleuls,
      meilleurParraineur: meilleurData
        ? {
            nom:                  `${meilleurData.patientProfile?.firstName ?? ""} ${meilleurData.patientProfile?.lastName ?? ""}`.trim() || "—",
            totalPoints:          meilleurPoints,
            nombreFilleulsDirects: meilleurData._count.referrals,
          }
        : null,
    },
    patients: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
