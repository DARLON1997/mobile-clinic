"use server"

import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", { email, password, redirect: false })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          throw new Error("Email ou mot de passe incorrect.")
        default:
          throw new Error("Erreur de connexion. Réessayez.")
      }
    }
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirect: false })
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword:     z.string().min(8),
  userId:          z.string().cuid(),
})

export async function changePasswordAction(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const data = changePasswordSchema.parse({ userId, currentPassword, newPassword })

  const user = await prisma.user.findUnique({ where: { id: data.userId } })
  if (!user) throw new Error("Utilisateur non trouvé.")

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash)
  if (!valid) throw new Error("Mot de passe actuel incorrect.")

  const hash = await bcrypt.hash(data.newPassword, 12)
  await prisma.user.update({ where: { id: data.userId }, data: { passwordHash: hash } })
}
