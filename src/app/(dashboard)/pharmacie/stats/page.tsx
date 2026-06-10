import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatXAF } from "@/lib/utils"
import { TrendingUp, Package, ShoppingCart, Star } from "lucide-react"

export default async function PharmacieStatsPage() {
  const session = await auth()
  if (session?.user.role !== "PHARMACIE") redirect("/unauthorized")

  const pharmacie = await prisma.pharmacieProfile.findUnique({ where: { userId: session.user.id } })
  if (!pharmacie) redirect("/unauthorized")

  const firstMonth = new Date(); firstMonth.setDate(1); firstMonth.setHours(0, 0, 0, 0)

  const [topMedicaments, parStatut, revenusMois, nombreClients, notesMoyenne] = await Promise.all([
    prisma.ligneCommandePharmacie.groupBy({
      by: ["medicamentId"],
      where: { commande: { pharmacieId: pharmacie.id, status: "DELIVERED" } },
      _sum: { quantite: true, sousTotal: true },
      orderBy: { _sum: { quantite: "desc" } },
      take: 5,
    }).then(async (rows) => {
      const meds = await prisma.medicamentStock.findMany({
        where: { id: { in: rows.map((r) => r.medicamentId) } },
        select: { id: true, nomMedicament: true, formeGalenique: true },
      })
      return rows.map((r, i) => ({
        rank:           i + 1,
        medicament:    meds.find((m) => m.id === r.medicamentId)?.nomMedicament ?? "—",
        formeGalenique: meds.find((m) => m.id === r.medicamentId)?.formeGalenique ?? "",
        quantiteVendue: r._sum.quantite ?? 0,
        revenus:        r._sum.sousTotal ?? 0,
      }))
    }),
    prisma.commandePharmacie.groupBy({
      by: ["status"],
      where: { pharmacieId: pharmacie.id },
      _count: true,
    }),
    prisma.commandePharmacie.aggregate({
      where: { pharmacieId: pharmacie.id, status: "DELIVERED", deliveredAt: { gte: firstMonth } },
      _sum: { montantTotal: true },
    }),
    prisma.commandePharmacie.groupBy({
      by: ["patientId"],
      where: { pharmacieId: pharmacie.id, status: "DELIVERED" },
    }).then((rows) => rows.length),
    pharmacie.notesMoyenne ?? 0,
  ])

  const statusLabel: Record<string, string> = {
    PENDING: "En attente", CONFIRMED: "Confirmées", PREPARING: "En préparation",
    READY_PICKUP: "Prêtes", OUT_FOR_DELIVERY: "En livraison", DELIVERED: "Livrées", CANCELLED: "Annulées",
  }
  const totalCommandes = parStatut.reduce((s, r) => s + r._count, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Statistiques</h1>

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShoppingCart, label: "Total commandes",   value: totalCommandes,                             color: "text-blue-600",   bg: "bg-blue-50" },
          { icon: TrendingUp,   label: "Revenus ce mois",   value: formatXAF(revenusMois._sum.montantTotal ?? 0), color: "text-green-600", bg: "bg-green-50" },
          { icon: Package,      label: "Clients uniques",   value: nombreClients,                              color: "text-purple-600", bg: "bg-purple-50" },
          { icon: Star,         label: "Note moyenne",      value: notesMoyenne ? `${Number(notesMoyenne).toFixed(1)} / 5` : "—", color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl p-3 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top médicaments */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top 5 médicaments</CardTitle></CardHeader>
          <CardContent>
            {topMedicaments.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune vente enregistrée.</p>
            ) : (
              <div className="space-y-3">
                {topMedicaments.map((m) => (
                  <div key={m.rank} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                      {m.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.medicament}</p>
                      <p className="text-xs text-gray-400">{m.quantiteVendue} unités vendues</p>
                    </div>
                    <span className="text-sm font-semibold text-green-700 shrink-0">{formatXAF(m.revenus)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commandes par statut */}
        <Card>
          <CardHeader><CardTitle className="text-base">Commandes par statut</CardTitle></CardHeader>
          <CardContent>
            {parStatut.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune commande.</p>
            ) : (
              <div className="space-y-2">
                {parStatut.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{statusLabel[s.status] ?? s.status}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 rounded-full bg-gray-100 h-2">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(s._count / totalCommandes) * 100}%` }} />
                      </div>
                      <span className="font-medium text-gray-900 w-6 text-right">{s._count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
