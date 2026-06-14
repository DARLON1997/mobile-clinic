import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"
import { pusherServer } from "@/lib/pusher"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const data        = await req.formData()
  const socketId    = data.get("socket_id")    as string | null
  const channelName = data.get("channel_name") as string | null

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  }

  const { role, id: userId } = session.user
  let authorized = false

  // Canal boîte de réception Call Center
  if (channelName === "private-call-center-inbox") {
    authorized = role === "CALL_CENTER_AGENT" || role === "SUPER_ADMIN"

  // Canal notifications Admin
  } else if (channelName === "private-admin-notifications") {
    authorized = role === "SUPER_ADMIN"

  // Canal patient : patient sur son propre canal, agents sur tous
  } else if (channelName.startsWith("private-patient-")) {
    const targetId = channelName.slice("private-patient-".length)
    authorized = userId === targetId
      || role === "CALL_CENTER_AGENT"
      || role === "SUPER_ADMIN"

  // Canal chat : vérification DB pour les patients
  } else if (channelName.startsWith("private-chat-")) {
    if (role === "CALL_CENTER_AGENT" || role === "SUPER_ADMIN") {
      authorized = true
    } else if (role === "PATIENT") {
      const chatId = channelName.slice("private-chat-".length)
      const chat = await prisma.supportChat.findUnique({
        where:  { id: chatId },
        select: { patientId: true },
      })
      authorized = chat?.patientId === userId
    }

  // Canal mission : agent terrain uniquement
  } else if (channelName.startsWith("private-mission-")) {
    authorized = role === "AGENT_TERRAIN" || role === "SUPER_ADMIN"

  // Canal pharmacie : pharmacie sur son propre canal
  } else if (channelName.startsWith("private-pharmacie-")) {
    authorized = role === "PHARMACIE" || role === "SUPER_ADMIN"
  }

  if (!authorized) {
    return NextResponse.json({ error: "Accès refusé à ce canal" }, { status: 403 })
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName)
  return NextResponse.json(authResponse)
}
