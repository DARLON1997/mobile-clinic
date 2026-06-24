"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Search, Gift, Users, ChevronLeft, ChevronRight, Phone } from "lucide-react"
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
        <h1 className="text-2xl font-bold text-white">Parrainage — Patients</h1>
        <p className="text-sm text-[#666] mt-1">Points de parrainage des patients (vue allégée)</p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(200,144,106,0.1)]">
              <Gift className="h-5 w-5 text-[#C8906A]" />
            </div>
            <span className="text-sm text-[#888]">Total points distribués</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {isLoading ? "—" : (stats?.totalPointsDistribuesTousPatients ?? 0).toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(59,130,246,0.1)]">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-sm text-[#888]">Patients avec filleuls</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {isLoading ? "—" : stats?.nombrePatientsAvecAuMoinsUnFilleul ?? 0}
          </p>
        </div>
      </div>

      {/* Recherche */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#444]" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Rechercher par nom, téléphone, code…"
            className="w-full rounded-xl border border-[#2A2A2A] bg-[#141414] py-2.5 pl-9 pr-4 text-sm text-white placeholder-[#444] focus:border-[#C8906A] focus:outline-none"
          />
        </div>
        <button type="submit"
          className="rounded-xl bg-[#C8906A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b07a5a]">
          Rechercher
        </button>
      </form>

      {/* Tableau */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#C8906A]" /></div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2A2A2A] py-16 text-center">
          <Gift className="mx-auto mb-3 h-10 w-10 text-[#333]" />
          <p className="text-[#555]">Aucun patient trouvé.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  {["Nom complet", "Téléphone", "Code parrainage", "Points totaux", "Filleuls directs", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#555]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-[#141414] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white">
                      {p.prenom} {p.nom}
                    </td>
                    <td className="px-5 py-3.5 text-[#888]">{p.telephone}</td>
                    <td className="px-5 py-3.5">
                      <code className="rounded bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#C8906A]">
                        {p.referralCode}
                      </code>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "font-bold",
                        p.totalPoints > 0 ? "text-[#C8906A]" : "text-[#555]"
                      )}>
                        {p.totalPoints.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        p.nombreFilleulsDirects > 0
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-[#1A1A1A] text-[#555]"
                      )}>
                        <Users className="h-3 w-3" />
                        {p.nombreFilleulsDirects}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.telephone && p.telephone !== "—" && (
                        <a
                          href={`tel:${p.telephone}`}
                          className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-medium text-[#888] hover:border-green-500 hover:text-green-400 transition-colors w-fit"
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

          {/* Pagination */}
          {pag && pag.pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#1A1A1A] px-5 py-3">
              <p className="text-xs text-[#555]">
                {pag.total} patient{pag.total > 1 ? "s" : ""} · page {pag.page}/{pag.pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#666] disabled:opacity-30 hover:border-[#C8906A] hover:text-[#C8906A] disabled:hover:border-[#2A2A2A] disabled:hover:text-[#666]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Précédent
                </button>
                <button
                  disabled={page >= pag.pages}
                  onClick={() => setPage(p => Math.min(pag.pages, p + 1))}
                  className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#666] disabled:opacity-30 hover:border-[#C8906A] hover:text-[#C8906A] disabled:hover:border-[#2A2A2A] disabled:hover:text-[#666]"
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
