"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HomeVisitStatusBadge } from "@/components/shared/StatusBadge"
import { Bell, User, MapPin, Clock, Navigation, CheckCircle, Package } from "lucide-react"

type Mission = {
  id: string; type: string; status: string; address: string; city: string
  scheduledAt: string; reason: string; notes: string | null
  patient: { patientProfile: { firstName: string; lastName: string } | null }
}

export default function AgentPage() {
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [userName, setUserName] = useState("Agent")

  async function load() {
    const [mvRes, sessRes] = await Promise.all([
      fetch("/api/home-visits"),
      fetch("/api/auth/session"),
    ])
    const mvJson   = await mvRes.json()
    const sessJson = await sessRes.json()
    setMissions(mvJson.data ?? [])
    setUserName(sessJson?.user?.name ?? "Agent")
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function patchStatus(id: string, status: string) {
    setUpdating(id)
    await fetch("/api/home-visits", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeVisitId: id, status }),
    })
    await load()
    setUpdating(null)

    if (status === "EN_ROUTE") {
      const mission = missions.find((m) => m.id === id)
      if (mission) {
        const q = encodeURIComponent(`${mission.address}, ${mission.city}, Congo`)
        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank")
      }
    }
  }

  const today   = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const todayMissions = missions.filter((m) => {
    const d = new Date(m.scheduledAt)
    return d >= today && d < tomorrow
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs text-gray-400">Bonjour,</p>
          <p className="text-sm font-semibold text-gray-900">{userName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-blue-600">
            {todayMissions.length} mission{todayMissions.length > 1 ? "s" : ""} aujourd&apos;hui
          </span>
          <Link href="/agent" className="relative rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : missions.length === 0 ? (
          <div className="mt-12 text-center">
            <Package className="mx-auto mb-2 h-10 w-10 text-gray-300" />
            <p className="text-gray-400 text-sm">Aucune mission assignée.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {missions.map((m) => {
              const patientName = m.patient.patientProfile
                ? `${m.patient.patientProfile.firstName} ${m.patient.patientProfile.lastName}`
                : "Patient"
              const hour = new Date(m.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              const dateStr = new Date(m.scheduledAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })

              return (
                <div key={m.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {/* En-tête card */}
                  <div className={`flex items-center justify-between px-4 py-2 light-surface ${
                    m.type === "CARE" ? "bg-blue-50" : "bg-purple-50"
                  }`}>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      m.type === "CARE" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}>
                      {m.type === "CARE" ? "SOIN" : "PRÉLÈVEMENT"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{dateStr} à {hour}</span>
                      <HomeVisitStatusBadge status={m.status as Parameters<typeof HomeVisitStatusBadge>[0]["status"]} />
                    </div>
                  </div>

                  {/* Corps */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-900">{patientName}</span>
                    </div>
                    <div className="mt-1 flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-gray-600">{m.address}, {m.city}</span>
                    </div>
                    {m.reason && (
                      <p className="mt-1 text-xs text-gray-400 truncate">{m.reason}</p>
                    )}
                    {m.notes && (
                      <p className="mt-0.5 text-xs text-orange-600">📝 {m.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {m.status === "ASSIGNED" && (
                      <button
                        onClick={() => patchStatus(m.id, "EN_ROUTE")}
                        disabled={updating === m.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 min-h-[48px]"
                      >
                        <Navigation className="h-4 w-4" />
                        {updating === m.id ? "..." : "🚗 Je suis en route"}
                      </button>
                    )}
                    {m.status === "EN_ROUTE" && (
                      <button
                        onClick={() => patchStatus(m.id, "ARRIVED")}
                        disabled={updating === m.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 min-h-[48px]"
                      >
                        <MapPin className="h-4 w-4" />
                        {updating === m.id ? "..." : "📍 Je suis arrivé"}
                      </button>
                    )}
                    {m.status === "ARRIVED" && (
                      <Link href={`/agent/mission/${m.id}`}>
                        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 min-h-[48px]">
                          <CheckCircle className="h-4 w-4" />
                          ✅ Mission terminée — Rédiger rapport
                        </button>
                      </Link>
                    )}
                    {(m.status === "COMPLETED" || m.status === "CANCELLED") && (
                      <div className="text-center text-xs text-gray-400">Mission clôturée</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white">
        {[
          { icon: Clock, label: "Missions", href: "/agent", active: true },
          { icon: User,  label: "Profil",   href: "/agent/profile", active: false },
        ].map(({ icon: Icon, label, href, active }) => (
          <Link key={href} href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
              active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            }`}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
