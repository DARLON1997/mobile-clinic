import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { pusherServer } from "@/lib/pusher"

const sendSchema = z.object({
  content: z.string().min(1).max(1000),
  fileUrl: z.string().url().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const chat = await prisma.supportChat.findUnique({ where: { id } })
  if (!chat) return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })

  const isPatient   = session.user.role === "PATIENT" && chat.patientId === session.user.id
  const isStaff     = ["CALL_CENTER_AGENT", "SUPER_ADMIN"].includes(session.user.role)
  if (!isPatient && !isStaff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  // Marquer les messages comme lus
  await prisma.supportMessage.updateMany({
    where: { chatId: id, senderId: { not: session.user.id }, isRead: false },
    data:  { isRead: true },
  })

  const messages = await prisma.supportMessage.findMany({
    where:   { chatId: id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { email: true, role: true } } },
  })

  return NextResponse.json({ success: true, data: messages })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const chat = await prisma.supportChat.findUnique({ where: { id } })
  if (!chat) return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })
  if (!chat.isOpen) return NextResponse.json({ error: "Cette conversation est fermée." }, { status: 409 })

  const isPatient = session.user.role === "PATIENT" && chat.patientId === session.user.id
  const isStaff   = ["CALL_CENTER_AGENT", "SUPER_ADMIN"].includes(session.user.role)
  if (!isPatient && !isStaff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  try {
    const { content, fileUrl } = sendSchema.parse(await req.json())

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.supportMessage.create({
        data: { chatId: id, senderId: session.user.id, content, fileUrl },
        include: { sender: { select: { email: true, role: true } } },
      })

      await tx.supportChat.update({
        where: { id },
        data:  { lastMessageAt: new Date() },
      })

      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "SUPPORT_MESSAGE_SENT",
          targetId:   id,
          targetType: "SupportChat",
        },
      })

      return msg
    })

    // Temps réel
    pusherServer.trigger(`chat-${id}`, "new-message", { message }).catch(console.error)

    if (isPatient) {
      pusherServer.trigger("call-center-inbox", "new-message", { chatId: id, message }).catch(console.error)
    } else {
      pusherServer.trigger(`patient-${chat.patientId}`, "new-message", { chatId: id, message }).catch(console.error)
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides", details: err.issues }, { status: 400 })
    console.error("[support-chat/[id]/messages POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
