import { prisma } from "@/lib/prisma"

const MAX_LEVELS = 10

export async function distributeReferralPoints(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { firstLoginAt: true, referredById: true },
  })

  // Déjà traité ou pas de parrain → rien à faire
  if (!user || user.firstLoginAt || !user.referredById) return

  // R2 : marquer firstLoginAt AVANT de distribuer (idempotence)
  await prisma.user.update({
    where: { id: userId },
    data:  { firstLoginAt: new Date() },
  })

  // Remonter la chaîne jusqu'à MAX_LEVELS
  const transactions: { beneficiaryId: string; triggeredById: string; level: number; pointsAwarded: number }[] = []
  let currentParentId: string | null = user.referredById
  let level = 1
  let points = 1.0

  while (currentParentId && level <= MAX_LEVELS) {
    transactions.push({
      beneficiaryId: currentParentId,
      triggeredById: userId,
      level,
      pointsAwarded: points,
    })

    const parent: { referredById: string | null } | null = await prisma.user.findUnique({
      where:  { id: currentParentId },
      select: { referredById: true },
    })

    currentParentId = parent?.referredById ?? null
    level++
    points /= 2
  }

  if (transactions.length === 0) return

  await prisma.referralPointTransaction.createMany({ data: transactions })

  const totalPoints = transactions.reduce((s, t) => s + t.pointsAwarded, 0)
  prisma.auditLog.create({
    data: {
      userId,
      action:  "REFERRAL_POINTS_DISTRIBUTED",
      details: { levels: transactions.length, totalPoints },
    },
  }).catch(console.error)
}
