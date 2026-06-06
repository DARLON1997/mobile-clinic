import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET — 20 notifications les plus récentes de l'utilisateur connecté
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take:    20,
    select: {
      id:        true,
      type:      true,
      title:     true,
      message:   true,
      isRead:    true,
      createdAt: true,
    },
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  })

  return NextResponse.json({ success: true, data: notifications, unreadCount })
}

// PUT — Marquer une ou toutes les notifications comme lues
export async function PUT(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  try {
    const body = z.object({
      id:      z.string().cuid().optional(), // Si absent → tout marquer comme lu
      markAll: z.boolean().optional(),
    }).parse(await req.json())

    if (body.markAll || !body.id) {
      // Tout marquer comme lu
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data:  { isRead: true },
      })
      return NextResponse.json({ success: true, message: "Toutes les notifications marquées comme lues." })
    }

    // Marquer une seule notification comme lue
    const notif = await prisma.notification.findUnique({ where: { id: body.id } })
    if (!notif || notif.userId !== session.user.id) {
      return NextResponse.json({ error: "Notification non trouvée." }, { status: 404 })
    }

    await prisma.notification.update({
      where: { id: body.id },
      data:  { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    console.error("[notifications PUT]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
