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
    { value: "",               label: "Tous",               color: "#2563eb" },
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
      <h1 className="text-2xl font-bold text-gray-900">Annuaire Patients</h1>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total patients",        value: stats.totalPatients,        icon: Users,      color: "#2563eb" },
            { label: "Nouveaux cette semaine", value: stats.nouveauxCetteSemaine, icon: TrendingUp, color: "#22c55e" },
            { label: "Actifs aujourd'hui",    value: stats.actifsAujourdhui,     icon: UserCheck,  color: "#3b82f6" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Icon size={16} style={{ color }} />
                <span className="text-[11px] text-gray-500">{label}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-[11px] text-gray-500">Répartition activité</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
              {repartition.map((r) => (
                <div key={r.label} style={{ width: `${(r.value / totalRep) * 100}%`, background: r.color }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {repartition.map((r) => (
                <span key={r.label} className="flex items-center gap-1 text-[10px] text-gray-500">
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Nom, téléphone, email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1) }}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: statusFilter === value ? color : "#e5e7eb",
                background:  statusFilter === value ? `${color}18` : "#ffffff",
                color:       statusFilter === value ? color : "#6b7280",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="h-4 w-36 skeleton-light" />
                <div className="h-4 w-20 skeleton-light" />
              </div>
              <div className="mb-1.5 h-3 w-48 skeleton-light" />
              <div className="h-3 w-32 skeleton-light" />
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">Aucun patient trouvé.</div>
      ) : (
        <>
          {/* Desktop : tableau — inchangé */}
          <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {["Patient","Téléphone","Dernière connexion","Statut","Dernière activité","Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/call-center/patients/${p.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.prenom} {p.nom}</p>
                      <p className="text-[11px] text-gray-400">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600">{daysSince(p.lastConnectionAt)}</p>
                      {p.lastConnectionAt && (
                        <p className="text-[11px] text-gray-400">
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
                    <td className="px-4 py-3 text-gray-500 text-[12px]">
                      {p.derniereActivite
                        ? `${p.derniereActivite.type} · ${new Date(p.derniereActivite.date).toLocaleDateString("fr-FR")}`
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${p.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors w-fit"
                      >
                        <Phone size={12} /> Appeler
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile : liste de cartes empilées (audit C4) */}
          <div className="flex flex-col gap-3 md:hidden">
            {patients.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/call-center/patients/${p.id}`)}
                className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition-colors active:bg-gray-50"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{p.prenom} {p.nom}</p>
                    <p className="text-[11px] text-gray-400">{p.email}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: `${STATUS_COLOR[p.activityStatus]}1A`, color: STATUS_COLOR[p.activityStatus] }}
                  >
                    {STATUS_LABEL[p.activityStatus]}
                  </span>
                </div>
                <div className="space-y-1 text-[12px] text-gray-600">
                  <p>{p.phone}</p>
                  <p>
                    Dernière connexion : {daysSince(p.lastConnectionAt)}
                    {p.lastConnectionAt && ` (${new Date(p.lastConnectionAt).toLocaleDateString("fr-FR")})`}
                  </p>
                  <p className="text-gray-500">
                    {p.derniereActivite
                      ? `${p.derniereActivite.type} · ${new Date(p.derniereActivite.date).toLocaleDateString("fr-FR")}`
                      : <span className="text-gray-300">Aucune activité récente</span>}
                  </p>
                </div>
                <a
                  href={`tel:${p.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors"
                >
                  <Phone size={12} /> Appeler
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{pagination.total} patients — page {pagination.page}/{pagination.pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:border-blue-600 hover:text-blue-600 transition-colors">
              <ChevronLeft size={14} /> Précédent
            </button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs disabled:opacity-40 hover:border-blue-600 hover:text-blue-600 transition-colors">
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
