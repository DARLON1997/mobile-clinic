import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logServerError } from "@/lib/error-logger"

const createSchema = z.object({
  appointmentId: z.string(),
  typeExamen:    z.string().min(1),
  instructions:  z.string().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user.role || !["SUPER_ADMIN", "MEDECIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  const url = new URL(req.url)
  const consultationId = url.searchParams.get("consultationId")

  const where =
    session.user.role === "MEDECIN"
      ? { doctorId: session.user.id, ...(consultationId ? { consultationId } : {}) }
      : consultationId
        ? { consultationId }
        : {}

  const examens = await prisma.examenPrescrit.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } },
      doctor:  { select: { doctorProfile:  { select: { firstName: true, lastName: true } } } },
    },
  })

  return NextResponse.json({ data: examens })
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  try {
    const body = createSchema.parse(await req.json())

    // R1 : vérifier approbation admin
    const appt = await prisma.appointment.findUnique({
      where: { id: body.appointmentId, doctorId: session.user.id, adminApprovedAt: { not: null } },
      select: { id: true, patientId: true },
    })
    if (!appt) return NextResponse.json({ error: "Accès refusé." }, { status: 403 })

    // Upsert consultation si elle n'existe pas encore
    const consultation = await prisma.consultation.upsert({
      where:  { appointmentId: body.appointmentId },
      create: { appointmentId: body.appointmentId },
      update: {},
    })

    const examen = await prisma.examenPrescrit.create({
      data: {
        consultationId: consultation.id,
        patientId:      appt.patientId,
        doctorId:       session.user.id,
        typeExamen:     body.typeExamen,
        instructions:   body.instructions,
      },
    })

    // AuditLog
    prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "EXAMEN_PRESCRIT",
        targetId:   body.appointmentId,
        targetType: "Appointment",
        details:    { typeExamen: body.typeExamen },
      },
    }).catch(console.error)

    return NextResponse.json({ data: examen }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    logServerError("EXAMEN_CREATE", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
