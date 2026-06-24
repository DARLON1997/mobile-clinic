import { prisma }  from "@/lib/prisma"
import { headers } from "next/headers"

export async function logUserConnection(userId: string): Promise<void> {
  try {
    const h         = await headers()
    const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null
    const userAgent = h.get("user-agent") ?? null

    await prisma.$transaction([
      prisma.connectionLog.create({
        data: { userId, ipAddress, userAgent },
      }),
      prisma.user.update({
        where: { id: userId },
        data:  { totalConnections: { increment: 1 }, lastConnectionAt: new Date() },
      }),
    ])
  } catch (err) {
    // Ne jamais bloquer la connexion à cause du logging — même principe que distributeReferralPoints
    console.error("[CONNECTION LOG]", err)
  }
}
