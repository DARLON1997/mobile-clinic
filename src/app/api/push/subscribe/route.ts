import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"
import { logServerError } from "@/lib/error-logger"

interface SubscriptionBody {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  try {
    const body = (await req.json()) as SubscriptionBody
    if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where:  { endpoint: body.endpoint },
      update: { userId: session.user.id, p256dh: body.keys.p256dh, auth: body.keys.auth },
      create: {
        userId:    session.user.id,
        endpoint:  body.endpoint,
        p256dh:    body.keys.p256dh,
        auth:      body.keys.auth,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logServerError("PUSH_SUBSCRIBE", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  try {
    const { endpoint } = (await req.json()) as { endpoint?: string }
    if (!endpoint) return NextResponse.json({ error: "endpoint manquant" }, { status: 400 })

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    logServerError("PUSH_UNSUBSCRIBE", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
