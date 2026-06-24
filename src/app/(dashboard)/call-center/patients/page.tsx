"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Search, Users, UserCheck, TrendingUp, ChevronLeft, ChevronRight, Phone } from "lucide-react"
import { STATUS_LABEL, STATUS_COLOR, type PatientActivityStatus } from "@/lib/patient-activity-status"

type Stats = {
  totalPatients:       number
  nouveauxCetteSemaine:number
  actifsAujourdhui:   number
  repartitionStatut:  Record<PatientActivityStatus, number>
}

type Patient = {
  id:              string
  nom:             string
  prenom:          string
  phone:           string
  email:           string
  dateInscription: string
  lastConnectionAt:string | null
  totalConnections:number
  activityStatus:  PatientActivityStatus
  derniereActivite: { type: string; date: string; statut: string } | null
}

type ApiResponse = {
  stats:      Stats
  data:       Patient[]
  pagination: { total: number; page: number; limit: number; pages: number }
}

function daysSince(iso: string | null): string {
  if (!iso) return "Jamais"
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return "Aujourd'hui"
  if (d === 1) return "Hier"
  return `Il y a ${d} j`
}

export default function CallCenterPatientsPage() {
  const router = useRouter()
  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page,         setPage]         = useState(1)

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["cc-patients", page, search, statusFilter],
    queryFn:  async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search)       params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/call-center/patients?${params}`)
      return res.json()
    },
  })

  const stats      = data?.stats ?? null
  const patients   = data?.data  ?? []
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 20, pages: 1 }

  const statusFilters = [
    { value: "",               label: "Tous",               color: "#C8906A" },
    { value: "ACTIF",          label: "Actifs",             color: "#22c55e" },
    { value: "DORMANT",        label: "Dormants",           color: "#f97316" },
    { value: "INACTIF",        label: "Inactifs",           color: "#6b7280" },
    { value: "JAMAIS_CONNECTE",label: "Jamais connectés",  color: "#ef4444" },
  ]

  const repartition = stats ? [
    { label: "Actifs",    value: stats.repartitionStatut.ACTIF,           color: "#22c55e" },
    { label: "Dormants",  value: stats.repartitionStatut.DORMANT,         color: "#f97316" },
    { label: "Inactifs",  value: stats.repartitionStatut.INACTIF,         color: "#6b7280" },
    { label: "Jamais cx", value: stats.repartitionStatut.JAMAIS_CONNECTE, color: "#ef4444" },
  ] : []
  const totalRep = repartition.reduce((a, b) => a + b.value, 0) || 1

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Annuaire Patients</h1>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total patients",        value: stats.totalPatients,        icon: Users,      color: "#C8906A" },
            { label: "Nouveaux cette semaine", value: stats.nouveauxCetteSemaine, icon: TrendingUp, color: "#22c55e" },
            { label: "Actifs aujourd'hui",    value: stats.actifsAujourdhui,     icon: UserCheck,  color: "#3b82f6" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-4">
              <div className="flex items-center gap-2">
                <Icon size={16} style={{ color }} />
                <span className="text-[11px] text-[#888]">{label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-4">
            <p className="mb-2 text-[11px] text-[#888]">Répartition activité</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {repartition.map((r) => (
                <div key={r.label} style={{ width: `${(r.value / totalRep) * 100}%`, background: r.color }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {repartition.map((r) => (
                <span key={r.label} className="flex items-center gap-1 text-[10px] text-[#888]">
                  <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                  {r.label} ({r.value})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Nom, téléphone, email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-xl border border-[#2A2A2A] bg-[#141414] py-2 pl-9 pr-3 text-sm text-white placeholder-[#666] focus:border-[#C8906A] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1) }}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: statusFilter === value ? color : "#2A2A2A",
                background:  statusFilter === value ? `${color}18` : "#141414",
                color:       statusFilter === value ? color : "#888",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F]">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-[#666]">Chargement…</div>
        ) : patients.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#666]">Aucun patient trouvé.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-[10px] font-semibold uppercase tracking-wider text-[#555]">
                {["Patient","Téléphone","Dernière connexion","Statut","Dernière activité","Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/call-center/patients/${p.id}`)}
                  className="cursor-pointer border-b border-[#1A1A1A] transition-colors hover:bg-[#161616] last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.prenom} {p.nom}</p>
                    <p className="text-[11px] text-[#666]">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#AAAAAA]">{p.phone}</td>
                  <td className="px-4 py-3">
                    <p className="text-[#AAAAAA]">{daysSince(p.lastConnectionAt)}</p>
                    {p.lastConnectionAt && (
                      <p className="text-[11px] text-[#555]">
                        {new Date(p.lastConnectionAt).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ background: `${STATUS_COLOR[p.activityStatus]}1A`, color: STATUS_COLOR[p.activityStatus] }}
                    >
                      {STATUS_LABEL[p.activityStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#888] text-[12px]">
                    {p.derniereActivite
                      ? `${p.derniereActivite.type} · ${new Date(p.derniereActivite.date).toLocaleDateString("fr-FR")}`
                      : <span className="text-[#555]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`tel:${p.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-2.5 py-1.5 text-[12px] text-[#C8906A] hover:border-[#C8906A] transition-colors w-fit"
                    >
                      <Phone size={12} /> Appeler
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#666]">
          <span>{pagination.total} patients — page {pagination.page}/{pagination.pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs disabled:opacity-40 hover:border-[#C8906A] hover:text-[#C8906A] transition-colors">
              <ChevronLeft size={14} /> Précédent
            </button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs disabled:opacity-40 hover:border-[#C8906A] hover:text-[#C8906A] transition-colors">
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
