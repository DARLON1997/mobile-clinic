import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatXAF } from "@/lib/utils"
import { ShoppingCart, Package, AlertTriangle, TrendingUp, Clock, CheckCircle } from "lucide-react"

export default async function PharmacieDashboard() {
  const session = await auth()
  if (session?.user.role !== "PHARMACIE") redirect("/unauthorized")

  const pharmacie = await prisma.pharmacieProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!pharmacie) redirect("/unauthorized")

  const today      = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow   = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [commandesAujourd, commandesEnAttente, revenusMois, commandesRecentes, stockAlertes] =
    await Promise.all([
      prisma.commandePharmacie.count({ where: { pharmacieId: pharmacie.id, createdAt: { gte: today, lt: tomorrow } } }),
      prisma.commandePharmacie.count({ where: { pharmacieId: pharmacie.id, status: "PENDING" } }),
      prisma.commandePharmacie.aggregate({
        where: { pharmacieId: pharmacie.id, status: "DELIVERED", deliveredAt: { gte: firstMonth } },
        _sum: { montantTotal: true },
      }),
      prisma.commandePharmacie.findMany({
        where:   { pharmacieId: pharmacie.id },
        orderBy: { createdAt: "desc" },
        take:    5,
        include: {
          patient: { select: { patientProfile: { select: { firstName: true, lastName: true } } } },
          lignes:  { take: 1, include: { medicament: { select: { nomMedicament: true } } } },
        },
      }),
      prisma.medicamentStock.findMany({
        where:   { pharmacieId: pharmacie.id, estDisponible: true },
        orderBy: { quantiteStock: "asc" },
      }).then((meds) => meds.filter((m) => m.quantiteStock <= m.stockMinimum)),
    ])

  const STATUS_COLOR: Record<string, string> = {
    PENDING:          "bg-orange-100 text-orange-700",
    CONFIRMED:        "bg-blue-100 text-blue-700",
    PREPARING:        "bg-[rgba(200,144,106,0.15)] text-[#C8906A]",
    READY_PICKUP:     "bg-green-100 text-green-700",
    OUT_FOR_DELIVERY: "bg-purple-100 text-purple-700",
    DELIVERED:        "bg-green-100 text-green-700",
    CANCELLED:        "bg-red-100 text-red-700",
  }
  const STATUS_LABEL: Record<string, string> = {
    PENDING: "En attente", CONFIRMED: "Confirmée", PREPARING: "En préparation",
    READY_PICKUP: "Prête", OUT_FOR_DELIVERY: "En livraison", DELIVERED: "Livrée", CANCELLED: "Annulée",
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">{pharmacie.nomPharmacie} — {pharmacie.quartier}</p>
      </div>

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShoppingCart,  label: "Commandes aujourd'hui", value: commandesAujourd,   color: "text-blue-600",   bg: "bg-blue-50" },
          { icon: Clock,         label: "En attente",            value: commandesEnAttente,  color: "text-orange-600", bg: "bg-orange-50", alert: commandesEnAttente > 0 },
          { icon: AlertTriangle, label: "Alertes stock",         value: stockAlertes.length, color: "text-red-600",    bg: "bg-red-50",    alert: stockAlertes.length > 0 },
          { icon: TrendingUp,    label: "Revenus ce mois",       value: formatXAF(revenusMois._sum.montantTotal ?? 0), color: "text-green-600", bg: "bg-green-50" },
        ].map(({ icon: Icon, label, value, color, bg, alert }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl p-3 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertes stock */}
        {stockAlertes.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                Alertes stock
                <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-semibold text-orange-800">{stockAlertes.length}</span>
              </CardTitle>
              <Link href="/pharmacie/catalogue">
                <Button variant="ghost" size="sm" className="text-orange-600">Gérer</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stockAlertes.slice(0, 5).map((med) => (
                  <div key={med.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm border border-orange-200">
                    <div>
                      <p className="font-medium text-gray-900">{med.nomMedicament}</p>
                      <p className="text-xs text-gray-500">{med.formeGalenique}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      med.quantiteStock === 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {med.quantiteStock === 0 ? "Rupture" : `${med.quantiteStock} unités`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commandes récentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-[#C8906A]" />
              Commandes récentes
            </CardTitle>
            <Link href="/pharmacie/commandes">
              <Button variant="ghost" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {commandesRecentes.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune commande pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {commandesRecentes.map((cmd) => {
                  const client = cmd.patient.patientProfile
                    ? `${cmd.patient.patientProfile.firstName} ${cmd.patient.patientProfile.lastName}`
                    : "Patient"
                  const med = cmd.lignes[0]?.medicament.nomMedicament ?? "—"
                  return (
                    <div key={cmd.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{client}</p>
                        <p className="text-xs text-gray-500 truncate">{med}{cmd.lignes.length > 1 ? ` +${cmd.lignes.length - 1}` : ""}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[cmd.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[cmd.status] ?? cmd.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!pharmacie.isVerified && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <div>
              <p className="font-medium text-orange-800">Vérification en attente</p>
              <p className="mt-1 text-sm text-orange-700">
                Votre pharmacie est en cours de vérification par l'équipe Mobile Clinic.
                Vous serez notifié par SMS une fois validé.
              </p>
            </div>
          </div>
        </div>
      )}

      {pharmacie.isVerified && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>Votre pharmacie est vérifiée et visible sur Mobile Clinic.</span>
          </div>
        </div>
      )}
    </div>
  )
}
