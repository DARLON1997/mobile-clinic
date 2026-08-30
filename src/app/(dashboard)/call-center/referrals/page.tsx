"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Gift, Users, ChevronLeft, ChevronRight, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

type PatientRow = {
  id: string; nom: string; prenom: string; telephone: string
  referralCode: string; totalPoints: number; nombreFilleulsDirects: number
}

type Stats = {
  totalPointsDistribuesTousPatients: number
  nombrePatientsAvecAuMoinsUnFilleul: number
}

type ApiResponse = {
  statistiquesGlobales: Stats
  patients: PatientRow[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export default function CCReferralsPage() {
  const [search, setSearch] = useState("")
  const [page,   setPage]   = useState(1)
  const [input,  setInput]  = useState("")

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["cc-referrals", search, page],
    queryFn:  () =>
      fetch(`/api/call-center/referrals?search=${encodeURIComponent(search)}&page=${page}&limit=20`)
        .then(r => r.json()),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(input)
    setPage(1)
  }

  const stats    = data?.statistiquesGlobales
  const patients = data?.patients ?? []
  const pag      = data?.pagination

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parrainage — Patients</h1>
        <p className="text-sm text-gray-500 mt-1">Points de parrainage des patients (vue allégée)</p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <Gift className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total points distribués</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {isLoading ? "—" : (stats?.totalPointsDistribuesTousPatients ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Patients avec filleuls</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {isLoading ? "—" : stats?.nombrePatientsAvecAuMoinsUnFilleul ?? 0}
          </p>
        </div>
      </div>

      {/* Recherche */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Rechercher par nom, téléphone, code…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <button type="submit"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Rechercher
        </button>
      </form>

      {/* Tableau */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="h-4 w-36 skeleton-light" />
                <div className="h-4 w-20 skeleton-light" />
              </div>
              <div className="mb-1.5 h-3 w-48 skeleton-light" />
              <div className="h-3 w-24 skeleton-light" />
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Gift className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-400">Aucun patient trouvé.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* Desktop : tableau — inchangé */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Nom complet", "Téléphone", "Code parrainage", "Points totaux", "Filleuls directs", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {p.prenom} {p.nom}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{p.telephone}</td>
                    <td className="px-5 py-3.5">
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-blue-600">
                        {p.referralCode}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "font-bold",
                        p.totalPoints > 0 ? "text-blue-600" : "text-gray-300"
                      )}>
                        {p.totalPoints.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        p.nombreFilleulsDirects > 0
                          ? "bg-blue-50 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                      )}>
                        <Users className="h-3 w-3" />
                        {p.nombreFilleulsDirects}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.telephone && p.telephone !== "—" && (
                        <a
                          href={`tel:${p.telephone}`}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors w-fit"
                        >
                          <Phone className="h-3.5 w-3.5" /> Appeler
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile : liste de cartes empilées (audit C4) */}
          <div className="flex flex-col gap-3 p-3 md:hidden">
            {patients.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900">{p.prenom} {p.nom}</p>
                  <code className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-blue-600">
                    {p.referralCode}
                  </code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={cn("font-bold", p.totalPoints > 0 ? "text-blue-600" : "text-gray-300")}>
                    {p.totalPoints.toFixed(2)} pts
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    p.nombreFilleulsDirects > 0 ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                  )}>
                    <Users className="h-3 w-3" />
                    {p.nombreFilleulsDirects} filleul{p.nombreFilleulsDirects > 1 ? "s" : ""}
                  </span>
                </div>
                {p.telephone && p.telephone !== "—" && (
                  <a
                    href={`tel:${p.telephone}`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" /> {p.telephone} · Appeler
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pag && pag.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
              <p className="text-xs text-gray-500">
                {pag.total} patient{pag.total > 1 ? "s" : ""} · page {pag.page}/{pag.pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 disabled:opacity-30 hover:border-blue-600 hover:text-blue-600 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Précédent
                </button>
                <button
                  disabled={page >= pag.pages}
                  onClick={() => setPage(p => Math.min(pag.pages, p + 1))}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 disabled:opacity-30 hover:border-blue-600 hover:text-blue-600 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                >
                  Suivant <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
