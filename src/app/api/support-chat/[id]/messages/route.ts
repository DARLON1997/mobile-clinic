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

const senderSelect = {
  id: true,
  email: true,
  role: true,
  patientProfile: { select: { firstName: true, lastName: true } },
} as const

function getSenderName(sender: {
  email: string; role: string
  patientProfile: { firstName: string; lastName: string } | null
}) {
  if (sender.role === "PATIENT" && sender.patientProfile) {
    return `${sender.patientProfile.firstName} ${sender.patientProfile.lastName}`
  }
  if (sender.role === "CALL_CENTER_AGENT") return "Agent Support"
  if (sender.role === "SUPER_ADMIN") return "Administrateur"
  return sender.email
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const chat = await prisma.supportChat.findUnique({ where: { id } })
  if (!chat) return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })

  const isPatient = session.user.role === "PATIENT" && chat.patientId === session.user.id
  const isStaff   = ["CALL_CENTER_AGENT", "SUPER_ADMIN"].includes(session.user.role)
  if (!isPatient && !isStaff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  await prisma.supportMessage.updateMany({
    where: { chatId: id, senderId: { not: session.user.id }, isRead: false },
    data:  { isRead: true },
  })

  const messages = await prisma.supportMessage.findMany({
    where:   { chatId: id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: senderSelect } },
  })

  const data = messages.map(m => ({
    id:         m.id,
    content:    m.content,
    senderId:   m.senderId,
    senderRole: m.sender.role,
    senderName: getSenderName(m.sender),
    fileUrl:    m.fileUrl,
    createdAt:  m.createdAt.toISOString(),
    isRead:     m.isRead,
  }))

  return NextResponse.json({ success: true, data })
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

    const msg = await prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: { chatId: id, senderId: session.user.id, content, fileUrl },
        include: { sender: { select: senderSelect } },
      })
      await tx.supportChat.update({ where: { id }, data: { lastMessageAt: new Date() } })
      await tx.auditLog.create({
        data: { userId: session.user.id, action: "SUPPORT_MESSAGE_SENT", targetId: id, targetType: "SupportChat" },
      })
      return created
    })

    const payload = {
      id:         msg.id,
      content:    msg.content,
      senderId:   msg.senderId,
      senderRole: msg.sender.role,
      senderName: getSenderName(msg.sender),
      fileUrl:    msg.fileUrl ?? null,
      createdAt:  msg.createdAt.toISOString(),
      isRead:     false,
    }

    // Tous les participants du chat reçoivent le message en temps réel
    pusherServer.trigger(`chat-${id}`, "new-message", payload).catch(console.error)

    // Notification boîte de réception Call Center (depuis patient)
    if (isPatient) {
      pusherServer.trigger("call-center-inbox", "new-message", {
        chatId:   id,
        preview:  content.slice(0, 60),
        senderName: payload.senderName,
        timestamp: msg.createdAt.toISOString(),
      }).catch(console.error)
    }

    // Notification patient (depuis agent)
    if (!isPatient) {
      pusherServer.trigger(`patient-${chat.patientId}`, "new-message", {
        chatId:  id,
        preview: content.slice(0, 60),
        timestamp: msg.createdAt.toISOString(),
      }).catch(console.error)
    }

    return NextResponse.json({ success: true, data: payload }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    console.error("[messages POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
