import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"
import { triggerAdminNotification } from "@/lib/pusher"

const createSchema = z.object({
  patientId:       z.string().cuid(),
  examTypes:       z.array(z.enum([
    "BILAN_SANGUIN","GLYCEMIE","BILAN_LIPIDIQUE","BILAN_HEPATIQUE","BILAN_RENAL",
    "BILAN_THYROIDIEN","EXAMEN_URINE","EXAMEN_SELLES","TEST_PALUDISME","TEST_VIH",
    "TEST_GROSSESSE","BILAN_COMPLET","AUTRE",
  ])).min(1),
  address:         z.string().min(3),
  city:            z.string().default("Brazzaville"),
  scheduledAt:     z.string().datetime(),
  instructions:    z.string().optional(),
  prescriptionRef: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const where =
    session.user.role === "PATIENT"       ? { patientId:   session.user.id } :
    session.user.role === "AGENT_TERRAIN" ? { agentId:     session.user.id } :
    {}

  const exams = await prisma.labExam.findMany({
    where,
    include: {
      patient: { include: { patientProfile: { select: { firstName: true, lastName: true } } } },
      agent:   { include: { agentProfile:   { select: { firstName: true, lastName: true } } } },
      payment: { select: { status: true, amount: true } },
    },
    orderBy: { scheduledAt: "asc" },
  })

  return NextResponse.json({ success: true, data: exams })
}

export async function POST(req: Request) {
  const session = await auth()
  const allowed = ["PATIENT", "CALL_CENTER_AGENT", "SUPER_ADMIN"]
  if (!session || !allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = createSchema.parse(await req.json())
    const examCount = body.examTypes.length
    const amount = examCount <= 2 ? 5000 : examCount <= 5 ? 10000 : 18000

    const exam = await prisma.$transaction(async (tx) => {
      const le = await tx.labExam.create({
        data: {
          patientId:       body.patientId,
          requestedById:   session.user.id,
          examTypes:       body.examTypes,
          address:         body.address,
          city:            body.city,
          scheduledAt:     new Date(body.scheduledAt),
          instructions:    body.instructions,
          prescriptionRef: body.prescriptionRef,
          status:          "PENDING",
        },
      })

      await tx.payment.create({
        data: {
          userId:     body.patientId,
          labExamId:  le.id,
          amount,
          currency:   "XAF",
          method:     "MTN_MONEY",
          status:     "PENDING",
        },
      })

      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "LAB_EXAM_REQUESTED",
          targetId:   le.id,
          targetType: "LabExam",
          details:    { examTypes: body.examTypes, patientId: body.patientId },
        },
      })

      await tx.notification.create({
        data: {
          userId:  body.patientId,
          type:    "LAB_EXAM_CREATED",
          title:   "Demande d'examen reçue",
          message: `Votre demande de ${examCount} examen(s) de laboratoire est en cours de traitement.`,
        },
      })

      return le
    })

    const patient = await prisma.user.findUnique({ where: { id: body.patientId } })
    if (patient?.phone) {
      sendSMS(patient.phone,
        "Mobile Clinic : Votre demande d'examen de laboratoire a été reçue. Un agent vous contactera pour confirmer le rendez-vous."
      ).catch(console.error)
    }

    triggerAdminNotification("new-appointment", { type: "LAB_EXAM", examId: exam.id }).catch(console.error)

    return NextResponse.json({ success: true, data: exam }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides", details: err.issues }, { status: 400 })
    console.error("[lab-exams POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
