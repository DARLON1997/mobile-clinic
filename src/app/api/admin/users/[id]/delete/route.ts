import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
  if (user.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Impossible de supprimer un Super Admin" }, { status: 403 })
  }

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "DELETE_USER",
        targetType: "User",
        targetId:   id,
        details:    { email: user.email, role: user.role },
      },
    }),
    prisma.user.delete({ where: { id } }),
  ])

  return NextResponse.json({ success: true })
}
