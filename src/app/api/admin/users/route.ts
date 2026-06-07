import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

const CreateUserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  phone:    z.string().min(8),
  role:     z.enum(["CALL_CENTER_AGENT", "MEDECIN", "AGENT_TERRAIN"]),
})

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, phone, role } = parsed.data

  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } })
  if (exists) {
    return NextResponse.json({ error: "Email ou téléphone déjà utilisé" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, phone, passwordHash, role, isActive: true },
      select: { id: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    })
    await tx.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "CREATE_USER",
        targetType: "User",
        targetId:   created.id,
        details:    { role, email },
      },
    })
    return created
  })

  return NextResponse.json({ data: user }, { status: 201 })
}
