import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { triggerCallCenterPresentiel, triggerAdminNotification } from "@/lib/pusher"
import { logServerError } from "@/lib/error-logger"

const schema = z.object({
  appointmentId:       z.string(),
  presentielRecommande: z.enum(["EVENTUEL", "OBLIGATOIRE", "URGENT"]),
  presentielMotif:     z.string().min(1),
})

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  try {
    const body = schema.parse(await req.json())

    // R1 : vérifier approbation admin
    const appt = await prisma.appointment.findUnique({
      where: { id: body.appointmentId, doctorId: session.user.id, adminApprovedAt: { not: null } },
      select: {
        id: true,
        patientId: true,
        patient: {
          select: { phone: true, patientProfile: { select: { firstName: true, lastName: true } } },
        },
        doctor: {
          select: { doctorProfile: { select: { firstName: true, lastName: true } } },
        },
      },
    })
    if (!appt) return NextResponse.json({ error: "Accès refusé." }, { status: 403 })

    const now = new Date()

    // Upsert consultation avec l'alerte présentiel
    const consultation = await prisma.consultation.upsert({
      where:  { appointmentId: body.appointmentId },
      create: {
        appointmentId:        body.appointmentId,
        presentielRecommande: body.presentielRecommande,
        presentielMotif:      body.presentielMotif,
        presentielNotifieAt:  now,
      },
      update: {
        presentielRecommande: body.presentielRecommande,
        presentielMotif:      body.presentielMotif,
        presentielNotifieAt:  now,
      },
    })

    const patientName = appt.patient.patientProfile
      ? `${appt.patient.patientProfile.firstName} ${appt.patient.patientProfile.lastName}`
      : appt.patient.phone
    const doctorName = appt.doctor.doctorProfile
      ? `Dr ${appt.doctor.doctorProfile.firstName} ${appt.doctor.doctorProfile.lastName}`
      : "Médecin"

    const payload = {
      consultationId:       consultation.id,
      appointmentId:        body.appointmentId,
      patientId:            appt.patientId,
      patientName,
      doctorName,
      urgence:              body.presentielRecommande,
      motif:                body.presentielMotif,
      notifieAt:            now.toISOString(),
    }

    // Notifications temps réel
    triggerCallCenterPresentiel(payload).catch(console.error)
    triggerAdminNotification("presentiel-alerte", payload).catch(console.error)

    // AuditLog
    prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "PRESENTIEL_RECOMMANDE",
        targetId:   body.appointmentId,
        targetType: "Appointment",
        details:    { urgence: body.presentielRecommande, motif: body.presentielMotif },
      },
    }).catch(console.error)

    return NextResponse.json({ success: true, consultationId: consultation.id })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    logServerError("PRESENTIEL_ALERTE", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}

// GET — liste des alertes non traitées (Call Center + Admin)
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user.role || !["SUPER_ADMIN", "CALL_CENTER_AGENT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  const url = new URL(req.url)
  const traites = url.searchParams.get("traites") === "true"

  const consultations = await prisma.consultation.findMany({
    where: {
      presentielRecommande: { not: null },
      presentielTraiteAt:   traites ? { not: null } : null,
    },
    orderBy: [
      { presentielRecommande: "asc" }, // URGENT < OBLIGATOIRE < EVENTUEL (alphabétique = mauvais ordre)
      { presentielNotifieAt: "asc" },
    ],
    select: {
      id:                    true,
      presentielRecommande:  true,
      presentielMotif:       true,
      presentielNotifieAt:   true,
      presentielTraiteAt:    true,
      presentielTraiteParId: true,
      appointmentId:         true,
      appointment: {
        select: {
          scheduledAt: true,
          patient: {
            select: { phone: true, patientProfile: { select: { firstName: true, lastName: true } } },
          },
          doctor: {
            select: { doctorProfile: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
  })

  // Tri manuel : URGENT > OBLIGATOIRE > EVENTUEL
  const urgenceOrder = { URGENT: 0, OBLIGATOIRE: 1, EVENTUEL: 2 }
  consultations.sort((a, b) =>
    (urgenceOrder[a.presentielRecommande!] ?? 3) - (urgenceOrder[b.presentielRecommande!] ?? 3)
  )

  return NextResponse.json({ data: consultations })
}

// PUT — marquer comme traité (Call Center uniquement)
export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user.role !== "CALL_CENTER_AGENT") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  const { consultationId } = await req.json()
  if (!consultationId) return NextResponse.json({ error: "consultationId requis." }, { status: 400 })

  const updated = await prisma.consultation.update({
    where: { id: consultationId },
    data: {
      presentielTraiteParId: session.user.id,
      presentielTraiteAt:    new Date(),
    },
  })

  return NextResponse.json({ data: updated })
}
