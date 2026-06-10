import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"
import { triggerPatientNotification } from "@/lib/pusher"

interface Params { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status:           z.enum(["PROCESSING", "FOUND", "PARTIALLY_FOUND", "NOT_FOUND"]),
  notesCallCenter:  z.string().optional(),
  medicamentsTrouves: z.array(z.object({
    medicamentId: z.string(),
    pharmacieId:  z.string(),
    quantite:     z.number().positive(),
    prix:         z.number().positive(),
    disponible:   z.boolean(),
  })).optional(),
})

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const allowed = ["SUPER_ADMIN", "CALL_CENTER_AGENT"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const { id } = await params

  const ordonnance = await prisma.ordonnancePharmacieRequest.findUnique({
    where: { id },
    include: { patient: { select: { phone: true, patientProfile: { select: { firstName: true } } } } },
  })
  if (!ordonnance) return NextResponse.json({ error: "Ordonnance introuvable." }, { status: 404 })

  try {
    const body = updateSchema.parse(await req.json())

    const updated = await prisma.ordonnancePharmacieRequest.update({
      where: { id },
      data: {
        status:             body.status,
        notesCallCenter:    body.notesCallCenter,
        medicamentsTrouves: body.medicamentsTrouves ?? undefined,
        callCenterId:       session.user.id,
      },
    })

    await triggerPatientNotification(ordonnance.patientId, "ordonnance-processed", {
      ordonnanceId: id,
      status:       body.status,
    }).catch(() => { })

    const nom = ordonnance.patient.patientProfile?.firstName ?? "Patient"
    const statusMsg: Record<string, string> = {
      FOUND:          "Vos medicaments ont ete trouves. Connectez-vous pour commander.",
      PARTIALLY_FOUND: "Certains medicaments ont ete trouves. Connectez-vous pour voir.",
      NOT_FOUND:      "Desole, vos medicaments ne sont pas disponibles actuellement.",
    }
    const msg = statusMsg[body.status]
    if (msg) {
      await sendSMS(ordonnance.patient.phone, `Mobile Clinic : Bonjour ${nom}. ${msg}`).catch(() => { })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[PUT ordonnances/[id]]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
