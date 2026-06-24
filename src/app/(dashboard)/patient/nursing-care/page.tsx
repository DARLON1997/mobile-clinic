"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Syringe, MapPin, Clock, Check, ChevronRight, X } from "lucide-react"

const CARE_OPTIONS = [
  { value: "PRISE_TENSION",         label: "Prise de tension",           emoji: "🩺" },
  { value: "INJECTION",             label: "Injection (IM / sous-cut.)", emoji: "💉" },
  { value: "PANSEMENT",             label: "Changement de pansement",    emoji: "🩹" },
  { value: "PERFUSION",             label: "Pose de perfusion",          emoji: "💧" },
  { value: "PRISE_DE_SANG",         label: "Prise de sang",              emoji: "🩸" },
  { value: "SUIVI_POST_OPERATOIRE", label: "Suivi post-opératoire",      emoji: "🏥" },
  { value: "ADMINISTRATION_MED",    label: "Administration médicaments", emoji: "💊" },
  { value: "SOINS_PLAIE",           label: "Soin de plaie",              emoji: "🤕" },
]

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:     { label: "En attente",   color: "bg-yellow-100 text-yellow-800" },
  ASSIGNED:    { label: "Assigné",      color: "bg-blue-100 text-blue-800" },
  EN_ROUTE:    { label: "En route",     color: "bg-purple-100 text-purple-800" },
  IN_PROGRESS: { label: "En cours",     color: "bg-orange-100 text-orange-800" },
  COMPLETED:   { label: "Terminé",      color: "bg-green-100 text-green-800" },
  CANCELLED:   { label: "Annulé",       color: "bg-red-100 text-red-700" },
}

type Care = {
  id: string; careTypes: string[]; status: string; address: string
  city: string; scheduledAt: string
  agent: { agentProfile: { firstName: string; lastName: string } | null } | null
}

export default function NursingCarePage() {
  const queryClient = useQueryClient()
  const [showModal,    setShowModal]    = useState(false)
  const [step,         setStep]         = useState(1)
  const [selected,     setSelected]     = useState<string[]>([])
  const [address,      setAddress]      = useState("")
  const [city,         setCity]         = useState("Brazzaville")
  const [date,         setDate]         = useState("")
  const [instructions, setInstructions] = useState("")
  const [materials,    setMaterials]    = useState("")
  const [prescRef,     setPrescRef]     = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [done,    setDone]    = useState(false)

  const { data: cares = [] } = useQuery<Care[]>({
    queryKey: ["patient-nursing-cares"],
    queryFn:  () => fetch("/api/nursing-cares").then(r => r.json()).then(j => j.data ?? []),
  })

  function toggle(v: string) {
    setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function submit() {
    if (!address || !date) { setError("Adresse et date obligatoires."); return }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/nursing-cares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:    "self",
          careTypes:    selected,
          address,
          city,
          scheduledAt:  new Date(date).toISOString(),
          instructions: instructions || undefined,
          materials:    materials || undefined,
          prescriptionRef: prescRef || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      queryClient.invalidateQueries({ queryKey: ["patient-nursing-cares"] })
      setDone(true)
      setShowModal(false)
      setSelected([]); setAddress(""); setDate(""); setInstructions(""); setMaterials(""); setPrescRef(""); setStep(1)
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
          <h1 className="text-2xl font-bold text-gray-900">Soins infirmiers</h1>
          <p className="text-sm text-gray-500">Un infirmier se déplace à votre domicile</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Syringe className="h-4 w-4" /> Nouveau soin
        </button>
      </div>

      {done && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4" /> Demande envoyée ! Un infirmier sera assigné prochainement.
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Soins en cours</h2>
          <div className="space-y-3">
            {active.map(c => (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.careTypes.map(t => (
                        <span key={t} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                          {CARE_OPTIONS.find(o => o.value === t)?.emoji} {CARE_OPTIONS.find(o => o.value === t)?.label ?? t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" /> {c.address}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(c.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {c.agent?.agentProfile && (
                      <p className="mt-1 text-xs text-blue-600">
                        Infirmier : {c.agent.agentProfile.firstName} {c.agent.agentProfile.lastName}
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
                    {c.careTypes.length > 2 && ` +${c.careTypes.length - 2}`}
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
          <Syringe className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">Aucun soin infirmier commandé</p>
          <p className="mt-1 text-sm text-gray-400">Cliquez sur &quot;Nouveau soin&quot; pour commencer.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <p className="font-semibold text-gray-900">Nouveau soin infirmier</p>
                <p className="text-xs text-gray-400">Étape {step} sur 3</p>
              </div>
              <button onClick={() => { setShowModal(false); setStep(1); setSelected([]) }}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              {step === 1 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-gray-700">Type de soin souhaité</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CARE_OPTIONS.map(o => (
                      <button key={o.value} type="button" onClick={() => toggle(o.value)}
                        className={cn("flex items-center gap-2 rounded-xl border-2 p-3 text-left text-xs transition-all",
                          selected.includes(o.value)
                            ? "border-purple-500 bg-purple-50 text-purple-800"
                            : "border-gray-200 text-gray-700 hover:border-purple-200"
                        )}>
                        <span className="text-lg">{o.emoji}</span>
                        <span className="font-medium">{o.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Instructions médicales</label>
                      <textarea rows={2} value={instructions} onChange={e => setInstructions(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                        placeholder="Ex: Injection en sous-cutané, dosage 10mg..." />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Matériel à apporter (optionnel)</label>
                      <input value={materials} onChange={e => setMaterials(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                        placeholder="Ex: Seringue 5ml, compresses..." />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Adresse et horaire</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Adresse *</label>
                    <input value={address} onChange={e => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                      placeholder="Rue, quartier..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Ville</label>
                      <input value={city} onChange={e => setCity(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Date et heure *</label>
                      <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Réf. ordonnance (optionnel)</label>
                    <input value={prescRef} onChange={e => setPrescRef(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                      placeholder="N° ordonnance..." />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-gray-700">Récapitulatif</p>
                  <div className="rounded-xl bg-gray-50 p-4 space-y-2 mb-4">
                    <div className="flex flex-wrap gap-1">
                      {selected.map(t => (
                        <span key={t} className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                          {CARE_OPTIONS.find(o => o.value === t)?.emoji} {CARE_OPTIONS.find(o => o.value === t)?.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600"><MapPin className="inline h-3 w-3" /> {address}, {city}</p>
                    <p className="text-xs text-gray-600"><Clock className="inline h-3 w-3" /> {date && new Date(date).toLocaleDateString("fr-FR", { dateStyle: "long" })}</p>
                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {(selected.length <= 2 ? 4000 : 8000).toLocaleString("fr-FR")} XAF
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 p-5">
              {step > 1
                ? <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
                : <div />
              }
              {step < 3 ? (
                <button
                  onClick={() => { if (step === 1 && selected.length === 0) { setError("Choisissez au moins un soin."); return } setError(""); setStep(s => s + 1) }}
                  className="flex items-center gap-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={submit} disabled={loading}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
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
