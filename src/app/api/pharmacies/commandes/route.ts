import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"
import { triggerPharmacieNotification } from "@/lib/pusher"

const commandeSchema = z.object({
  pharmacieId:      z.string().cuid(),
  typeLivraison:    z.enum(["CLICK_AND_COLLECT", "LIVRAISON_DOMICILE"]),
  lignes: z.array(z.object({
    medicamentId: z.string().cuid(),
    quantite:     z.number().int().positive(),
  })).min(1),
  adresseLivraison: z.string().optional(),
  villeLivraison:   z.string().optional(),
  ordonnanceUrl:    z.string().url().optional(),
  instructions:     z.string().optional(),
}).refine(
  (d) => d.typeLivraison === "CLICK_AND_COLLECT" || !!d.adresseLivraison,
  { message: "Adresse requise pour une livraison à domicile.", path: ["adresseLivraison"] }
)

const FRAIS_LIVRAISON = 1500

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const role = session.user.role
  const where: Record<string, unknown> = {}

  if (role === "PATIENT")        where.patientId    = session.user.id
  else if (role === "PHARMACIE") {
    const pharmacie = await prisma.pharmacieProfile.findUnique({ where: { userId: session.user.id } })
    if (!pharmacie) return NextResponse.json({ data: [] })
    where.pharmacieId = pharmacie.id
  } else if (role === "AGENT_TERRAIN") {
    where.agentId = session.user.id
  } else if (!["SUPER_ADMIN", "CALL_CENTER_AGENT"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const commandes = await prisma.commandePharmacie.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      patient:  { select: { phone: true, patientProfile: { select: { firstName: true, lastName: true } } } },
      pharmacie: { select: { nomPharmacie: true, adresse: true, telephone: true } },
      lignes:   { include: { medicament: { select: { nomMedicament: true, formeGalenique: true } } } },
      payment:  { select: { status: true, amount: true } },
    },
  })

  return NextResponse.json({ success: true, data: commandes })
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Réservé aux patients." }, { status: 403 })
  }

  try {
    const body = commandeSchema.parse(await req.json())

    // Vérifier stocks
    const medicamentIds = body.lignes.map((l) => l.medicamentId)
    const stocks = await prisma.medicamentStock.findMany({
      where: { id: { in: medicamentIds }, pharmacieId: body.pharmacieId, estDisponible: true },
    })

    if (stocks.length !== medicamentIds.length) {
      return NextResponse.json({ error: "Certains médicaments ne sont plus disponibles dans cette pharmacie." }, { status: 409 })
    }

    for (const ligne of body.lignes) {
      const stock = stocks.find((s) => s.id === ligne.medicamentId)!
      if (stock.quantiteStock < ligne.quantite) {
        return NextResponse.json({
          error: `Stock insuffisant pour "${stock.nomMedicament}" (disponible: ${stock.quantiteStock}).`,
        }, { status: 409 })
      }
    }

    // Calcul montants
    let montantTotal = 0
    const lignesData = body.lignes.map((ligne) => {
      const stock = stocks.find((s) => s.id === ligne.medicamentId)!
      const sousTotal = stock.prixUnitaire * ligne.quantite
      montantTotal += sousTotal
      return { medicamentId: ligne.medicamentId, quantite: ligne.quantite, prixUnitaire: stock.prixUnitaire, sousTotal }
    })
    const montantLivraison = body.typeLivraison === "LIVRAISON_DOMICILE" ? FRAIS_LIVRAISON : 0
    montantTotal += montantLivraison

    // Transaction : créer commande + décrémenter stocks + créer Payment
    const commande = await prisma.$transaction(async (tx) => {
      const cmd = await tx.commandePharmacie.create({
        data: {
          patientId:        session.user.id,
          pharmacieId:      body.pharmacieId,
          typeLivraison:    body.typeLivraison,
          adresseLivraison: body.adresseLivraison,
          villeLivraison:   body.villeLivraison,
          instructions:     body.instructions,
          ordonnanceUrl:    body.ordonnanceUrl,
          montantTotal,
          montantLivraison,
          lignes: { create: lignesData },
        },
        include: { lignes: true },
      })

      await tx.payment.create({
        data: {
          userId:               session.user.id,
          commandePharmacieId:  cmd.id,
          amount:               montantTotal,
          currency:             "XAF",
          method:               "PENDING",
          status:               "PENDING",
        },
      })

      for (const ligne of body.lignes) {
        await tx.medicamentStock.update({
          where: { id: ligne.medicamentId },
          data:  { quantiteStock: { decrement: ligne.quantite } },
        })
      }

      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "COMMANDE_PHARMACIE_CREATED",
          targetId:   cmd.id,
          targetType: "CommandePharmacie",
          details:    { montantTotal, pharmacieId: body.pharmacieId },
        },
      })

      return cmd
    })

    await triggerPharmacieNotification(body.pharmacieId, "new-commande", {
      commandeId:   commande.id,
      montantTotal,
      typeLivraison: body.typeLivraison,
    }).catch(() => { })

    const [pharmacie, patient] = await Promise.all([
      prisma.pharmacieProfile.findUnique({ where: { id: body.pharmacieId }, select: { telephone: true, nomPharmacie: true } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true, patientProfile: { select: { firstName: true } } } }),
    ])

    if (pharmacie) {
      await sendSMS(pharmacie.telephone, `Mobile Clinic : Nouvelle commande recue sur votre pharmacie. Connectez-vous pour la confirmer.`).catch(() => { })
    }
    if (patient) {
      const nom = patient.patientProfile?.firstName ?? "Patient"
      await sendSMS(patient.phone, `Mobile Clinic : Commande passee avec succes chez ${pharmacie?.nomPharmacie ?? "la pharmacie"}. En attente de confirmation.`).catch(() => { })
    }

    return NextResponse.json({ success: true, data: { commandeId: commande.id, montantTotal } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[POST commandes]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
