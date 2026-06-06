import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"
import { z }            from "zod"

const patchSchema = z.object({
  address:         z.string().min(2).optional(),
  city:            z.string().min(2).optional(),
  emergencyContact: z.string().optional(),
  medicalHistory:  z.string().optional(),
  allergies:       z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (session?.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 })

  return NextResponse.json({ data: profile })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (session?.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.patientProfile.update({
    where: { userId: session.user.id },
    data:  parsed.data,
  })

  return NextResponse.json({ data: updated })
}
