import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { PaymentStatusBadge } from "@/components/shared/StatusBadge"
import { formatXAF, formatDate } from "@/lib/utils"
import { TrendingUp, CreditCard, RotateCcw } from "lucide-react"

export default async function FinancesPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [sumPaid, countPaid, countRefunded, payments] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "PAID", createdAt: { gte: firstOfMonth } },
      _sum:  { amount: true },
    }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.payment.count({ where: { status: "REFUNDED" } }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user:        { select: { email: true, patientProfile: { select: { firstName: true, lastName: true } } } },
        appointment: { select: {
          doctor: { select: { doctorProfile: { select: { firstName: true, lastName: true } } } }
        } },
      },
    }),
  ])

  const paymentEnabled = process.env.NEXT_PUBLIC_PAYMENT_ENABLED === "true"

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
        <p className="text-sm text-gray-500">Suivi des paiements et remboursements</p>
      </div>

      {!paymentEnabled && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ <strong>Module paiement désactivé</strong> — Lancement gratuit en cours. Les RDV sont confirmés sans paiement. Réactivation prévue en V2.
        </div>
      )}

      {/* KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: TrendingUp, label: "Revenus ce mois", color: "text-green-600", bg: "bg-green-50",
            value: formatXAF(sumPaid._sum.amount ?? 0),
          },
          {
            icon: CreditCard, label: "Paiements réussis", color: "text-blue-600", bg: "bg-blue-50",
            value: countPaid,
          },
          {
            icon: RotateCcw, label: "Remboursements", color: "text-amber-600", bg: "bg-amber-50",
            value: countRefunded,
          },
        ].map(({ icon: Icon, label, color, bg, value }) => (
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

      {/* Tableau des paiements */}
      {payments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-400">
          Aucun paiement enregistré.
        </div>
      ) : (
        <>
          {/* Desktop : tableau — inchangé */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Médecin</th>
                  <th className="px-4 py-3 text-left">Montant</th>
                  <th className="px-4 py-3 text-left">Méthode</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const patientName = p.user.patientProfile
                    ? `${p.user.patientProfile.firstName} ${p.user.patientProfile.lastName}`
                    : p.user.email
                  const dp = p.appointment?.doctor?.doctorProfile
                  const doctorName = dp ? `Dr ${dp.firstName} ${dp.lastName}` : "—"
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-700">{patientName}</td>
                      <td className="px-4 py-3 text-gray-600">{doctorName}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatXAF(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.method === "MTN_MONEY"   && "MTN Mobile Money"}
                        {p.method === "AIRTEL_MONEY" && "Airtel Money"}
                        {p.method === "CARD"         && "Carte bancaire"}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile : liste de cartes empilées (audit C4) */}
          <div className="flex flex-col gap-3 md:hidden">
            {payments.map((p) => {
              const patientName = p.user.patientProfile
                ? `${p.user.patientProfile.firstName} ${p.user.patientProfile.lastName}`
                : p.user.email
              const dp = p.appointment?.doctor?.doctorProfile
              const doctorName = dp ? `Dr ${dp.firstName} ${dp.lastName}` : "—"
              return (
                <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-gray-700">{patientName}</p>
                      <p className="text-xs text-gray-500">{doctorName}</p>
                    </div>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{formatXAF(p.amount)}</span>
                    <span className="text-xs text-gray-500">
                      {p.method === "MTN_MONEY"   && "MTN Mobile Money"}
                      {p.method === "AIRTEL_MONEY" && "Airtel Money"}
                      {p.method === "CARD"         && "Carte bancaire"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
