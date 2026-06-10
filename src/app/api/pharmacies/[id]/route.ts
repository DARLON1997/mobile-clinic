import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

interface Params { params: Promise<{ id: string }> }

const updateSchema = z.object({
  nomPharmacie:    z.string().min(2).optional(),
  adresse:         z.string().min(5).optional(),
  quartier:        z.string().min(2).optional(),
  telephone:       z.string().optional(),
  email:           z.string().email().optional(),
  description:     z.string().optional(),
  horaires:        z.record(z.string(), z.unknown()).optional(),
  accepteLivraison: z.boolean().optional(),
  zoneLivraison:   z.string().optional(),
  latitude:        z.number().optional(),
  longitude:       z.number().optional(),
  logoUrl:         z.string().url().optional(),
  photoUrl:        z.string().url().optional(),
})

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params

  const pharmacie = await prisma.pharmacieProfile.findUnique({
    where: { id },
    include: {
      medicaments: {
        where: { estDisponible: true },
        orderBy: { nomMedicament: "asc" },
      },
      avis: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } } },
      },
    },
  })

  if (!pharmacie) return NextResponse.json({ error: "Pharmacie introuvable." }, { status: 404 })

  return NextResponse.json({ success: true, data: pharmacie })
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params

  const pharmacie = await prisma.pharmacieProfile.findUnique({ where: { id } })
  if (!pharmacie) return NextResponse.json({ error: "Pharmacie introuvable." }, { status: 404 })

  const isOwner = session.user.role === "PHARMACIE" && pharmacie.userId === session.user.id
  const isAdmin = session.user.role === "SUPER_ADMIN"
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = updateSchema.parse(await req.json())
    const updated = await prisma.pharmacieProfile.update({
      where: { id },
      data: body as unknown as Prisma.PharmacieProfileUpdateInput,
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[PUT /api/pharmacies/[id]]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
