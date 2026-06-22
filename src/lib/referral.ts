import type { PrismaClient } from "@prisma/client"

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function generateReferralCode(): string {
  let code = "MC-"
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

export async function generateUniqueReferralCode(prisma: PrismaClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode()
    const existing = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })
    if (!existing) return code
  }
  // Fallback avec timestamp pour éviter une boucle infinie
  return `MC-${Date.now().toString(36).toUpperCase().slice(-6)}`
}
