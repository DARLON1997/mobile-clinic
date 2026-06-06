import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createRoomToken } from "@/lib/daily"
import { z } from "zod"

const schema = z.object({ appointmentId: z.string().cuid() })

// R2 : la salle est accessible 15 min avant et jusqu'à 90 min après l'heure prévue
const WINDOW_BEFORE_MS = 15 * 60 * 1000
const WINDOW_AFTER_MS  = 90 * 60 * 1000

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const role = session.user.role
  if (role !== "MEDECIN" && role !== "PATIENT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const { appointmentId } = schema.parse(await req.json())

    // RÈGLE R1 : médecin → adminApprovedAt non null, obligatoirement en DB
    const whereDoctor  = { id: appointmentId, doctorId:  session.user.id, adminApprovedAt: { not: null } }
    const wherePatient = { id: appointmentId, patientId: session.user.id, status: "CONFIRMED" as const }

    const appointment = await prisma.appointment.findFirst({
      where: role === "MEDECIN" ? whereDoctor : wherePatient,
    })

    if (!appointment) {
      if (role === "MEDECIN") {
        // RÈGLE R3 : audit tentative sans approbation
        await prisma.auditLog.create({
          data: {
            userId:     session.user.id,
            action:     "UNAUTHORIZED_VIDEO_ACCESS",
            targetId:   appointmentId,
            targetType: "Appointment",
            details:    { reason: "adminApprovedAt is null or not this doctor's appointment" },
          },
        })
      }
      return NextResponse.json({ error: "RDV non trouvé ou non autorisé." }, { status: 403 })
    }

    if (!appointment.videoRoomName) {
      return NextResponse.json({ error: "Salle vidéo non encore créée." }, { status: 404 })
    }

    // RÈGLE R2 : fenêtre temporelle
    const now       = Date.now()
    const scheduled = appointment.scheduledAt.getTime()
    const openAt    = scheduled - WINDOW_BEFORE_MS
    const closeAt   = scheduled + WINDOW_AFTER_MS

    if (now < openAt) {
      const minutesLeft = Math.ceil((openAt - now) / 60000)
      return NextResponse.json(
        { error: `La salle ouvre dans ${minutesLeft} min.`, openAt: new Date(openAt).toISOString() },
        { status: 425 }
      )
    }
    if (now > closeAt) {
      return NextResponse.json({ error: "La fenêtre de consultation est terminée." }, { status: 410 })
    }

    // Passer le RDV en IN_PROGRESS si CONFIRMED (premier à rejoindre)
    if (appointment.status === "CONFIRMED") {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data:  { status: "IN_PROGRESS" },
      })
    }

    // RÈGLE R3 : audit accès dossier patient lors de la jonction du médecin
    if (role === "MEDECIN") {
      await prisma.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "ACCESSED_PATIENT_RECORD",
          targetId:   appointment.patientId,
          targetType: "PatientProfile",
          details:    { appointmentId, via: "video-token" },
        },
      })
    }

    const tokenRole = role === "MEDECIN" ? "owner" : "attendee"
    const token = await createRoomToken(
      appointment.videoRoomName,
      session.user.id,
      tokenRole,
      appointment.scheduledAt
    )

    return NextResponse.json({ success: true, token, roomUrl: appointment.videoRoomUrl })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    console.error("[video/token]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
