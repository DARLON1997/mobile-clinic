import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"
import { triggerAdminNotification } from "@/lib/pusher"

const createSchema = z.object({
  patientId:       z.string().cuid(),
  careTypes:       z.array(z.enum([
    "PRISE_TENSION","INJECTION","PANSEMENT","PERFUSION","PRISE_DE_SANG",
    "SUIVI_POST_OPERATOIRE","ADMINISTRATION_MED","SOINS_PLAIE","AUTRE_SOIN",
  ])).min(1),
  address:         z.string().min(3),
  city:            z.string().default("Brazzaville"),
  scheduledAt:     z.string().datetime(),
  instructions:    z.string().optional(),
  materials:       z.string().optional(),
  prescriptionRef: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const where =
    session.user.role === "PATIENT"       ? { patientId: session.user.id } :
    session.user.role === "AGENT_TERRAIN" ? { agentId:   session.user.id } :
    {}

  const cares = await prisma.nursingCare.findMany({
    where,
    include: {
      patient: { include: { patientProfile: { select: { firstName: true, lastName: true } } } },
      agent:   { include: { agentProfile:   { select: { firstName: true, lastName: true } } } },
      payment: { select: { status: true, amount: true } },
    },
    orderBy: { scheduledAt: "asc" },
  })

  return NextResponse.json({ success: true, data: cares })
}

export async function POST(req: Request) {
  const session = await auth()
  const allowed = ["PATIENT", "CALL_CENTER_AGENT", "SUPER_ADMIN"]
  if (!session || !allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = createSchema.parse(await req.json())
    const amount = body.careTypes.length <= 2 ? 4000 : 8000

    const care = await prisma.$transaction(async (tx) => {
      const nc = await tx.nursingCare.create({
        data: {
          patientId:       body.patientId,
          careTypes:       body.careTypes,
          address:         body.address,
          city:            body.city,
          scheduledAt:     new Date(body.scheduledAt),
          instructions:    body.instructions,
          materials:       body.materials,
          prescriptionRef: body.prescriptionRef,
          status:          "PENDING",
        },
      })

      await tx.payment.create({
        data: {
          userId:       body.patientId,
          nursingCareId: nc.id,
          amount,
          currency:     "XAF",
          method:       "MTN_MONEY",
          status:       "PENDING",
        },
      })

      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "NURSING_CARE_REQUESTED",
          targetId:   nc.id,
          targetType: "NursingCare",
          details:    { careTypes: body.careTypes, patientId: body.patientId },
        },
      })

      await tx.notification.create({
        data: {
          userId:  body.patientId,
          type:    "NURSING_CARE_CREATED",
          title:   "Demande de soin infirmier reçue",
          message: "Votre demande de soin infirmier est en cours de traitement. Un infirmier sera assigné prochainement.",
        },
      })

      return nc
    })

    const patient = await prisma.user.findUnique({ where: { id: body.patientId } })
    if (patient?.phone) {
      sendSMS(patient.phone,
        "Mobile Clinic : Votre demande de soin infirmier a été reçue. Un infirmier sera assigné prochainement."
      ).catch(console.error)
    }

    triggerAdminNotification("new-appointment", { type: "NURSING_CARE", careId: care.id }).catch(console.error)

    return NextResponse.json({ success: true, data: care }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides", details: err.issues }, { status: 400 })
    console.error("[nursing-cares POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
