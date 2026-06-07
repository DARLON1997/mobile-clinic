"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { FlaskConical, MapPin, Clock, Check, Download, ChevronRight, X } from "lucide-react"

const EXAM_OPTIONS = [
  { value: "BILAN_SANGUIN",    label: "Bilan sanguin complet",    emoji: "🩸" },
  { value: "GLYCEMIE",         label: "Glycémie",                 emoji: "🍬" },
  { value: "BILAN_LIPIDIQUE",  label: "Bilan lipidique",          emoji: "🫀" },
  { value: "BILAN_HEPATIQUE",  label: "Bilan hépatique (foie)",   emoji: "🫁" },
  { value: "BILAN_RENAL",      label: "Bilan rénal (reins)",      emoji: "🫘" },
  { value: "BILAN_THYROIDIEN", label: "Bilan thyroïdien",         emoji: "🦋" },
  { value: "EXAMEN_URINE",     label: "Analyse urinaire",         emoji: "🧪" },
  { value: "EXAMEN_SELLES",    label: "Parasitologie des selles", emoji: "🦠" },
  { value: "TEST_PALUDISME",   label: "Test paludisme",           emoji: "🦟" },
  { value: "TEST_VIH",         label: "Sérologie VIH",            emoji: "❤️" },
  { value: "TEST_GROSSESSE",   label: "Test de grossesse",        emoji: "🤰" },
  { value: "BILAN_COMPLET",    label: "Bilan complet",            emoji: "📋" },
]

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:          { label: "En attente",           color: "bg-yellow-100 text-yellow-800" },
  ASSIGNED:         { label: "Agent assigné",         color: "bg-blue-100 text-blue-800" },
  SAMPLE_COLLECTED: { label: "Prélèvement effectué", color: "bg-purple-100 text-purple-800" },
  IN_ANALYSIS:      { label: "En analyse",            color: "bg-orange-100 text-orange-800" },
  RESULTS_READY:    { label: "Résultats disponibles", color: "bg-green-100 text-green-800" },
  DELIVERED:        { label: "Résultats envoyés",     color: "bg-gray-100 text-gray-700" },
  CANCELLED:        { label: "Annulé",                color: "bg-red-100 text-red-700" },
}

type Exam = {
  id: string; examTypes: string[]; status: string; address: string
  city: string; scheduledAt: string; resultFileUrl?: string
  agent: { agentProfile: { firstName: string; lastName: string } | null } | null
}

export default function LabExamsPage() {
  const [exams,         setExams]         = useState<Exam[]>([])
  const [showModal,     setShowModal]     = useState(false)
  const [step,          setStep]          = useState(1)
  const [selected,      setSelected]      = useState<string[]>([])
  const [address,       setAddress]       = useState("")
  const [city,          setCity]          = useState("Brazzaville")
  const [date,          setDate]          = useState("")
  const [instructions,  setInstructions]  = useState("")
  const [prescRef,      setPrescRef]      = useState("")
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState("")
  const [done,          setDone]          = useState(false)

  const pricePerExam = (n: number) => n <= 2 ? 5000 : n <= 5 ? 10000 : 18000

  useEffect(() => {
    fetch("/api/lab-exams").then(r => r.json()).then(j => setExams(j.data ?? []))
  }, [done])

  function toggleExam(v: string) {
    setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function submit() {
    if (!address || !date) { setError("Adresse et date obligatoires."); return }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/lab-exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId:    "self",
          examTypes:    selected,
          address,
          city,
          scheduledAt:  new Date(date).toISOString(),
          instructions: instructions || undefined,
          prescriptionRef: prescRef || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDone(true); setShowModal(false)
      setSelected([]); setAddress(""); setDate(""); setInstructions(""); setPrescRef(""); setStep(1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur serveur.")
    } finally {
      setLoading(false)
    }
  }

  const activeExams = exams.filter(e => !["DELIVERED","CANCELLED"].includes(e.status))
  const history     = exams.filter(e => ["DELIVERED","CANCELLED"].includes(e.status))

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Examens de laboratoire</h1>
          <p className="text-sm text-gray-500">Un agent se déplace à domicile pour le prélèvement</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <FlaskConical className="h-4 w-4" /> Nouvel examen
        </button>
      </div>

      {done && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4" /> Demande envoyée ! Un agent vous contactera bientôt.
        </div>
      )}

      {/* Examens en cours */}
      {activeExams.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-gray-900">En cours</h2>
          <div className="space-y-3">
            {activeExams.map(e => (
              <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {e.examTypes.map(t => (
                        <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          {EXAM_OPTIONS.find(o => o.value === t)?.label ?? t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" /> {e.address}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(e.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {e.agent?.agentProfile && (
                      <p className="mt-1 text-xs text-blue-600">
                        Agent : {e.agent.agentProfile.firstName} {e.agent.agentProfile.lastName}
                      </p>
                    )}
                    {e.status === "RESULTS_READY" && e.resultFileUrl && (
                      <a href={e.resultFileUrl} target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                        <Download className="h-3 w-3" /> Télécharger les résultats
                      </a>
                    )}
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_LABEL[e.status]?.color)}>
                    {STATUS_LABEL[e.status]?.label ?? e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Historique</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {history.map((e, i) => (
              <div key={e.id} className={cn("flex items-center justify-between p-4 text-sm", i > 0 && "border-t border-gray-100")}>
                <div>
                  <p className="font-medium text-gray-800">
                    {e.examTypes.slice(0, 2).map(t => EXAM_OPTIONS.find(o => o.value === t)?.label ?? t).join(", ")}
                    {e.examTypes.length > 2 && ` +${e.examTypes.length - 2}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(e.scheduledAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_LABEL[e.status]?.color)}>
                    {STATUS_LABEL[e.status]?.label ?? e.status}
                  </span>
                  {e.resultFileUrl && (
                    <a href={e.resultFileUrl} target="_blank" rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800">
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {exams.length === 0 && !showModal && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <FlaskConical className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">Aucun examen commandé</p>
          <p className="mt-1 text-sm text-gray-400">Cliquez sur &quot;Nouvel examen&quot; pour démarrer.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <p className="font-semibold text-gray-900">Nouvel examen de laboratoire</p>
                <p className="text-xs text-gray-400">Étape {step} sur 3</p>
              </div>
              <button onClick={() => { setShowModal(false); setStep(1); setSelected([]) }}
                className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              {/* Étape 1 */}
              {step === 1 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-gray-700">Choisissez les examens</p>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {EXAM_OPTIONS.map(o => (
                      <button key={o.value} type="button" onClick={() => toggleExam(o.value)}
                        className={cn("flex items-center gap-2 rounded-xl border-2 p-3 text-left text-sm transition-all",
                          selected.includes(o.value)
                            ? "border-blue-600 bg-blue-50 text-blue-800"
                            : "border-gray-200 text-gray-700 hover:border-blue-200"
                        )}>
                        <span className="text-lg">{o.emoji}</span>
                        <span className="text-xs font-medium">{o.label}</span>
                      </button>
                    ))}
                  </div>
                  {selected.length > 0 && (
                    <p className="mt-3 text-center text-sm font-medium text-gray-700">
                      Montant estimé : <span className="text-blue-700">{pricePerExam(selected.length).toLocaleString("fr-FR")} XAF</span>
                    </p>
                  )}
                </div>
              )}

              {/* Étape 2 */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700">Lieu et date du prélèvement</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Adresse *</label>
                    <input value={address} onChange={e => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      placeholder="Rue, quartier, Brazzaville" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Ville</label>
                      <input value={city} onChange={e => setCity(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Date et heure *</label>
                      <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Instructions (jeûne, etc.)</label>
                    <textarea rows={2} value={instructions} onChange={e => setInstructions(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      placeholder="Ex: Jeûne de 8h requis..." />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Réf. ordonnance (optionnel)</label>
                    <input value={prescRef} onChange={e => setPrescRef(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                      placeholder="N° ordonnance..." />
                  </div>
                </div>
              )}

              {/* Étape 3 */}
              {step === 3 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-gray-700">Récapitulatif</p>
                  <div className="rounded-xl bg-gray-50 p-4 space-y-2 mb-4">
                    <div className="flex flex-wrap gap-1">
                      {selected.map(t => (
                        <span key={t} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                          {EXAM_OPTIONS.find(o => o.value === t)?.emoji} {EXAM_OPTIONS.find(o => o.value === t)?.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600"><MapPin className="inline h-3 w-3" /> {address}, {city}</p>
                    <p className="text-xs text-gray-600"><Clock className="inline h-3 w-3" /> {date && new Date(date).toLocaleDateString("fr-FR", { dateStyle: "long" })}</p>
                    <p className="mt-2 text-lg font-bold text-gray-900">{pricePerExam(selected.length).toLocaleString("fr-FR")} XAF</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Paiement par MTN Money, Airtel Money ou carte à la confirmation par l&apos;agent.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 p-5">
              {step > 1
                ? <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
                : <div />
              }
              {step < 3 ? (
                <button
                  onClick={() => { if (step === 1 && selected.length === 0) { setError("Choisissez au moins un examen."); return } setError(""); setStep(s => s + 1) }}
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={submit} disabled={loading}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
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
