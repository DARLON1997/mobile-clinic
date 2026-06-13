import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { triggerAdminNotification } from "@/lib/pusher"

const postSchema = z.object({
  doctorId:    z.string().cuid(),
  scheduledAt: z.string().datetime(),
  reason:      z.string().min(10, "Le motif doit contenir au moins 10 caractères"),
  duration:    z.union([
    z.literal(15), z.literal(30), z.literal(45), z.literal(60)
  ]).default(30),
  notes:       z.string().optional(),
  patientId:   z.string().cuid().optional(), // Call Center uniquement
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  // AGENT_TERRAIN n'a pas accès aux RDV
  if (session.user.role === "AGENT_TERRAIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"))
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "20"))
  const status = searchParams.get("status") ?? undefined
  const date   = searchParams.get("date")   ?? undefined

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

  if (status) where.status = status
  if (date) {
    const d = new Date(date)
    const nextDay = new Date(d)
    nextDay.setDate(d.getDate() + 1)
    where.scheduledAt = { gte: d, lt: nextDay }
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

    // Vérifier que le médecin est validé
    const doctor = await prisma.doctorProfile.findFirst({
      where: { userId: data.doctorId, isVerifiedByAdmin: true },
    })
    if (!doctor) {
      return NextResponse.json({ error: "Médecin non trouvé ou non validé." }, { status: 404 })
    }

    // Vérifier qu'il n'y a pas de conflit de créneau pour le médecin
    const scheduledAt = new Date(data.scheduledAt)
    if (scheduledAt <= new Date()) {
      return NextResponse.json({ error: "La date de consultation doit être dans le futur." }, { status: 400 })
    }

    const windowMin = new Date(scheduledAt.getTime() - data.duration * 60 * 1000)
    const windowMax = new Date(scheduledAt.getTime() + data.duration * 60 * 1000)

    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId:    data.doctorId,
        scheduledAt: { gte: windowMin, lte: windowMax },
        status:      { notIn: ["CANCELLED", "REJECTED", "NO_SHOW"] },
      },
    })
    if (conflict) {
      return NextResponse.json({
        error: "Ce créneau est déjà pris pour ce médecin.",
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
      appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId:    data.doctorId,
          scheduledAt,
          duration:    data.duration,
          reason:      data.reason,
          notes:       data.notes,
          status:      "AWAITING_APPROVAL" as const,
        },
      })
    }

    // Notifier Admin/Call Center via Pusher (non bloquant)
    triggerAdminNotification("new-appointment", {
      appointmentId: appointment.id,
      patientId,
      doctorId: data.doctorId,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: appointment }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[appointments POST] DETAIL:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
