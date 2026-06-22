import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logServerError } from "@/lib/error-logger"

const patchSchema = z.object({
  appointmentId:       z.string(),
  signesSubjectifs:    z.string().optional(),
  hypothesesDiagnostic: z.string().optional(),
  prescriptionTexte:   z.string().optional(),
  clinicalNotes:       z.string().optional(),
  diagnosis:           z.string().optional(),
})

// PATCH — upsert partiel des notes (appelé en auto-save pendant la consultation)
export async function PATCH(req: Request) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  try {
    const body = patchSchema.parse(await req.json())

    // Vérifier R1 : le médecin doit avoir un RDV approuvé pour ce patient
    const appt = await prisma.appointment.findUnique({
      where: { id: body.appointmentId, doctorId: session.user.id, adminApprovedAt: { not: null } },
      select: { id: true },
    })
    if (!appt) return NextResponse.json({ error: "Accès refusé." }, { status: 403 })

    // Upsert — crée la consultation si elle n'existe pas encore
    const { appointmentId, ...data } = body
    const consultation = await prisma.consultation.upsert({
      where:  { appointmentId },
      create: { appointmentId, ...data },
      update: data,
    })

    return NextResponse.json({ data: consultation })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    logServerError("CONSULTATION_PATCH", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
