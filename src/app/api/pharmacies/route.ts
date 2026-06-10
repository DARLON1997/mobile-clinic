import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const createSchema = z.object({
  email:           z.string().email(),
  telephone:       z.string().min(8),
  nomPharmacie:    z.string().min(2),
  numeroLicence:   z.string().min(2),
  adresse:         z.string().min(5),
  quartier:        z.string().min(2),
  ville:           z.string().default("Brazzaville"),
  accepteLivraison: z.boolean().default(false),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ville          = searchParams.get("ville") ?? "Brazzaville"
  const quartier       = searchParams.get("quartier")
  const acceptelivraison = searchParams.get("accepteLivraison")
  const isVerified     = searchParams.get("isVerified")
  const search         = searchParams.get("search")

  const where: Record<string, unknown> = {
    isActive: true,
    ville,
  }
  if (quartier)         where.quartier    = { contains: quartier, mode: "insensitive" }
  if (isVerified)       where.isVerified  = isVerified === "true"
  if (acceptelivraison) where.accepteLivraison = acceptelivraison === "true"
  if (search)           where.nomPharmacie = { contains: search, mode: "insensitive" }

  const pharmacies = await prisma.pharmacieProfile.findMany({
    where,
    orderBy: [{ isVerified: "desc" }, { notesMoyenne: "desc" }],
    select: {
      id: true, nomPharmacie: true, adresse: true, quartier: true, ville: true,
      telephone: true, logoUrl: true, photoUrl: true, horaires: true,
      notesMoyenne: true, nombreAvis: true, isVerified: true,
      accepteLivraison: true, latitude: true, longitude: true,
    },
  })

  return NextResponse.json({ success: true, data: pharmacies })
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = createSchema.parse(await req.json())

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.telephone }] },
    })
    if (existing) {
      return NextResponse.json({ error: "Email ou téléphone déjà utilisé." }, { status: 409 })
    }

    const tempPassword = `Pharma@${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const defaultHoraires = {
      lundi:    { open: "08:00", close: "20:00", closed: false },
      mardi:    { open: "08:00", close: "20:00", closed: false },
      mercredi: { open: "08:00", close: "20:00", closed: false },
      jeudi:    { open: "08:00", close: "20:00", closed: false },
      vendredi: { open: "08:00", close: "20:00", closed: false },
      samedi:   { open: "09:00", close: "18:00", closed: false },
      dimanche: { open: "09:00", close: "14:00", closed: false },
    }

    const user = await prisma.user.create({
      data: {
        email:        body.email,
        phone:        body.telephone,
        passwordHash,
        role:         "PHARMACIE",
        isActive:     true,
        isVerified:   false,
        pharmacieProfile: {
          create: {
            nomPharmacie:    body.nomPharmacie,
            numeroLicence:   body.numeroLicence,
            adresse:         body.adresse,
            quartier:        body.quartier,
            ville:           body.ville,
            telephone:       body.telephone,
            email:           body.email,
            horaires:        defaultHoraires,
            accepteLivraison: body.accepteLivraison,
          },
        },
      },
      include: { pharmacieProfile: true },
    })

    await prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "CREATE_PHARMACIE",
        targetId:   user.id,
        targetType: "PharmacieProfile",
        details:    { nomPharmacie: body.nomPharmacie },
      },
    })

    return NextResponse.json({
      success: true,
      data:    { userId: user.id, tempPassword },
      message: `Pharmacie créée. Mot de passe temporaire : ${tempPassword}`,
    }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[POST /api/pharmacies]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
