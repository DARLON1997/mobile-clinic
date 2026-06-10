import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

interface Params { params: Promise<{ id: string }> }

const medicamentSchema = z.object({
  nomMedicament:    z.string().min(2),
  nomGenerique:     z.string().optional(),
  marque:           z.string().optional(),
  categorie:        z.enum([
    "ANTIBIOTIQUE", "ANALGESIQUE", "ANTIPALUDEEN", "ANTIHYPERTENSEUR",
    "ANTIDIABETIQUE", "ANTIINFLAMMATOIRE", "ANTIPARASITAIRE", "VITAMINES",
    "CONTRACEPTIF", "DERMATOLOGIE", "OPHTALMOLOGIE", "GASTROENTEROLOGIE",
    "CARDIOVASCULAIRE", "NEUROLOGIE", "PEDIATRIE", "AUTRE_MEDICAMENT",
  ]),
  description:      z.string().optional(),
  formeGalenique:   z.string().min(2),
  dosage:           z.string().optional(),
  conditionnement:  z.string().optional(),
  prixUnitaire:     z.number().positive(),
  quantiteStock:    z.number().int().min(0),
  stockMinimum:     z.number().int().min(0).default(5),
  photoUrl:         z.string().url().optional(),
  ordonnanceRequise: z.boolean().default(false),
})

export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const categorie   = searchParams.get("categorie")
  const disponible  = searchParams.get("disponible")
  const search      = searchParams.get("search")

  const where: Record<string, unknown> = { pharmacieId: id }
  if (categorie)  where.categorie     = categorie
  if (disponible) where.estDisponible = disponible === "true"
  if (search)     where.nomMedicament = { contains: search, mode: "insensitive" }

  const medicaments = await prisma.medicamentStock.findMany({
    where,
    orderBy: [{ estDisponible: "desc" }, { nomMedicament: "asc" }],
  })

  return NextResponse.json({ success: true, data: medicaments })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params

  const pharmacie = await prisma.pharmacieProfile.findUnique({ where: { id } })
  if (!pharmacie) return NextResponse.json({ error: "Pharmacie introuvable." }, { status: 404 })

  const isOwner = session.user.role === "PHARMACIE" && pharmacie.userId === session.user.id
  if (!isOwner && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = medicamentSchema.parse(await req.json())
    const medicament = await prisma.medicamentStock.create({
      data: { ...body, pharmacieId: id },
    })

    await prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "MEDICAMENT_ADDED",
        targetId:   medicament.id,
        targetType: "MedicamentStock",
        details:    { pharmacieId: id, nomMedicament: body.nomMedicament },
      },
    })

    return NextResponse.json({ success: true, data: medicament }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[POST medicaments]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
