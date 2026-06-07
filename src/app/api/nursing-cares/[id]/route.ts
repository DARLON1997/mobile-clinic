import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"

const assignSchema    = z.object({ agentId: z.string().cuid() })
const statusSchema    = z.object({
  status:    z.enum(["EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  agentNotes: z.string().optional(),
  photoUrl:   z.string().url().optional(),
  reportUrl:  z.string().url().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const care = await prisma.nursingCare.findUnique({
    where: { id },
    include: {
      patient: { include: { patientProfile: true } },
      agent:   { include: { agentProfile: true } },
      payment: true,
    },
  })
  if (!care) return NextResponse.json({ error: "Soin non trouvé" }, { status: 404 })

  if (session.user.role === "PATIENT" && care.patientId !== session.user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  if (session.user.role === "AGENT_TERRAIN" && care.agentId !== session.user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  return NextResponse.json({ success: true, data: care })
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const care = await prisma.nursingCare.findUnique({ where: { id } })
  if (!care) return NextResponse.json({ error: "Soin non trouvé" }, { status: 404 })

  const body = await req.json()

  try {
    if (body.agentId && session.user.role === "SUPER_ADMIN") {
      const { agentId } = assignSchema.parse(body)
      const agent = await prisma.user.findFirst({ where: { id: agentId, role: "AGENT_TERRAIN" } })
      if (!agent) return NextResponse.json({ error: "Agent non trouvé" }, { status: 404 })

      const updated = await prisma.$transaction(async (tx) => {
        const nc = await tx.nursingCare.update({ where: { id }, data: { agentId, status: "ASSIGNED" } })
        await tx.notification.create({ data: { userId: care.patientId, type: "NURSING_CARE_ASSIGNED", title: "Infirmier assigné", message: "Un infirmier a été assigné à votre demande de soin." } })
        return nc
      })

      const patient = await prisma.user.findUnique({ where: { id: care.patientId } })
      if (patient?.phone) sendSMS(patient.phone, "Mobile Clinic : Un infirmier a été assigné à votre demande de soin infirmier.").catch(console.error)
      if (agent.phone) sendSMS(agent.phone, `Mobile Clinic : Nouvelle mission de soin infirmier le ${new Date(care.scheduledAt).toLocaleDateString("fr-FR")} — ${care.address}.`).catch(console.error)

      return NextResponse.json({ success: true, data: updated })
    }

    if (session.user.role === "AGENT_TERRAIN") {
      if (care.agentId !== session.user.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
      const { status, agentNotes, photoUrl, reportUrl } = statusSchema.parse(body)

      const updateData: Record<string, unknown> = { status, agentNotes, photoUrl, reportUrl }
      if (status === "COMPLETED") updateData.completedAt = new Date()

      const updated = await prisma.$transaction(async (tx) => {
        const nc = await tx.nursingCare.update({ where: { id }, data: updateData })

        if (status === "COMPLETED") {
          await tx.auditLog.create({ data: { userId: session.user.id, action: "NURSING_CARE_COMPLETED", targetId: id, targetType: "NursingCare" } })
          await tx.notification.create({ data: { userId: care.patientId, type: "NURSING_CARE_COMPLETED", title: "Soin terminé", message: "L'infirmier a terminé votre soin à domicile." } })
        }

        return nc
      })

      const patient = await prisma.user.findUnique({ where: { id: care.patientId } })
      const smsMap: Record<string, string> = {
        EN_ROUTE:    "Mobile Clinic : Votre infirmier est en route.",
        IN_PROGRESS: "Mobile Clinic : Le soin infirmier est en cours.",
        COMPLETED:   "Mobile Clinic : Votre soin infirmier est terminé. Merci de votre confiance.",
        CANCELLED:   "Mobile Clinic : Votre soin infirmier a été annulé.",
      }
      if (patient?.phone && smsMap[status]) sendSMS(patient.phone, smsMap[status]).catch(console.error)

      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ error: "Opération non reconnue" }, { status: 400 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides", details: err.issues }, { status: 400 })
    console.error("[nursing-cares/[id] PUT]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
