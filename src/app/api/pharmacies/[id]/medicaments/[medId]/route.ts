import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface Params { params: Promise<{ id: string; medId: string }> }

const updateSchema = z.object({
  nomMedicament:    z.string().min(2).optional(),
  nomGenerique:     z.string().optional(),
  marque:           z.string().optional(),
  prixUnitaire:     z.number().positive().optional(),
  quantiteStock:    z.number().int().min(0).optional(),
  stockMinimum:     z.number().int().min(0).optional(),
  estDisponible:    z.boolean().optional(),
  description:      z.string().optional(),
  formeGalenique:   z.string().optional(),
  dosage:           z.string().optional(),
  photoUrl:         z.string().url().optional(),
  ordonnanceRequise: z.boolean().optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id, medId } = await params

  const medicament = await prisma.medicamentStock.findUnique({
    where: { id: medId },
    include: { pharmacie: true },
  })
  if (!medicament || medicament.pharmacieId !== id) {
    return NextResponse.json({ error: "Médicament introuvable." }, { status: 404 })
  }

  const isOwner = session.user.role === "PHARMACIE" && medicament.pharmacie.userId === session.user.id
  if (!isOwner && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = updateSchema.parse(await req.json())
    const updated = await prisma.medicamentStock.update({ where: { id: medId }, data: body })
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id, medId } = await params

  const medicament = await prisma.medicamentStock.findUnique({
    where: { id: medId },
    include: { pharmacie: true, lignesCommande: { take: 1 } },
  })
  if (!medicament || medicament.pharmacieId !== id) {
    return NextResponse.json({ error: "Médicament introuvable." }, { status: 404 })
  }

  const isOwner = session.user.role === "PHARMACIE" && medicament.pharmacie.userId === session.user.id
  if (!isOwner && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  // Soft delete si dans des commandes existantes
  if (medicament.lignesCommande.length > 0) {
    await prisma.medicamentStock.update({ where: { id: medId }, data: { estDisponible: false } })
    return NextResponse.json({ success: true, message: "Médicament désactivé (commandes existantes)." })
  }

  await prisma.medicamentStock.delete({ where: { id: medId } })
  return NextResponse.json({ success: true, message: "Médicament supprimé." })
}
