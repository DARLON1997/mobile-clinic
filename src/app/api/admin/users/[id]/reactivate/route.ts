import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive: true } }),
    prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "REACTIVATE_USER",
        targetType: "User",
        targetId:   id,
        details:    { email: user.email, role: user.role },
      },
    }),
  ])

  return NextResponse.json({ success: true })
}
