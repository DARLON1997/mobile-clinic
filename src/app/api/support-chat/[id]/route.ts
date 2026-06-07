import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"
import { pusherServer } from "@/lib/pusher"

const assignSchema = z.object({ callCenterId: z.string().cuid() })
const closeSchema  = z.object({ isOpen: z.literal(false) })

type Params = { params: Promise<{ id: string }> }

function canAccess(role: string, chat: { patientId: string; callCenterId: string | null }, userId: string) {
  if (role === "PATIENT") return chat.patientId === userId
  return ["CALL_CENTER_AGENT", "SUPER_ADMIN"].includes(role)
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const chat = await prisma.supportChat.findUnique({
    where: { id },
    include: {
      patient:    { select: { email: true, patientProfile: { select: { firstName: true, lastName: true } } } },
      callCenter: { select: { email: true } },
      messages:   { orderBy: { createdAt: "asc" }, include: { sender: { select: { email: true, role: true } } } },
    },
  })
  if (!chat) return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })
  if (!canAccess(session.user.role, chat, session.user.id))
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  return NextResponse.json({ success: true, data: chat })
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const chat = await prisma.supportChat.findUnique({ where: { id } })
  if (!chat) return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })

  const body = await req.json()

  try {
    // Assigner un agent Call Center
    if ("callCenterId" in body && ["CALL_CENTER_AGENT", "SUPER_ADMIN"].includes(session.user.role)) {
      const { callCenterId } = assignSchema.parse(body)
      const updated = await prisma.supportChat.update({ where: { id }, data: { callCenterId } })

      pusherServer.trigger(`patient-${chat.patientId}`, "agent-assigned", {
        chatId: id, callCenterId,
      }).catch(console.error)

      return NextResponse.json({ success: true, data: updated })
    }

    // Fermer la conversation
    if ("isOpen" in body && body.isOpen === false && ["CALL_CENTER_AGENT", "SUPER_ADMIN"].includes(session.user.role)) {
      closeSchema.parse(body)
      const updated = await prisma.$transaction(async (tx) => {
        const sc = await tx.supportChat.update({ where: { id }, data: { isOpen: false } })
        await tx.auditLog.create({
          data: {
            userId:     session.user.id,
            action:     "SUPPORT_CHAT_CLOSED",
            targetId:   id,
            targetType: "SupportChat",
          },
        })
        return sc
      })

      const patient = await prisma.user.findUnique({ where: { id: chat.patientId } })
      if (patient?.phone) {
        sendSMS(patient.phone, "Mobile Clinic : Votre conversation avec notre équipe a été clôturée. Merci de nous avoir contactés.").catch(console.error)
      }

      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ error: "Opération non reconnue" }, { status: 400 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides", details: err.issues }, { status: 400 })
    console.error("[support-chat/[id] PUT]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
