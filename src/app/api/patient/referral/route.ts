import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  const userId = session.user.id

  const [user, totalResult, directReferrals, recentTransactions] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { referralCode: true },
    }),
    prisma.referralPointTransaction.aggregate({
      where: { beneficiaryId: userId },
      _sum:  { pointsAwarded: true },
    }),
    prisma.user.findMany({
      where:  { referredById: userId },
      select: {
        id:           true,
        firstLoginAt: true,
        referredAt:   true,
        patientProfile: { select: { firstName: true, lastName: true } },
      },
      orderBy: { referredAt: "desc" },
    }),
    prisma.referralPointTransaction.findMany({
      where:   { beneficiaryId: userId },
      orderBy: { createdAt: "desc" },
      take:    20,
      select: {
        id:           true,
        level:        true,
        pointsAwarded: true,
        createdAt:    true,
        triggeredBy: {
          select: {
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    referralCode: user?.referralCode ?? null,
    totalPoints:  totalResult._sum.pointsAwarded ?? 0,
    directReferrals: directReferrals.map((r) => ({
      id:          r.id,
      firstName:   r.patientProfile?.firstName ?? "—",
      lastName:    r.patientProfile?.lastName  ?? "—",
      referredAt:  r.referredAt,
      activated:   !!r.firstLoginAt,
    })),
    recentTransactions: recentTransactions.map((t) => ({
      id:            t.id,
      level:         t.level,
      pointsAwarded: t.pointsAwarded,
      createdAt:     t.createdAt,
      triggeredByName: t.triggeredBy.patientProfile
        ? `${t.triggeredBy.patientProfile.firstName} ${t.triggeredBy.patientProfile.lastName}`
        : "Utilisateur",
    })),
  })
}
