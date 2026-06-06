import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { Role } from "@prisma/client"
import { checkLoginLimit } from "@/lib/rate-limit"
import { authConfig } from "./auth.config"

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
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
        email:    { label: "Email",        type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },

      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        // RÈGLE R7 : vérifier la limite de tentatives de connexion
        const limit = await checkLoginLimit(parsed.data.email).catch(() => ({ allowed: true }))
        if (!limit.allowed) return null

        const user = await prisma.user.findUnique({
          where:  { email: parsed.data.email },
          select: {
            id:           true,
            email:        true,
            phone:        true,
            passwordHash: true,
            role:         true,
            isActive:     true,
          },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!isValid) return null

        // Compte suspendu → on retourne null mais sans comptabiliser en échec
        if (!user.isActive) return null

        // RÈGLE R3 : AuditLog + lastLoginAt en arrière-plan
        Promise.all([
          prisma.auditLog.create({
            data: {
              userId:  user.id,
              action:  "USER_LOGIN",
              details: { email: user.email, role: user.role },
            },
          }),
          prisma.user.update({
            where: { id: user.id },
            data:  { lastLoginAt: new Date() },
          }),
        ]).catch(() => null)

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
