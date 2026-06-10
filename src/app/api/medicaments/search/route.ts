import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q         = searchParams.get("q")?.trim()
  const ville     = searchParams.get("ville") ?? "Brazzaville"
  const categorie = searchParams.get("categorie")

  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Requête trop courte (min 2 caractères)." }, { status: 400 })
  }

  const where: Record<string, unknown> = {
    estDisponible: true,
    quantiteStock: { gt: 0 },
    pharmacie: { isActive: true, isVerified: true, ville },
    OR: [
      { nomMedicament: { contains: q, mode: "insensitive" } },
      { nomGenerique:  { contains: q, mode: "insensitive" } },
      { marque:        { contains: q, mode: "insensitive" } },
    ],
  }
  if (categorie) where.categorie = categorie

  const resultats = await prisma.medicamentStock.findMany({
    where,
    orderBy: [{ quantiteStock: "desc" }, { prixUnitaire: "asc" }],
    include: {
      pharmacie: {
        select: {
          id: true, nomPharmacie: true, adresse: true, quartier: true,
          telephone: true, horaires: true, latitude: true, longitude: true,
        },
      },
    },
  })

  // Grouper par médicament (nom + forme)
  const grouped = new Map<string, {
    medicament: { nom: string; generique: string | null; categorie: string; formeGalenique: string }
    disponiblesDans: Array<{
      pharmacie: { id: string; nom: string; adresse: string; quartier: string; telephone: string; horaires: unknown; isOpen: boolean }
      prix: number
      quantite: number
      medicamentId: string
      ordonnanceRequise: boolean
    }>
  }>()

  const now = new Date()
  const joursSemaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  const jourActuel   = joursSemaine[now.getDay()]
  const heureActuelle = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

  for (const med of resultats) {
    const key = `${med.nomMedicament.toLowerCase()}|${med.formeGalenique.toLowerCase()}`

    const horaires = med.pharmacie.horaires as Record<string, { open: string; close: string; closed?: boolean }>
    const jourHoraire = horaires?.[jourActuel]
    const isOpen = !!(jourHoraire && !jourHoraire.closed && heureActuelle >= jourHoraire.open && heureActuelle <= jourHoraire.close)

    const pharmacieEntry = {
      pharmacie: {
        id:        med.pharmacie.id,
        nom:       med.pharmacie.nomPharmacie,
        adresse:   med.pharmacie.adresse,
        quartier:  med.pharmacie.quartier,
        telephone: med.pharmacie.telephone,
        horaires:  med.pharmacie.horaires,
        isOpen,
      },
      prix:             med.prixUnitaire,
      quantite:         med.quantiteStock,
      medicamentId:     med.id,
      ordonnanceRequise: med.ordonnanceRequise,
    }

    if (grouped.has(key)) {
      grouped.get(key)!.disponiblesDans.push(pharmacieEntry)
    } else {
      grouped.set(key, {
        medicament: {
          nom:           med.nomMedicament,
          generique:     med.nomGenerique,
          categorie:     med.categorie,
          formeGalenique: med.formeGalenique,
        },
        disponiblesDans: [pharmacieEntry],
      })
    }
  }

  const data = Array.from(grouped.values()).map((g) => ({
    ...g,
    disponiblesDans: g.disponiblesDans.sort((a, b) => {
      if (a.pharmacie.isOpen !== b.pharmacie.isOpen) return a.pharmacie.isOpen ? -1 : 1
      return a.prix - b.prix
    }),
    totalPharmacies: g.disponiblesDans.length,
  }))

  return NextResponse.json({ success: true, data, total: data.length })
}
