import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { triggerAdminNotification } from "@/lib/pusher"
import { checkSlotInMemory, fetchAvailabilitiesForDoctors } from "@/lib/check-doctor-availability"

const createSchema = z.object({
  patientId:  z.string().cuid().optional(),
  doctorId:   z.string().cuid(),
  cabinetId:  z.string().cuid(),
  scheduledAt: z.string().datetime(),
  duration:   z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).default(30),
  reason:     z.string().min(10, "Le motif doit contenir au moins 10 caractères"),
  notes:      z.string().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"))
  const status = searchParams.get("status") ?? undefined
  const date = searchParams.get("date") ?? undefined

  const where: Record<string, unknown> = (() => {
    switch (session.user.role) {
      case "PATIENT":           return { patientId: session.user.id }
      case "MEDECIN":           return { doctorId: session.user.id }
      case "CALL_CENTER_AGENT": return {}
      case "SUPER_ADMIN":       return {}
      default:                  return { patientId: session.user.id }
    }
  })()

  if (status) where.status = status
  if (date) {
    const start = new Date(date)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.scheduledAt = { gte: start, lt: end }
  }
  if (searchParams.get("doctorId"))  where.doctorId  = searchParams.get("doctorId")
  if (searchParams.get("patientId")) where.patientId = searchParams.get("patientId")

  const [total, presentiels] = await Promise.all([
    prisma.rendezVousPresentiel.count({ where }),
    prisma.rendezVousPresentiel.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
        doctor: {
          select: {
            id: true,
            doctorProfile: {
              select: {
                firstName: true,
                lastName: true,
                speciality: true,
                consultationFee: true,
              },
            },
          },
        },
        cabinet: true,
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  // Enrichir avec la vérification de disponibilité (Admin & Call Center seulement)
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "CALL_CENTER_AGENT") {
    try {
      const actionableStatuses = ["EN_ATTENTE", "NOUVEAU_CRENEAU"]
      const actionableRows = presentiels.filter(p => actionableStatuses.includes(p.status))
      const doctorIds = [...new Set(actionableRows.map(p => p.doctorId))]
      const availMap  = await fetchAvailabilitiesForDoctors(doctorIds)

      const enriched = presentiels.map(p => {
        if (!actionableStatuses.includes(p.status)) return { ...p, availabilityCheck: null }
        const avails = availMap.get(p.doctorId) ?? []
        return {
          ...p,
          availabilityCheck: checkSlotInMemory(avails, new Date(p.scheduledAt), p.duration),
        }
      })
      return NextResponse.json({ success: true, data: enriched, meta: { total, page, limit } })
    } catch {
      // Table DoctorAvailability pas encore migrée — dégradation silencieuse
    }
  }

  return NextResponse.json({ success: true, data: presentiels, meta: { total, page, limit } })
}

export async function POST(req: Request) {
  const session = await auth()
  const allowed = ["PATIENT", "CALL_CENTER_AGENT"]
  if (!session || !allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = createSchema.parse(await req.json())
    const patientId = session.user.role === "PATIENT" ? session.user.id : body.patientId

    if (!patientId) {
      return NextResponse.json({ error: "patientId requis pour le Call Center." }, { status: 400 })
    }

    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { id: true, isActive: true } })
    if (!patient || !patient.isActive) {
      return NextResponse.json({ error: "Patient introuvable ou compte inactif." }, { status: 404 })
    }

    const doctor = await prisma.doctorProfile.findFirst({ where: { userId: body.doctorId, isVerifiedByAdmin: true } })
    if (!doctor) {
      return NextResponse.json({ error: "Médecin non trouvé ou non validé." }, { status: 404 })
    }

    const cabinet = await prisma.cabinetMedecin.findUnique({ where: { id: body.cabinetId } })
    if (!cabinet || cabinet.doctorId !== body.doctorId) {
      return NextResponse.json({ error: "Cabinet médical invalide pour ce médecin." }, { status: 400 })
    }

    const scheduledAt = new Date(body.scheduledAt)
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return NextResponse.json({ error: "La date doit être dans le futur." }, { status: 400 })
    }

    // Bloquer uniquement si le médecin est en appel vidéo actif EN CE MOMENT
    const doctorInCall = await prisma.appointment.findFirst({
      where: {
        doctorId:    body.doctorId,
        status:      "IN_PROGRESS",
        scheduledAt: { gte: new Date(Date.now() - 90 * 60 * 1000) },
      },
    })
    if (doctorInCall) {
      return NextResponse.json({
        error: "Ce médecin est actuellement en consultation vidéo. Veuillez réessayer dans quelques minutes.",
      }, { status: 409 })
    }

    const presentiel = await prisma.rendezVousPresentiel.create({
      data: {
        patientId,
        doctorId: body.doctorId,
        callCenterId: session.user.role === "CALL_CENTER_AGENT" ? session.user.id : null,
        cabinetId: body.cabinetId,
        scheduledAt,
        duration: body.duration,
        reason: body.reason,
        notes: body.notes ?? null,
        status: "EN_ATTENTE",
      },
    })

    await prisma.notification.create({
      data: {
        userId: patientId,
        type: "PRESENTIEL_REQUESTED",
        title: "Demande de consultation présentielle reçue",
        message: "Votre demande de consultation en cabinet a bien été enregistrée.",
      },
    })

    triggerAdminNotification("new-appointment", {
      type: "PRESENTIEL",
      presentielId: presentiel.id,
      patientId,
      doctorId: body.doctorId,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: presentiel }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[presentiel POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
