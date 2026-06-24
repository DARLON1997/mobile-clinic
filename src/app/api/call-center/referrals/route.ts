import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"
import {
  getPatientTotalPoints,
  getPatientDirectReferralsCount,
} from "@/lib/referral-stats"

// ⚠️ Vue ALLÉGÉE : retourne uniquement totalPoints + nombreFilleulsDirects.
// Aucun endpoint /[id] n'existe pour ce rôle — la restriction est au niveau route, pas UI.

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user.role !== "CALL_CENTER_AGENT")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, Number(searchParams.get("page")  ?? 1))
  const limit  = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)))
  const search = (searchParams.get("search") ?? "").trim()

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
        // ⚠️ Aucun champ "chaineComplete" ni détail de filleuls
      }
    })
  )

  enriched.sort((a, b) => b.totalPoints - a.totalPoints)

  const [totalPtsAgg, patientsAvecFilleuls] = await Promise.all([
    prisma.referralPointTransaction.aggregate({ _sum: { pointsAwarded: true } }),
    prisma.user.count({ where: { role: "PATIENT", referrals: { some: {} } } }),
  ])

  return NextResponse.json({
    statistiquesGlobales: {
      totalPointsDistribuesTousPatients:  totalPtsAgg._sum.pointsAwarded ?? 0,
      nombrePatientsAvecAuMoinsUnFilleul: patientsAvecFilleuls,
    },
    patients: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
