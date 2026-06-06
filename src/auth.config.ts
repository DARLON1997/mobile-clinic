import type { NextAuthConfig } from "next-auth"
import type { Role } from "@prisma/client"

// Config Edge-compatible (pas de Prisma, pas de Node.js natif)
// Utilisée par middleware.ts pour vérifier le JWT uniquement
export const authConfig = {
  session: { strategy: "jwt" as const },
  providers: [],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id       = user.id
        token.role     = user.role
        token.isActive = user.isActive ?? true
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id       = token.id       as string
        session.user.role     = token.role     as Role
        session.user.isActive = token.isActive as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
} satisfies NextAuthConfig
