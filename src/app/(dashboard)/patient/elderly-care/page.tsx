"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Users, MapPin, Clock, Check, ChevronRight, X } from "lucide-react"

const CARE_OPTIONS = [
  { value: "SUIVI_MEDICAL",        label: "Suivi médical",              emoji: "👁️" },
  { value: "AIDE_MOBILITE",        label: "Aide à la mobilité",         emoji: "🚶" },
  { value: "GESTION_MEDICAMENTS",  label: "Gestion médicaments",        emoji: "💊" },
  { value: "SOINS_HYGIENE",        label: "Aide à l'hygiène",           emoji: "🛁" },
  { value: "COMPAGNIE_MEDICALISEE",label: "Compagnie médicalisée",      emoji: "🗣️" },
  { value: "REEDUCATION",          label: "Rééducation légère",         emoji: "🏃" },
  { value: "BILAN_SANTE",          label: "Bilan de santé senior",      emoji: "📋" },
]

const FREQ_OPTIONS = [
  { value: "PONCTUEL",     label: "Ponctuel",     emoji: "📅" },
  { value: "QUOTIDIEN",    label: "Quotidien",    emoji: "📆" },
  { value: "HEBDOMADAIRE", label: "Hebdomadaire", emoji: "📆" },
  { value: "MENSUEL",      label: "Mensuel",      emoji: "🗓️" },
]

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:     { label: "En attente",   color: "bg-yellow-100 text-yellow-800" },
  ASSIGNED:    { label: "Assigné",      color: "bg-blue-100 text-blue-800" },
  ACTIVE:      { label: "Actif",        color: "bg-teal-100 text-teal-800" },
  EN_ROUTE:    { label: "En route",     color: "bg-purple-100 text-purple-800" },
  IN_PROGRESS: { label: "En cours",     color: "bg-orange-100 text-orange-800" },
  COMPLETED:   { label: "Terminé",      color: "bg-green-100 text-green-800" },
  CANCELLED:   { label: "Annulé",       color: "bg-red-100 text-red-700" },
}

type Care = {
  id: string; careTypes: string[]; frequency: string; status: string
  address: string; city: string; scheduledAt: string; duration: number
  agent: { agentProfile: { firstName: string; lastName: string } | null } | null
}

export default function ElderlyCarePage() {
  const [showModal,     setShowModal]     = useState(false)
  const [step,          setStep]          = useState(1)
  const [patientAge,    setPatientAge]    = useState("")
  const [mobilityLevel, setMobilityLevel] = useState("")
  const [medicalNotes,  setMedicalNotes]  = useState("")
  const [selected,      setSelected]      = useState<string[]>([])
  const [frequency,     setFrequency]     = useState("PONCTUEL")
  const [duration,      setDuration]      = useState(60)
  const [address,       setAddress]       = useState("")
  const [city,          setCity]          = useState("Brazzaville")
  const [date,          setDate]          = useState("")
  const [endDate,       setEndDate]       = useState("")
  const [loading,       setLoading]       = useState(false)
  const [error, setError] = useState("")
  const [done,  setDone]  = useState(false)

  const queryClient = useQueryClient()
  const { data: cares = [] } = useQuery<Care[]>({
    queryKey: ["patient-elderly-cares"],
    queryFn:  () => fetch("/api/elderly-cares").then(r => r.json()).then(j => j.data ?? []),
  })

  function toggle(v: string) {
    setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const amount = Math.ceil(duration / 60) * 3000

  async function submit() {
    if (!address || !date) { setError("Adresse et date obligatoires."); return }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/elderly-cares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:     "self",
          careTypes:     selected,
          frequency,
          address,
          city,
          scheduledAt:   new Date(date).toISOString(),
          endDate:       endDate || undefined,
          duration,
          patientAge:    patientAge ? parseInt(patientAge) : undefined,
          medicalNotes:  medicalNotes || undefined,
          mobilityLevel: mobilityLevel || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      queryClient.invalidateQueries({ queryKey: ["patient-elderly-cares"] })
      setDone(true)
      setShowModal(false)
      setSelected([]); setAddress(""); setDate(""); setStep(1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur serveur.")
    } finally {
      setLoading(false)
    }
  }

  const active  = cares.filter(c => !["COMPLETED","CANCELLED"].includes(c.status))
  const history = cares.filter(c => ["COMPLETED","CANCELLED"].includes(c.status))

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soins personnes âgées</h1>
          <p className="text-sm text-gray-500">Accompagnement spécialisé à domicile pour seniors</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
          <Users className="h-4 w-4" /> Demander un soin
        </button>
      </div>

      {done && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4" /> Demande envoyée ! Un soignant spécialisé vous sera assigné.
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Soins en cours / planifiés</h2>
          <div className="space-y-3">
            {active.map(c => (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.careTypes.map(t => (
                        <span key={t} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                          {CARE_OPTIONS.find(o => o.value === t)?.emoji} {CARE_OPTIONS.find(o => o.value === t)?.label ?? t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {FREQ_OPTIONS.find(f => f.value === c.frequency)?.label ?? c.frequency}
                      </span>
                      <span className="text-xs text-gray-500">{c.duration} min / session</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" /> {c.address}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(c.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {c.agent?.agentProfile && (
                      <p className="mt-1 text-xs text-teal-600">
                        Soignant : {c.agent.agentProfile.firstName} {c.agent.agentProfile.lastName}
                      </p>
                    )}
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_LABEL[c.status]?.color)}>
                    {STATUS_LABEL[c.status]?.label ?? c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Historique</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {history.map((c, i) => (
              <div key={c.id} className={cn("flex items-center justify-between p-4 text-sm", i > 0 && "border-t border-gray-100")}>
                <div>
                  <p className="font-medium text-gray-800">
                    {c.careTypes.slice(0, 2).map(t => CARE_OPTIONS.find(o => o.value === t)?.label ?? t).join(", ")}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(c.scheduledAt).toLocaleDateString("fr-FR")}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_LABEL[c.status]?.color)}>
                  {STATUS_LABEL[c.status]?.label ?? c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cares.length === 0 && !showModal && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">Aucun soin senior commandé</p>
          <p className="mt-1 text-sm text-gray-400">Cliquez sur &quot;Demander un soin&quot; pour commencer.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <p className="font-semibold text-gray-900">Soin pour personne âgée</p>
                <p className="text-xs text-gray-400">Étape {step} sur 4</p>
              </div>
              <button onClick={() => { setShowModal(false); setStep(1); setSelected([]) }}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Profil du patient senior</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Âge du patient</label>
                    <input type="number" value={patientAge} onChange={e => setPatientAge(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      placeholder="Ex: 75" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Niveau d&apos;autonomie</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: "autonome",    label: "🟢 Autonome" },
                        { v: "semi",        label: "🟡 Semi-dépendant" },
                        { v: "dependant",   label: "🔴 Dépendant" },
                      ].map(({ v, label }) => (
                        <button key={v} type="button" onClick={() => setMobilityLevel(v)}
                          className={cn("rounded-xl border-2 p-2 text-xs text-center transition-all",
                            mobilityLevel === v
                              ? "border-teal-500 bg-teal-50 text-teal-800"
                              : "border-gray-200 text-gray-600 hover:border-teal-200"
                          )}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Notes médicales importantes</label>
                    <textarea rows={3} value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      placeholder="Maladies chroniques, traitements en cours..." />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-gray-700">Type de soin et fréquence</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {CARE_OPTIONS.map(o => (
                      <button key={o.value} type="button" onClick={() => toggle(o.value)}
                        className={cn("flex items-center gap-2 rounded-xl border-2 p-3 text-left text-xs transition-all",
                          selected.includes(o.value)
                            ? "border-teal-500 bg-teal-50 text-teal-800"
                            : "border-gray-200 text-gray-700 hover:border-teal-200"
                        )}>
                        <span className="text-lg">{o.emoji}</span>
                        <span className="font-medium">{o.label}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Fréquence</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {FREQ_OPTIONS.map(f => (
                        <button key={f.value} type="button" onClick={() => setFrequency(f.value)}
                          className={cn("rounded-xl border-2 p-2 text-xs text-center transition-all",
                            frequency === f.value
                              ? "border-teal-500 bg-teal-50 text-teal-800"
                              : "border-gray-200 text-gray-600 hover:border-teal-200"
                          )}>
                          {f.emoji} {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Durée par session</label>
                    <div className="flex gap-2">
                      {[60, 120, 180].map(d => (
                        <button key={d} type="button" onClick={() => setDuration(d)}
                          className={cn("flex-1 rounded-xl border-2 py-2 text-xs font-medium transition-all",
                            duration === d
                              ? "border-teal-500 bg-teal-50 text-teal-800"
                              : "border-gray-200 text-gray-600 hover:border-teal-200"
                          )}>
                          {d / 60}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Adresse et planning</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Adresse *</label>
                    <input value={address} onChange={e => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                      placeholder="Adresse complète..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Ville</label>
                      <input value={city} onChange={e => setCity(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">1ère date *</label>
                      <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                    </div>
                  </div>
                  {frequency !== "PONCTUEL" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Date de fin (optionnel)</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" />
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-gray-700">Récapitulatif et paiement</p>
                  <div className="rounded-xl bg-gray-50 p-4 space-y-2 mb-4">
                    <div className="flex flex-wrap gap-1">
                      {selected.map(t => (
                        <span key={t} className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">
                          {CARE_OPTIONS.find(o => o.value === t)?.emoji} {CARE_OPTIONS.find(o => o.value === t)?.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">Fréquence : {FREQ_OPTIONS.find(f => f.value === frequency)?.label}</p>
                    <p className="text-xs text-gray-600">Durée : {duration / 60}h par session</p>
                    <p className="text-xs text-gray-600"><MapPin className="inline h-3 w-3" /> {address}, {city}</p>
                    <p className="text-xs text-gray-600"><Clock className="inline h-3 w-3" /> {date && new Date(date).toLocaleDateString("fr-FR", { dateStyle: "long" })}</p>
                    <p className="mt-2 text-lg font-bold text-gray-900">{amount.toLocaleString("fr-FR")} XAF / session</p>
                  </div>
                  <p className="text-xs text-gray-500">Paiement par MTN Money, Airtel Money ou carte à la confirmation.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 p-5">
              {step > 1
                ? <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
                : <div />
              }
              {step < 4 ? (
                <button
                  onClick={() => {
                    if (step === 2 && selected.length === 0) { setError("Choisissez au moins un type de soin."); return }
                    setError(""); setStep(s => s + 1)
                  }}
                  className="flex items-center gap-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={submit} disabled={loading}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                  {loading ? "Envoi..." : "Confirmer la demande"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
