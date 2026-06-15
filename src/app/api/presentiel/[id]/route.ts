import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface Params { params: Promise<{ id: string }> }

const updateSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  duration: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
  status: z.enum(["EN_ATTENTE", "NOUVEAU_CRENEAU", "CRENEAU_ACCEPTE", "CONFIRME", "EN_COURS", "TERMINE", "ANNULE", "ABSENT"]).optional(),
  notes: z.string().optional(),
})

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params
  const presentiel = await prisma.rendezVousPresentiel.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, patientProfile: { select: { firstName: true, lastName: true } } } },
      doctor:  { select: { id: true, doctorProfile: { select: { firstName: true, lastName: true, speciality: true, consultationFee: true } } } },
      cabinet: true,
      payment: { select: { status: true, amount: true } },
    },
  })

  if (!presentiel) return NextResponse.json({ error: "Non trouvé" }, { status: 404 })

  if (session.user.role === "PATIENT" && presentiel.patientId !== session.user.id) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
  }
  if (session.user.role === "MEDECIN" && presentiel.doctorId !== session.user.id) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
  }

  return NextResponse.json({ success: true, data: presentiel })
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params
  const presentiel = await prisma.rendezVousPresentiel.findUnique({ where: { id } })
  if (!presentiel) return NextResponse.json({ error: "Non trouvé" }, { status: 404 })

  try {
    const body = updateSchema.parse(await req.json())

    if (session.user.role === "PATIENT") {
      if (presentiel.patientId !== session.user.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
      }
      if (body.status !== "ANNULE") {
        return NextResponse.json({ error: "Le patient ne peut qu'annuler." }, { status: 403 })
      }
      const updated = await prisma.rendezVousPresentiel.update({ where: { id }, data: { status: "ANNULE" } })
      return NextResponse.json({ success: true, data: updated })
    }

    const updateData: Record<string, unknown> = {}
    if (body.scheduledAt) updateData.scheduledAt = new Date(body.scheduledAt)
    if (body.duration) updateData.duration = body.duration
    if (body.status) updateData.status = body.status
    if (body.notes) updateData.notes = body.notes

    const updated = await prisma.rendezVousPresentiel.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    console.error("[presentiel PUT]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
