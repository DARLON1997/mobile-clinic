import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface Params { params: Promise<{ id: string }> }

// Schéma PUT (modifier RDV) — Call Center ou Admin
const putSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  duration:    z.number().optional(),
  notes:       z.string().optional(),
  status:      z.enum(["CANCELLED"]).optional(),      // Patient peut annuler
  adminNote:   z.string().optional(),
})

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { include: { patientProfile: true } },
      doctor:  { include: { doctorProfile:  true } },
      payment: true,
      consultation: true,
    },
  })

  if (!appointment) return NextResponse.json({ error: "Non trouvé" }, { status: 404 })

  // RÈGLE R1 : médecin → adminApprovedAt DOIT être non null
  if (session.user.role === "MEDECIN") {
    if (appointment.doctorId !== session.user.id || appointment.adminApprovedAt === null) {
      // RÈGLE R3 : audit de la tentative refusée
      await prisma.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "UNAUTHORIZED_ACCESS_ATTEMPT",
          targetId:   id,
          targetType: "Appointment",
          details:    { reason: "adminApprovedAt is null or wrong doctor", route: "/api/appointments/[id]" },
        },
      })
      return NextResponse.json({ error: "Accès non autorisé — approbation Admin requise." }, { status: 403 })
    }
    // RÈGLE R3 : audit lecture dossier médical
    await prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "ACCESSED_PATIENT_RECORD",
        targetId:   appointment.patientId,
        targetType: "PatientProfile",
        details:    { appointmentId: id },
      },
    })
  }

  // Patient : uniquement son propre RDV
  if (session.user.role === "PATIENT" && appointment.patientId !== session.user.id) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 })
  }

  return NextResponse.json({ success: true, data: appointment })
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params

  const allowed = ["SUPER_ADMIN", "CALL_CENTER_AGENT", "PATIENT"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = putSchema.parse(await req.json())

    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) return NextResponse.json({ error: "Non trouvé" }, { status: 404 })

    // Patient ne peut qu'annuler ses propres RDV
    if (session.user.role === "PATIENT") {
      if (appointment.patientId !== session.user.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
      }
      if (body.status !== "CANCELLED") {
        return NextResponse.json({ error: "Le patient ne peut qu'annuler un RDV." }, { status: 403 })
      }
      const updated = await prisma.appointment.update({
        where: { id },
        data:  { status: "CANCELLED" },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    // Admin / Call Center peuvent modifier date et notes
    const updateData: Record<string, unknown> = {}
    if (body.scheduledAt) updateData.scheduledAt = new Date(body.scheduledAt)
    if (body.duration)    updateData.duration    = body.duration
    if (body.notes)       updateData.notes       = body.notes
    if (body.adminNote)   updateData.adminNote   = body.adminNote
    if (body.status)      updateData.status      = body.status

    const updated = await prisma.appointment.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[appointments PUT]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params

  const allowed = ["SUPER_ADMIN", "CALL_CENTER_AGENT"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = z.record(z.string(), z.unknown()).parse(await req.json())
    // Champs autorisés uniquement (whitelist)
    const safe = Object.fromEntries(
      Object.entries(body).filter(([k]) => ["notes", "status", "adminNote", "scheduledAt"].includes(k))
    )
    const updated = await prisma.appointment.update({ where: { id }, data: safe })
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    console.error("[appointments PATCH]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
