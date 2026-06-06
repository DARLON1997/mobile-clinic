import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { triggerMissionUpdate } from "@/lib/pusher"
import { sendSMS, smsTemplates } from "@/lib/africas-talking"

interface Params { params: Promise<{ id: string }> }

const patchSchema = z.object({
  status:     z.enum(["EN_ROUTE", "ARRIVED", "COMPLETED", "CANCELLED"]),
  reportText: z.string().optional(),
  photoUrl:   z.string().url().optional(),
})

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params

  // RÈGLE DB-2 : agent terrain → uniquement ses propres missions
  const where = session.user.role === "AGENT_TERRAIN"
    ? { id, agentId: session.user.id }
    : { id }

  const visit = await prisma.homeVisit.findFirst({
    where,
    include: {
      patient: { include: { patientProfile: { select: { firstName: true, lastName: true } } } },
      agent:   { include: { agentProfile:   { select: { firstName: true, lastName: true } } } },
    },
  })

  if (!visit) return NextResponse.json({ error: "Mission non trouvée" }, { status: 404 })

  return NextResponse.json({ success: true, data: visit })
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session || session.user.role !== "AGENT_TERRAIN") {
    return NextResponse.json({ error: "Réservé aux agents terrain" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body  = patchSchema.parse(await req.json())

    const visit = await prisma.$transaction(async (tx) => {
      const hv = await tx.homeVisit.update({
        where: { id, agentId: session.user.id },   // RÈGLE DB-2
        data: {
          status:      body.status,
          reportText:  body.reportText,
          photoUrl:    body.photoUrl,
          completedAt: body.status === "COMPLETED" ? new Date() : undefined,
        },
        include: {
          patient: { include: { patientProfile: { select: { firstName: true } } } },
          agent:   { include: { agentProfile:   { select: { firstName: true, lastName: true } } } },
        },
      })

      // RÈGLE DB-3 : audit
      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     `MISSION_${body.status}`,
          targetId:   id,
          targetType: "HomeVisit",
        },
      })

      return hv
    })

    // Pusher temps réel
    await triggerMissionUpdate(id, body.status)

    // SMS patient
    const patientName = visit.patient.patientProfile?.firstName ?? ""
    const agentName   = visit.agent?.agentProfile
      ? `${visit.agent.agentProfile.firstName} ${visit.agent.agentProfile.lastName}`
      : ""
    const phone = visit.patient.phone

    if (phone) {
      if (body.status === "EN_ROUTE")  sendSMS(phone, smsTemplates.agentEnRoute(patientName, agentName)).catch(console.error)
      if (body.status === "ARRIVED")   sendSMS(phone, smsTemplates.agentArrived(patientName)).catch(console.error)
      if (body.status === "COMPLETED") sendSMS(phone, smsTemplates.missionCompleted(patientName)).catch(console.error)
    }

    return NextResponse.json({ success: true, data: visit })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
    console.error("[missions PATCH]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
