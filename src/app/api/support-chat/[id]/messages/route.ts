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
  if (!session) {
    console.error("[messages POST] 401 — pas de session")
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }
  const { id } = await params

  const chat = await prisma.supportChat.findUnique({ where: { id } })
  if (!chat) {
    console.error("[messages POST] 404 — chat introuvable", id)
    return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 })
  }

  const isPatient = session.user.role === "PATIENT" && chat.patientId === session.user.id
  const isStaff   = ["CALL_CENTER_AGENT", "SUPER_ADMIN"].includes(session.user.role)

  console.log("[messages POST] session ok →", {
    userId: session.user.id,
    role:   session.user.role,
    chatId: id,
    isOpen: chat.isOpen,
    isPatient,
    isStaff,
  })

  if (!isPatient && !isStaff) {
    console.error("[messages POST] 403 — role:", session.user.role, "userId:", session.user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  // Guard session fantôme : le JWT peut être valide mais l'utilisateur absent de la DB prod
  // (même fix que commit 674d956 pour les appointments)
  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, isActive: true },
  })
  if (!dbUser) {
    console.error("[messages POST] session fantôme — userId introuvable en DB:", session.user.id)
    return NextResponse.json({ error: "Compte introuvable — veuillez vous reconnecter" }, { status: 401 })
  }
  if (!dbUser.isActive) {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 })
  }

  // Chat fermé : le staff peut rouvrir en envoyant un message ; le patient ne peut pas
  if (!chat.isOpen) {
    if (isStaff) {
      await prisma.supportChat.update({ where: { id }, data: { isOpen: true } })
      console.log("[messages POST] chat rouvert par staff:", id)
    } else {
      return NextResponse.json({ error: "Cette conversation est clôturée. Ouvrez-en une nouvelle." }, { status: 409 })
    }
  }

  // Auto-assigner le Call Center s'il n'y a pas encore d'agent
  if (session.user.role === "CALL_CENTER_AGENT" && !chat.callCenterId) {
    prisma.supportChat.update({ where: { id }, data: { callCenterId: session.user.id } })
      .catch(err => console.error("[messages POST] auto-assign failed:", err))
  }

  try {
    const { content, fileUrl } = sendSchema.parse(await req.json())

    // Opérations séquentielles sans $transaction pour compatibilité PgBouncer
    const msg = await prisma.supportMessage.create({
      data: { chatId: id, senderId: session.user.id, content, fileUrl },
      include: { sender: { select: senderSelect } },
    })

    await prisma.supportChat.update({ where: { id }, data: { lastMessageAt: new Date() } })

    // Audit log non-bloquant — une erreur ici ne doit pas faire échouer le message
    prisma.auditLog.create({
      data: { userId: session.user.id, action: "SUPPORT_MESSAGE_SENT", targetId: id, targetType: "SupportChat" },
    }).catch(err => console.error("[messages POST] auditLog failed:", err))

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
    const detail = err instanceof Error ? err.message : String(err)
    console.error("[messages POST]", err)
    return NextResponse.json({ error: `Erreur serveur : ${detail}` }, { status: 500 })
  }
}
