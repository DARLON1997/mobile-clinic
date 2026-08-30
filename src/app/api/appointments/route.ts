import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { triggerAdminNotification } from "@/lib/pusher"
import { checkSlotInMemory, fetchAvailabilitiesForDoctors } from "@/lib/check-doctor-availability"
import { appointmentReasonSchema } from "@/lib/validation/appointment"

const postSchema = z.object({
  doctorId:    z.string().cuid(),
  scheduledAt: z.string().datetime(),
  reason:      appointmentReasonSchema,
  duration:    z.union([
    z.literal(15), z.literal(30), z.literal(45), z.literal(60)
  ]).default(30),
  notes:       z.string().optional(),
  patientId:   z.string().cuid().optional(), // Call Center uniquement
  instant:     z.boolean().optional(),       // Consultation instantanée : auto-approuvée
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  // AGENT_TERRAIN n'a pas accès aux RDV
  if (session.user.role === "AGENT_TERRAIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page      = Math.max(1, parseInt(searchParams.get("page")  ?? "1"))
  const limit     = Math.min(100, parseInt(searchParams.get("limit") ?? "20"))
  const status    = searchParams.get("status")    ?? undefined
  const date      = searchParams.get("date")      ?? undefined
  const activeNow = searchParams.get("activeNow") === "true"

  // RÈGLE R1 : le médecin ne voit que ses RDV avec adminApprovedAt non null
  const where: Record<string, unknown> = (() => {
    switch (session.user.role) {
      case "PATIENT":           return { patientId: session.user.id }
      case "MEDECIN":           return { doctorId: session.user.id, adminApprovedAt: { not: null } }
      case "CALL_CENTER_AGENT": return {}
      case "SUPER_ADMIN":       return {}
      default:                  return { patientId: session.user.id }
    }
  })()

  if (activeNow) {
    // Consultations actives maintenant : fenêtre 90 min avant → 15 min après scheduledAt
    const now = new Date()
    where.scheduledAt = {
      gte: new Date(now.getTime() - 90 * 60 * 1000),
      lte: new Date(now.getTime() + 15 * 60 * 1000),
    }
    where.status = { in: ["CONFIRMED", "IN_PROGRESS"] }
  } else {
    if (status) where.status = status
    if (date) {
      const d = new Date(date)
      const nextDay = new Date(d)
      nextDay.setDate(d.getDate() + 1)
      where.scheduledAt = { gte: d, lt: nextDay }
    }
  }
  if (searchParams.get("doctorId"))  where.doctorId  = searchParams.get("doctorId")
  if (searchParams.get("patientId")) where.patientId = searchParams.get("patientId")

  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true, email: true, phone: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
        doctor: {
          select: {
            id: true, email: true,
            doctorProfile: { select: { firstName: true, lastName: true, speciality: true, consultationFee: true } },
          },
        },
        payment:      { select: { status: true, amount: true } },
        consultation: { select: { id: true, diagnosis: true, prescriptionUrl: true } },
      },
      orderBy: { scheduledAt: "asc" },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
  ])

  // Enrichir avec la vérification de disponibilité (Admin & Call Center seulement)
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "CALL_CENTER_AGENT") {
    try {
      const actionableStatuses = ["PENDING", "AWAITING_APPROVAL"]
      const actionableRows = appointments.filter(a => actionableStatuses.includes(a.status))
      const doctorIds = [...new Set(actionableRows.map(a => a.doctorId))]
      const availMap  = await fetchAvailabilitiesForDoctors(doctorIds)

      const enriched = appointments.map(a => {
        if (!actionableStatuses.includes(a.status)) return { ...a, availabilityCheck: null }
        const avails = availMap.get(a.doctorId) ?? []
        return {
          ...a,
          availabilityCheck: checkSlotInMemory(avails, new Date(a.scheduledAt), a.duration),
        }
      })
      return NextResponse.json({ success: true, data: enriched, meta: { total, page, limit } })
    } catch {
      // Table DoctorAvailability pas encore migrée — dégradation silencieuse
    }
  }

  return NextResponse.json({ success: true, data: appointments, meta: { total, page, limit } })
}

export async function POST(req: Request) {
  const session = await auth()
  const allowed = ["PATIENT", "CALL_CENTER_AGENT"]
  if (!session || !allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const data = postSchema.parse(await req.json())

    // Déterminer le patientId
    const patientId = session.user.role === "CALL_CENTER_AGENT"
      ? data.patientId
      : session.user.id

    if (!patientId) {
      return NextResponse.json({ error: "patientId requis pour Call Center." }, { status: 400 })
    }

    // Vérifier que le patient existe en base (protection contre les sessions orphelines)
    const patientUser = await prisma.user.findUnique({
      where:  { id: patientId },
      select: { id: true, isActive: true },
    })
    if (!patientUser) {
      return NextResponse.json({
        error: "Session expirée ou compte introuvable. Déconnectez-vous et reconnectez-vous.",
      }, { status: 401 })
    }
    if (!patientUser.isActive) {
      return NextResponse.json({ error: "Compte suspendu. Contactez le support." }, { status: 403 })
    }

    // Vérifier que le médecin est validé
    const doctor = await prisma.doctorProfile.findFirst({
      where: { userId: data.doctorId, isVerifiedByAdmin: true },
    })
    if (!doctor) {
      return NextResponse.json({ error: "Médecin non trouvé ou non validé." }, { status: 404 })
    }

    const scheduledAt = new Date(data.scheduledAt)
    if (scheduledAt <= new Date()) {
      return NextResponse.json({ error: "La date de consultation doit être dans le futur." }, { status: 400 })
    }

    // Bloquer uniquement si le médecin est en appel vidéo actif EN CE MOMENT
    // (scheduledAt dans les 90 dernières minutes — évite les RDV bloqués en IN_PROGRESS)
    const doctorInCall = await prisma.appointment.findFirst({
      where: {
        doctorId:    data.doctorId,
        status:      "IN_PROGRESS",
        scheduledAt: { gte: new Date(Date.now() - 90 * 60 * 1000) },
      },
    })
    if (doctorInCall) {
      return NextResponse.json({
        error: "Ce médecin est actuellement en consultation vidéo. Veuillez réessayer dans quelques minutes.",
      }, { status: 409 })
    }

    // Patient → opération unique (pas besoin de transaction)
    // Call Center → transaction atomique (RDV + notification)
    let appointment
    if (session.user.role === "CALL_CENTER_AGENT") {
      appointment = await prisma.$transaction(async (tx) => {
        const appt = await tx.appointment.create({
          data: {
            patientId,
            doctorId:    data.doctorId,
            scheduledAt,
            duration:    data.duration,
            reason:      data.reason,
            notes:       data.notes,
            status:      "PENDING" as const,
            callCenterId: session.user.id,
          },
        })
        await tx.notification.create({
          data: {
            userId:  patientId!,
            type:    "APPOINTMENT_CREATED",
            title:   "Demande de RDV créée",
            message: "Une demande de rendez-vous a été enregistrée. Elle sera soumise à l'Admin pour autorisation.",
          },
        })
        return appt
      })
    } else {
      // RÈGLE R1 : toute demande patient (y compris instantanée) doit passer par l'admin
      appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId:  data.doctorId,
          scheduledAt,
          duration:  data.duration,
          reason:    data.reason,
          notes:     data.notes,
          status:    "AWAITING_APPROVAL" as const,
          isInstant: data.instant ?? false,
        },
      })
    }

    // Pour une demande instantanée : notifier l'admin via l'event d'approbation urgent
    // Pour une demande classique patient : notifier via new-appointment
    const pusherEvent = data.instant
      ? "new-approval-request"
      : "new-appointment"
    triggerAdminNotification(pusherEvent, {
      appointmentId: appointment.id,
      patientId,
      doctorId:  data.doctorId,
      isInstant: data.instant ?? false,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: appointment }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[appointments POST]", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
