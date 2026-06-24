import { prisma } from "./prisma"

export async function getPatientTotalPoints(userId: string): Promise<number> {
  const agg = await prisma.referralPointTransaction.aggregate({
    where: { beneficiaryId: userId },
    _sum:  { pointsAwarded: true },
  })
  return agg._sum.pointsAwarded ?? 0
}

export async function getPatientDirectReferralsCount(userId: string): Promise<number> {
  return prisma.user.count({ where: { referredById: userId } })
}

export async function getPatientDirectReferrals(userId: string) {
  return prisma.user.findMany({
    where:   { referredById: userId },
    select: {
      id:           true,
      createdAt:    true,
      firstLoginAt: true,
      referredAt:   true,
      patientProfile: { select: { firstName: true, lastName: true } },
    },
    orderBy: { referredAt: "desc" },
  })
}

type ReferralNode = {
  id:        string
  nom:       string
  inscritLe: Date
  active:    boolean
  niveau:    number
  filleuls:  ReferralNode[]
}

export async function getReferralChainDetail(
  userId:   string,
  maxDepth: number = 10
): Promise<ReferralNode[]> {
  async function buildLevel(parentId: string, depth: number): Promise<ReferralNode[]> {
    if (depth > maxDepth) return []
    const directs = await prisma.user.findMany({
      where:  { referredById: parentId },
      select: {
        id:           true,
        createdAt:    true,
        firstLoginAt: true,
        patientProfile: { select: { firstName: true, lastName: true } },
      },
    })
    const result: ReferralNode[] = []
    for (const d of directs) {
      const children = await buildLevel(d.id, depth + 1)
      result.push({
        id:        d.id,
        nom:       d.patientProfile
          ? `${d.patientProfile.firstName} ${d.patientProfile.lastName}`
          : "Patient",
        inscritLe: d.createdAt,
        active:    !!d.firstLoginAt,
        niveau:    depth,
        filleuls:  children,
      })
    }
    return result
  }
  return buildLevel(userId, 1)
}
