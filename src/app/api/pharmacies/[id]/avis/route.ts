import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface Params { params: Promise<{ id: string }> }

const avisSchema = z.object({
  note:        z.number().int().min(1).max(5),
  commentaire: z.string().max(500).optional(),
  commandeId:  z.string().cuid(),
})

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const avis = await prisma.avisPharmacie.findMany({
    where: { pharmacieId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } },
    },
  })
  return NextResponse.json({ success: true, data: avis })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (session?.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Réservé aux patients." }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = avisSchema.parse(await req.json())

    // Vérifier que le patient a une commande DELIVERED pour cette pharmacie
    const commande = await prisma.commandePharmacie.findFirst({
      where: { id: body.commandeId, patientId: session.user.id, pharmacieId: id, status: "DELIVERED" },
    })
    if (!commande) {
      return NextResponse.json({ error: "Vous devez avoir reçu une commande pour laisser un avis." }, { status: 403 })
    }

    const avis = await prisma.avisPharmacie.create({
      data: {
        patientId:   session.user.id,
        pharmacieId: id,
        note:        body.note,
        commentaire: body.commentaire,
        commandeId:  body.commandeId,
      },
    })

    // Recalculer notesMoyenne
    const stats = await prisma.avisPharmacie.aggregate({
      where: { pharmacieId: id },
      _avg: { note: true },
      _count: true,
    })
    await prisma.pharmacieProfile.update({
      where: { id },
      data: {
        notesMoyenne: stats._avg.note ?? 0,
        nombreAvis:   stats._count,
      },
    })

    return NextResponse.json({ success: true, data: avis }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[POST avis]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
