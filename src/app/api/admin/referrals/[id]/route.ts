import { NextResponse }    from "next/server"
import { auth }             from "@/auth"
import { prisma }           from "@/lib/prisma"
import {
  getPatientTotalPoints,
  getReferralChainDetail,
} from "@/lib/referral-stats"

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id } = params

  const patient = await prisma.user.findUnique({
    where:  { id, role: "PATIENT" },
    select: {
      id:           true,
      phone:        true,
      referralCode: true,
      patientProfile: { select: { firstName: true, lastName: true } },
    },
  })

  if (!patient)
    return NextResponse.json({ error: "Patient introuvable." }, { status: 404 })

  const [totalPoints, chaineComplete, transactions] = await Promise.all([
    getPatientTotalPoints(id),
    getReferralChainDetail(id, 10),
    prisma.referralPointTransaction.findMany({
      where:   { beneficiaryId: id },
      orderBy: { createdAt: "desc" },
      take:    50,
      select: {
        id:            true,
        level:         true,
        pointsAwarded: true,
        createdAt:     true,
        triggeredBy: {
          select: {
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    patient: {
      nom:          patient.patientProfile?.lastName  ?? "—",
      prenom:       patient.patientProfile?.firstName ?? "—",
      telephone:    patient.phone ?? "—",
      referralCode: patient.referralCode ?? "—",
    },
    totalPoints,
    chaineComplete,
    historiqueTransactions: transactions.map((t) => ({
      id:              t.id,
      level:           t.level,
      pointsAwarded:   t.pointsAwarded,
      createdAt:       t.createdAt,
      triggeredByName: t.triggeredBy.patientProfile
        ? `${t.triggeredBy.patientProfile.firstName} ${t.triggeredBy.patientProfile.lastName}`
        : "Utilisateur",
    })),
  })
}
