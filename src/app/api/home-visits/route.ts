import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { triggerMissionUpdate } from "@/lib/pusher"
import { sendSMS } from "@/lib/africas-talking"

const createSchema = z.object({
  patientId:   z.string().cuid(),
  type:        z.enum(["CARE", "SAMPLING"]),
  address:     z.string().min(5),
  city:        z.string().default("Brazzaville"),
  scheduledAt: z.string().datetime(),
  reason:      z.string().min(5),
  notes:       z.string().optional(),
})

const assignSchema = z.object({
  homeVisitId: z.string().cuid(),
  agentId:     z.string().cuid(),
})

const patchSchema = z.object({
  homeVisitId: z.string().cuid(),
  status:      z.enum(["EN_ROUTE", "ARRIVED", "COMPLETED", "CANCELLED"]),
  photoUrl:    z.string().url().optional(),
  reportText:  z.string().optional(),
})

// GET — Lister les visites selon le rôle
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  // RÈGLE R5 : agent terrain → uniquement ses propres missions
  const where =
    session.user.role === "AGENT_TERRAIN" ? { agentId: session.user.id }      :
    session.user.role === "PATIENT"       ? { patientId: session.user.id }     :
    {}

  const visits = await prisma.homeVisit.findMany({
    where,
    include: {
      patient: { include: { patientProfile: { select: { firstName: true, lastName: true, address: true } } } },
      agent:   { include: { agentProfile:   { select: { firstName: true, lastName: true, zone: true } } } },
      payment: { select: { status: true, amount: true } },
    },
    orderBy: { scheduledAt: "asc" },
  })

  return NextResponse.json({ success: true, data: visits })
}

// POST — Créer une visite à domicile
export async function POST(req: Request) {
  const session = await auth()
  const allowed = ["SUPER_ADMIN", "CALL_CENTER_AGENT", "PATIENT"]
  if (!session || !allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = createSchema.parse(await req.json())

    const visit = await prisma.$transaction(async (tx) => {
      const hv = await tx.homeVisit.create({
        data: {
          patientId:   body.patientId,
          type:        body.type,
          address:     body.address,
          city:        body.city,
          scheduledAt: new Date(body.scheduledAt),
          reason:      body.reason,
          notes:       body.notes,
          status:      "PENDING",
        },
      })

      await tx.notification.create({
        data: {
          userId:  body.patientId,
          type:    "HOME_VISIT_CREATED",
          title:   "Demande de soin à domicile reçue",
          message: `Votre demande de ${body.type === "CARE" ? "soin" : "prélèvement"} est en cours de traitement.`,
        },
      })

      return hv
    })

    return NextResponse.json({ success: true, data: visit }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    console.error("[home-visits POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT — Assigner un agent (SUPER_ADMIN uniquement)
export async function PUT(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin" }, { status: 403 })
  }

  try {
    const { homeVisitId, agentId } = assignSchema.parse(await req.json())

    const visit = await prisma.homeVisit.findUnique({ where: { id: homeVisitId } })
    if (!visit) return NextResponse.json({ error: "Visite non trouvée" }, { status: 404 })
    if (visit.status !== "PENDING") {
      return NextResponse.json({ error: "Cette visite ne peut plus être assignée." }, { status: 409 })
    }

    // Vérifier que l'agent existe
    const agentUser = await prisma.user.findFirst({
      where:   { id: agentId, role: "AGENT_TERRAIN" },
      include: { agentProfile: true },
    })
    if (!agentUser) return NextResponse.json({ error: "Agent non trouvé" }, { status: 404 })

    const updated = await prisma.$transaction(async (tx) => {
      const hv = await tx.homeVisit.update({
        where: { id: homeVisitId },
        data:  { agentId, status: "ASSIGNED" },
      })

      // RÈGLE R3 : audit assignation
      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "HOME_VISIT_ASSIGNED",
          targetId:   homeVisitId,
          targetType: "HomeVisit",
          details:    { agentId },
        },
      })

      // Notification agent
      await tx.notification.create({
        data: {
          userId:  agentId,
          type:    "HOME_VISIT_ASSIGNED",
          title:   "Nouvelle mission assignée",
          message: `Vous avez une nouvelle visite à domicile prévue le ${new Date(visit.scheduledAt).toLocaleDateString("fr-FR")}.`,
        },
      })

      return hv
    })

    // SMS agent (non bloquant)
    if (agentUser.phone) {
      sendSMS(agentUser.phone,
        `Mobile Clinic : Nouvelle mission assignée le ${new Date(visit.scheduledAt).toLocaleDateString("fr-FR")} — adresse : ${visit.address}.`
      ).catch(console.error)
    }

    triggerMissionUpdate(homeVisitId, "ASSIGNED").catch(console.error)

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    console.error("[home-visits PUT]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PATCH — Mise à jour statut par l'agent terrain
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "AGENT_TERRAIN") {
    return NextResponse.json({ error: "Réservé aux agents terrain" }, { status: 403 })
  }

  try {
    const body = patchSchema.parse(await req.json())

    const visit = await prisma.homeVisit.findUnique({ where: { id: body.homeVisitId } })
    if (!visit) return NextResponse.json({ error: "Visite non trouvée" }, { status: 404 })

    // RÈGLE R5 : agent terrain ne peut modifier que ses propres missions
    if (visit.agentId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé — ce n'est pas votre mission." }, { status: 403 })
    }

    // Transitions de statut valides pour un agent
    const VALID_TRANSITIONS: Record<string, string[]> = {
      ASSIGNED:  ["EN_ROUTE", "CANCELLED"],
      EN_ROUTE:  ["ARRIVED"],
      ARRIVED:   ["COMPLETED", "CANCELLED"],
    }
    const allowed = VALID_TRANSITIONS[visit.status] ?? []
    if (!allowed.includes(body.status)) {
      return NextResponse.json({
        error: `Transition ${visit.status} → ${body.status} non autorisée.`,
      }, { status: 409 })
    }

    const updateData: Record<string, unknown> = { status: body.status }
    if (body.photoUrl)   updateData.photoUrl   = body.photoUrl
    if (body.reportText) updateData.reportText = body.reportText
    if (body.status === "COMPLETED") updateData.completedAt = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const hv = await tx.homeVisit.update({
        where: { id: body.homeVisitId },
        data:  updateData,
      })

      // RÈGLE R3 : audit
      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     `HOME_VISIT_${body.status}`,
          targetId:   body.homeVisitId,
          targetType: "HomeVisit",
          details:    { previousStatus: visit.status, newStatus: body.status },
        },
      })

      // Notification patient quand COMPLETED
      if (body.status === "COMPLETED") {
        await tx.notification.create({
          data: {
            userId:  visit.patientId,
            type:    "HOME_VISIT_COMPLETED",
            title:   "Visite à domicile terminée",
            message: "L'agent a terminé votre soin à domicile. Merci de votre confiance.",
          },
        })
      }

      return hv
    })

    triggerMissionUpdate(body.homeVisitId, body.status).catch(console.error)

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    console.error("[home-visits PATCH]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
