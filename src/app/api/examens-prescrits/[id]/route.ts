import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logServerError } from "@/lib/error-logger"

const updateSchema = z.object({
  statut:       z.enum(["EN_ATTENTE", "EFFECTUE", "RESULTATS_RECUS"]),
  resultatNote: z.string().optional(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = updateSchema.parse(await req.json())

    const examen = await prisma.examenPrescrit.update({
      where: { id },
      data:  { statut: body.statut, resultatNote: body.resultatNote },
    })

    return NextResponse.json({ data: examen })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    logServerError("EXAMEN_UPDATE", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
