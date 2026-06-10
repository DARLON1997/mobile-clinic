import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"
import { triggerCallCenterOrdonnance } from "@/lib/pusher"

const submitSchema = z.object({
  ordonnanceUrl:  z.string().url(),
  ordonnanceType: z.enum(["PHOTO", "PDF", "MOBILE_CLINIC"]),
  prescriptionId: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const role = session.user.role
  const allowed = ["SUPER_ADMIN", "CALL_CENTER_AGENT", "PATIENT"]
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const where: Record<string, unknown> = {}
  if (role === "PATIENT")            where.patientId = session.user.id
  // CALL_CENTER_AGENT voit toutes par défaut

  const ordonnances = await prisma.ordonnancePharmacieRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      patient:    { select: { phone: true, patientProfile: { select: { firstName: true, lastName: true } } } },
      callCenter: { select: { email: true } },
    },
  })

  return NextResponse.json({ success: true, data: ordonnances })
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Réservé aux patients." }, { status: 403 })
  }

  try {
    const body = submitSchema.parse(await req.json())

    const ordonnance = await prisma.ordonnancePharmacieRequest.create({
      data: {
        patientId:      session.user.id,
        ordonnanceUrl:  body.ordonnanceUrl,
        ordonnanceType: body.ordonnanceType,
        prescriptionId: body.prescriptionId,
        status:         "UPLOADED",
      },
    })

    await prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "ORDONNANCE_SUBMITTED",
        targetId:   ordonnance.id,
        targetType: "OrdonnancePharmacieRequest",
      },
    })

    await triggerCallCenterOrdonnance({
      ordonnanceId: ordonnance.id,
      patientId:    session.user.id,
      createdAt:    ordonnance.createdAt.toISOString(),
    }).catch(() => { /* non bloquant */ })

    const patient = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, patientProfile: { select: { firstName: true } } },
    })
    if (patient) {
      const nom = patient.patientProfile?.firstName ?? "Patient"
      await sendSMS(patient.phone, `Mobile Clinic : Bonjour ${nom}, votre ordonnance a ete recue. Notre equipe recherche vos medicaments.`).catch(() => { })
    }

    return NextResponse.json({ success: true, data: ordonnance }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[POST /api/pharmacies/ordonnances]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
