import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user.role !== "PHARMACIE") {
    return NextResponse.json({ error: "Réservé aux pharmacies." }, { status: 403 })
  }

  const pharmacie = await prisma.pharmacieProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!pharmacie) return NextResponse.json({ error: "Profil pharmacie introuvable." }, { status: 404 })

  const today      = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow   = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [commandesAujourdhui, commandesEnAttente, medicamentsAlerte, revenusMois, topMedicaments, parStatut] =
    await Promise.all([
      prisma.commandePharmacie.count({
        where: { pharmacieId: pharmacie.id, createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.commandePharmacie.count({
        where: { pharmacieId: pharmacie.id, status: "PENDING" },
      }),
      prisma.medicamentStock.count({
        where: {
          pharmacieId: pharmacie.id,
          estDisponible: true,
          quantiteStock: { lte: prisma.medicamentStock.fields.stockMinimum },
        },
      }).catch(() =>
        // Fallback si la comparaison de champs n'est pas supportée
        prisma.medicamentStock.findMany({
          where: { pharmacieId: pharmacie.id, estDisponible: true },
          select: { quantiteStock: true, stockMinimum: true },
        }).then((meds) => meds.filter((m) => m.quantiteStock <= m.stockMinimum).length)
      ),
      prisma.commandePharmacie.aggregate({
        where: {
          pharmacieId: pharmacie.id,
          status:      "DELIVERED",
          deliveredAt: { gte: firstMonth },
        },
        _sum: { montantTotal: true },
      }),
      prisma.ligneCommandePharmacie.groupBy({
        by: ["medicamentId"],
        where: { commande: { pharmacieId: pharmacie.id, status: "DELIVERED" } },
        _sum: { quantite: true, sousTotal: true },
        orderBy: { _sum: { quantite: "desc" } },
        take: 5,
      }).then(async (rows) => {
        const meds = await prisma.medicamentStock.findMany({
          where: { id: { in: rows.map((r) => r.medicamentId) } },
          select: { id: true, nomMedicament: true },
        })
        return rows.map((r) => ({
          medicament:    meds.find((m) => m.id === r.medicamentId)?.nomMedicament ?? "—",
          quantiteVendue: r._sum.quantite ?? 0,
          revenus:        r._sum.sousTotal ?? 0,
        }))
      }),
      prisma.commandePharmacie.groupBy({
        by: ["status"],
        where: { pharmacieId: pharmacie.id },
        _count: true,
      }),
    ])

  return NextResponse.json({
    success: true,
    data: {
      commandesAujourdhui,
      commandesEnAttente,
      stockAlerte:        medicamentsAlerte,
      revenusMois:        revenusMois._sum.montantTotal ?? 0,
      medicamentsLesPlus: topMedicaments,
      commandesParStatut: parStatut.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = r._count
        return acc
      }, {}),
    },
  })
}
