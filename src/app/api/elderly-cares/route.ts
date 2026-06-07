import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"
import { triggerAdminNotification } from "@/lib/pusher"

const createSchema = z.object({
  patientId:    z.string().cuid(),
  careTypes:    z.array(z.enum([
    "SUIVI_MEDICAL","AIDE_MOBILITE","GESTION_MEDICAMENTS","SOINS_HYGIENE",
    "COMPAGNIE_MEDICALISEE","REEDUCATION","BILAN_SANTE","AUTRE_ELDERLY",
  ])).min(1),
  frequency:    z.enum(["PONCTUEL","QUOTIDIEN","HEBDOMADAIRE","MENSUEL"]).default("PONCTUEL"),
  address:      z.string().min(3),
  city:         z.string().default("Brazzaville"),
  scheduledAt:  z.string().datetime(),
  endDate:      z.string().optional(),
  duration:     z.number().int().default(60),
  patientAge:   z.number().int().optional(),
  medicalNotes: z.string().optional(),
  mobilityLevel:z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const where =
    session.user.role === "PATIENT"       ? { patientId: session.user.id } :
    session.user.role === "AGENT_TERRAIN" ? { agentId:   session.user.id } :
    {}

  const cares = await prisma.elderlyCare.findMany({
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
    const hourlyRate = 3000
    const amount = Math.ceil(body.duration / 60) * hourlyRate

    const care = await prisma.$transaction(async (tx) => {
      const ec = await tx.elderlyCare.create({
        data: {
          patientId:     body.patientId,
          careTypes:     body.careTypes,
          frequency:     body.frequency,
          address:       body.address,
          city:          body.city,
          scheduledAt:   new Date(body.scheduledAt),
          endDate:       body.endDate ? new Date(body.endDate) : undefined,
          duration:      body.duration,
          patientAge:    body.patientAge,
          medicalNotes:  body.medicalNotes,
          mobilityLevel: body.mobilityLevel,
          status:        "PENDING",
        },
      })

      await tx.payment.create({
        data: {
          userId:       body.patientId,
          elderlyCareId: ec.id,
          amount,
          currency:     "XAF",
          method:       "MTN_MONEY",
          status:       "PENDING",
        },
      })

      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "ELDERLY_CARE_REQUESTED",
          targetId:   ec.id,
          targetType: "ElderlyCare",
          details:    { careTypes: body.careTypes, frequency: body.frequency, patientId: body.patientId },
        },
      })

      await tx.notification.create({
        data: {
          userId:  body.patientId,
          type:    "ELDERLY_CARE_CREATED",
          title:   "Demande de soin senior reçue",
          message: "Votre demande de soin pour personne âgée est en cours de traitement. Un soignant sera assigné prochainement.",
        },
      })

      return ec
    })

    const patient = await prisma.user.findUnique({ where: { id: body.patientId } })
    if (patient?.phone) {
      sendSMS(patient.phone,
        "Mobile Clinic : Votre demande de soin senior a été reçue. Un soignant spécialisé vous sera assigné prochainement."
      ).catch(console.error)
    }

    triggerAdminNotification("new-appointment", { type: "ELDERLY_CARE", careId: care.id }).catch(console.error)

    return NextResponse.json({ success: true, data: care }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides", details: err.issues }, { status: 400 })
    console.error("[elderly-cares POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
