"use client"

import { useState, useEffect } from "react"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { cn }      from "@/lib/utils"
import { HomeVisitStatusBadge } from "@/components/shared/StatusBadge"
import { Home, TestTube2, Check, MapPin, Clock } from "lucide-react"

type Visit = {
  id: string; type: string; address: string; city: string
  scheduledAt: string; status: string; reason: string
  agent: { agentProfile: { firstName: string; lastName: string; zone: string } | null } | null
}

export default function HomeVisitPage() {
  const [type,    setType]    = useState<"CARE" | "SAMPLING">("CARE")
  const [address, setAddress] = useState("")
  const [city,    setCity]    = useState("Brazzaville")
  const [date,    setDate]    = useState("")
  const [reason,  setReason]  = useState("")
  const [notes,   setNotes]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [done,    setDone]    = useState(false)
  const [visits,  setVisits]  = useState<Visit[]>([])

  useEffect(() => {
    fetch("/api/home-visits").then((r) => r.json()).then((j) => setVisits(j.data ?? []))
  }, [done])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim() || !date || !reason.trim()) {
      setError("Adresse, date et motif sont obligatoires.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/home-visits", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:   "self",
          type,
          address:     address.trim(),
          city:        city.trim(),
          scheduledAt: new Date(date).toISOString(),
          reason:      reason.trim(),
          notes:       notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDone(true)
      setAddress(""); setDate(""); setReason(""); setNotes("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur serveur.")
    } finally {
      setLoading(false)
    }
  }

  const activeVisits = visits.filter((v) => !["COMPLETED", "CANCELLED"].includes(v.status))

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Visite à domicile</h1>
        <p className="text-sm text-gray-500">Un agent qualifié se déplace chez vous</p>
      </div>

      {done && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4" /> Demande envoyée ! Notre équipe vous contactera bientôt.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Formulaire */}
      <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-6">
        {/* Type */}
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-gray-700">Type de visite *</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "CARE" as const, icon: Home, label: "Soin à domicile" },
              { value: "SAMPLING" as const, icon: TestTube2, label: "Prélèvement" },
            ].map(({ value, icon: Icon, label }) => (
              <button type="button" key={value} onClick={() => setType(value)}
                className={cn("rounded-xl border-2 p-4 text-sm font-medium transition-all flex items-center gap-2",
                  type === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-200"
                )}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Adresse complète *</label>
            <Input label="" placeholder="Rue, quartier, Brazzaville"
              value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ville *" placeholder="Brazzaville"
              value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="Date et heure souhaitée *" type="datetime-local"
              value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Motif / Symptômes *</label>
            <textarea rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Décrivez vos symptômes ou le soin souhaité..."
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Instructions pour l&apos;agent (optionnel)
            </label>
            <textarea rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Code de la porte, étage, sonnette..."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <Button type="submit" loading={loading} size="lg" className="mt-6 w-full">
          Envoyer la demande
        </Button>
      </form>

      {/* Visites actives */}
      {activeVisits.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Visites en cours</h2>
          <div className="space-y-3">
            {activeVisits.map((v) => (
              <div key={v.id}
                className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {v.type === "CARE" ? <Home className="h-4 w-4 text-green-600" /> : <TestTube2 className="h-4 w-4 text-purple-600" />}
                      <p className="font-medium text-gray-900">
                        {v.type === "CARE" ? "Soin à domicile" : "Prélèvement"}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" /> {v.address}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(v.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {v.agent?.agentProfile && (
                      <p className="mt-1 text-xs text-blue-600">
                        Agent : {v.agent.agentProfile.firstName} {v.agent.agentProfile.lastName}
                        {(v.status === "EN_ROUTE" || v.status === "ARRIVED") && (
                          <span className="ml-1 inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                            {v.status === "EN_ROUTE" ? "En route vers vous" : "Arrivé"}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <HomeVisitStatusBadge status={v.status as Parameters<typeof HomeVisitStatusBadge>[0]["status"]} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
