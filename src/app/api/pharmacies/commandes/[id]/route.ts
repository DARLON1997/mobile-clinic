import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS, smsTemplates } from "@/lib/africas-talking"
import { triggerPatientNotification } from "@/lib/pusher"

interface Params { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status:     z.enum(["CONFIRMED", "PREPARING", "READY_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
  agentId:    z.string().cuid().optional(),
  agentNotes: z.string().optional(),
  cancelReason: z.string().optional(),
})

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params
  const commande = await prisma.commandePharmacie.findUnique({
    where: { id },
    include: {
      patient:  { select: { phone: true, patientProfile: { select: { firstName: true, lastName: true } } } },
      pharmacie: { select: { nomPharmacie: true, adresse: true, telephone: true } },
      agent:    { select: { agentProfile: { select: { firstName: true, lastName: true } } } },
      lignes:   { include: { medicament: true } },
      payment:  true,
    },
  })

  if (!commande) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 })

  const role = session.user.role
  const pharmacie = await prisma.pharmacieProfile.findFirst({ where: { userId: session.user.id } })
  const isPatient   = role === "PATIENT"   && commande.patientId === session.user.id
  const isPharmacie = role === "PHARMACIE" && commande.pharmacieId === pharmacie?.id
  const isAgent     = role === "AGENT_TERRAIN" && commande.agentId === session.user.id
  const isAdmin     = ["SUPER_ADMIN", "CALL_CENTER_AGENT"].includes(role)

  if (!isPatient && !isPharmacie && !isAgent && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  return NextResponse.json({ success: true, data: commande })
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params
  const commande = await prisma.commandePharmacie.findUnique({
    where: { id },
    include: {
      patient:  { select: { phone: true, patientProfile: { select: { firstName: true } } } },
      pharmacie: { select: { nomPharmacie: true, adresse: true, userId: true } },
    },
  })
  if (!commande) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 })

  const role = session.user.role
  const pharmProfile = role === "PHARMACIE"
    ? await prisma.pharmacieProfile.findUnique({ where: { userId: session.user.id } })
    : null

  const isPharmacie = role === "PHARMACIE" && commande.pharmacie.userId === session.user.id
  const isAgent     = role === "AGENT_TERRAIN" && commande.agentId === session.user.id
  const isAdmin     = role === "SUPER_ADMIN"

  if (!isPharmacie && !isAgent && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = updateSchema.parse(await req.json())
    const nom  = commande.patient.patientProfile?.firstName ?? "Patient"

    const updateData: Record<string, unknown> = { status: body.status }
    if (body.status === "CONFIRMED")        updateData.confirmedAt  = new Date()
    if (body.status === "PREPARING")        updateData.preparedAt   = new Date()
    if (body.status === "DELIVERED")        updateData.deliveredAt  = new Date()
    if (body.status === "CANCELLED")        updateData.cancelledAt  = new Date()
    if (body.cancelReason)                  updateData.cancelReason = body.cancelReason
    if (body.agentNotes)                    updateData.agentNotes   = body.agentNotes
    if (body.agentId && body.status === "OUT_FOR_DELIVERY") updateData.agentId = body.agentId

    await prisma.commandePharmacie.update({ where: { id }, data: updateData })

    await triggerPatientNotification(commande.patientId, "commande-status", {
      commandeId: id, status: body.status,
    }).catch(() => { })

    const smsMap: Record<string, () => Promise<unknown>> = {
      CONFIRMED:        () => sendSMS(commande.patient.phone, smsTemplates.commandeConfirmee(nom, commande.pharmacie.nomPharmacie)),
      PREPARING:        () => sendSMS(commande.patient.phone, `Mobile Clinic : Vos medicaments chez ${commande.pharmacie.nomPharmacie} sont en preparation.`),
      READY_PICKUP:     () => sendSMS(commande.patient.phone, smsTemplates.commandePrete(nom, commande.pharmacie.nomPharmacie, commande.pharmacie.adresse)),
      OUT_FOR_DELIVERY: () => sendSMS(commande.patient.phone, smsTemplates.commandeLivraison(nom)),
      DELIVERED:        () => sendSMS(commande.patient.phone, smsTemplates.commandeLivree(nom)),
    }

    if (smsMap[body.status]) {
      await smsMap[body.status]().catch(() => { })
    }

    if (body.status === "DELIVERED") {
      await prisma.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "COMMANDE_DELIVERED",
          targetId:   id,
          targetType: "CommandePharmacie",
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[PUT commandes/[id]]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
