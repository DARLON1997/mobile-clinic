import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { pusherServer } from "@/lib/pusher"

const createSchema = z.object({ subject: z.string().min(5).max(200) })

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const where =
    session.user.role === "PATIENT"
      ? { patientId: session.user.id }
      : session.user.role === "CALL_CENTER_AGENT"
      ? {}
      : session.user.role === "SUPER_ADMIN"
      ? {}
      : { patientId: "NONE" }

  const chats = await prisma.supportChat.findMany({
    where,
    include: {
      patient:    { select: { email: true, patientProfile: { select: { firstName: true, lastName: true } } } },
      callCenter: { select: { email: true } },
      messages:   { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  })

  return NextResponse.json({ success: true, data: chats })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Réservé aux patients" }, { status: 403 })
  }

  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, isActive: true },
  })
  if (!dbUser) return NextResponse.json({ error: "Compte introuvable — veuillez vous reconnecter" }, { status: 401 })
  if (!dbUser.isActive) return NextResponse.json({ error: "Compte suspendu" }, { status: 403 })

  try {
    const { subject } = createSchema.parse(await req.json())

    const chat = await prisma.$transaction(async (tx) => {
      const sc = await tx.supportChat.create({
        data: { patientId: session.user.id, subject, isOpen: true },
      })

      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "SUPPORT_CHAT_OPENED",
          targetId:   sc.id,
          targetType: "SupportChat",
          details:    { subject },
        },
      })

      return sc
    })

    pusherServer.trigger("private-call-center-inbox", "new-conversation", {
      chatId:    chat.id,
      subject,
      patientId: session.user.id,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: chat }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides", details: err.issues }, { status: 400 })
    console.error("[support-chat POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
