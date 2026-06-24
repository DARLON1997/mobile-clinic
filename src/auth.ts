import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import type { Role } from "@prisma/client"
import { checkLoginLimit } from "@/lib/rate-limit"
import { authConfig } from "./auth.config"
import { distributeReferralPoints } from "@/lib/distribute-referral-points"
import { logUserConnection }       from "@/lib/log-connection"

const otpSchema = z.object({
  email: z.string().email(),
  otp:   z.string().length(6),
})

async function resolveDisplayName(userId: string, role: Role): Promise<string | null> {
  try {
    if (role === "PATIENT") {
      const p = await prisma.patientProfile.findUnique({ where: { userId } })
      return p ? `${p.firstName} ${p.lastName}` : null
    }
    if (role === "MEDECIN") {
      const p = await prisma.doctorProfile.findUnique({ where: { userId } })
      return p ? `Dr ${p.firstName} ${p.lastName}` : null
    }
    if (role === "AGENT_TERRAIN") {
      const p = await prisma.agentProfile.findUnique({ where: { userId } })
      return p ? `${p.firstName} ${p.lastName}` : null
    }
    return null
  } catch {
    return null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email",    type: "email" },
        otp:   { label: "Code OTP", type: "text"  },
      },

      async authorize(credentials) {
        const parsed = otpSchema.safeParse(credentials)
        if (!parsed.success) return null

        const email = parsed.data.email.toLowerCase().trim()
        const otp   = parsed.data.otp.trim()

        // RÈGLE R7 : limiter les tentatives de vérification OTP
        const limit = await checkLoginLimit(email).catch(() => ({ allowed: true }))
        if (!limit.allowed) return null

        const user = await prisma.user.findUnique({
          where:  { email },
          select: {
            id:        true,
            email:     true,
            phone:     true,
            role:      true,
            isActive:  true,
            otpCode:   true,
            otpExpiry: true,
          },
        })

        if (!user || !user.isActive) return null
        if (!user.otpCode || !user.otpExpiry) return null
        if (new Date() > user.otpExpiry) return null
        if (user.otpCode !== otp) return null

        // OTP valide — nettoyer + lastLoginAt en une seule écriture
        await prisma.user.update({
          where: { id: user.id },
          data:  { otpCode: null, otpExpiry: null, lastLoginAt: new Date() },
        })

        // Registre CDR : enregistrer chaque connexion réussie (tous rôles)
        logUserConnection(user.id).catch((err) => console.error("[CDR]", err))

        // Parrainage : distribuer les points à la 1ère connexion (non-bloquant)
        distributeReferralPoints(user.id).catch((err) => console.error("[REFERRAL]", err))

        // RÈGLE R3 : AuditLog en arrière-plan
        prisma.auditLog.create({
          data: {
            userId:  user.id,
            action:  "USER_LOGIN",
            details: { email: user.email, role: user.role, method: "otp" },
          },
        }).catch(() => null)

        const name = await resolveDisplayName(user.id, user.role)

        return {
          id:       user.id,
          email:    user.email,
          name,
          role:     user.role,
          isActive: user.isActive,
        }
      },
    }),
  ],

})
