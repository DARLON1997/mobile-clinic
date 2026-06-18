"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn, formatXAF } from "@/lib/utils"
import { FEATURES } from "@/lib/features"
import {
  Video, Home, TestTube2, Building2, ArrowLeft, ArrowRight, Check, Clock, CreditCard, MapPin
} from "lucide-react"

type Doctor = {
  id: string; firstName: string; lastName: string; speciality: string; consultationFee: number
  cabinetId?: string; cabinetAddress?: string; cabinetCity?: string; cabinetName?: string
}

const SPECIALITY_LABELS: Record<string, string> = {
  GENERALISTE:   "Généraliste",   CARDIOLOGUE: "Cardiologue",
  DERMATOLOGUE:  "Dermatologue",  PEDIATRE:    "Pédiatre",
  GYNECOLOGUE:   "Gynécologue",   OPHTALMOLOGUE: "Ophtalmologue",
  PSYCHIATRE:    "Psychiatre",    NEUROLOGUE:  "Neurologue",
  ORTHOPEDIE:    "Orthopédiste",  AUTRE:       "Autre",
}

export default function BookPage() {
  const router  = useRouter()
  const [step, setStep]     = useState(0)
  const [type, setType]     = useState<"VIDEO" | "CARE" | "SAMPLING" | "PRESENTIEL" | null>(null)
  const [doctors, setDoctors]         = useState<Doctor[]>([])
  const [doctorsLoaded, setDoctorsLoaded] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [specialityFilter, setSpecialityFilter] = useState("ALL")
  const [slots,    setSlots]    = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [reason,   setReason]   = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [done,     setDone]     = useState(false)

  // Charger les médecins
  async function loadDoctors() {
    if (doctorsLoaded) return
    try {
      const res = await fetch("/api/doctors")
      if (res.ok) {
        const json = await res.json()
        // L'API retourne { id, doctorProfile: { firstName, ... } } — on aplatit
        const mapped: Doctor[] = (json.data ?? [])
          .filter((d: { doctorProfile: unknown }) => d.doctorProfile)
          .map((d: { id: string; doctorProfile: { firstName: string; lastName: string; speciality: string; consultationFee: number }; cabinet?: { id: string; name: string; address: string; city: string } }) => ({
            id:              d.id,
            firstName:       d.doctorProfile.firstName,
            lastName:        d.doctorProfile.lastName,
            speciality:      d.doctorProfile.speciality,
            consultationFee: d.doctorProfile.consultationFee,
            cabinetId:       d.cabinet?.id,
            cabinetName:     d.cabinet?.name,
            cabinetAddress:  d.cabinet?.address,
            cabinetCity:     d.cabinet?.city,
          }))
        setDoctors(mapped)
      }
    } catch { /* ignore */ } finally {
      setDoctorsLoaded(true)
    }
  }

  // Générer des créneaux fictifs pour la semaine (à remplacer par API disponibilités)
  function generateSlots(doctorId: string) {
    const result: string[] = []
    const start = new Date()
    start.setDate(start.getDate() + 1)
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + d)
      if (day.getDay() === 0 || day.getDay() === 6) continue
      for (const hour of [9, 10, 11, 14, 15, 16]) {
        day.setHours(hour, 0, 0, 0)
        result.push(day.toISOString())
      }
    }
    setSlots(result.slice(0, 12))
    setSelectedSlot(null)
  }

  async function submit() {
    if (!reason.trim() || reason.length < 10) { setError("Le motif doit contenir au moins 10 caractères."); return }
    setLoading(true)
    setError("")
    try {
      const isPresentiel = type === "PRESENTIEL"
      const url  = isPresentiel ? "/api/presentiel" : "/api/appointments"
      const body = isPresentiel
        ? { doctorId: selectedDoctor!.id, cabinetId: selectedDoctor!.cabinetId, scheduledAt: selectedSlot!, reason: reason.trim(), duration: 30 }
        : { doctorId: selectedDoctor!.id, scheduledAt: selectedSlot!, reason: reason.trim(), duration: 30 }

      const res  = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création du rendez-vous.")
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Demande envoyée !</h1>
      <p className="mt-2 text-sm text-gray-500">
        Votre demande est soumise à l&apos;administrateur. Vous recevrez une notification dès l&apos;approbation.
      </p>
      {FEATURES.PAYMENT_ENABLED ? (
        <>
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-left">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Prochaine étape : Paiement</p>
                <p className="mt-0.5 text-xs">Une fois approuvée, un bouton <strong>&quot;Payer&quot;</strong> apparaîtra dans <strong>&quot;Mes rendez-vous&quot;</strong>. Le paiement confirme la consultation.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-left">
            <div className="flex items-start gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p className="text-xs text-blue-800">Tarif : <strong>{selectedDoctor ? formatXAF(selectedDoctor.consultationFee) : ""}</strong> — payable par MTN Mobile Money, Airtel Money ou carte bancaire.</p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border p-4 text-left" style={{ background: "rgba(76,175,135,0.08)", borderColor: "#4CAF87" }}>
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#4CAF87" }} />
            <div className="text-sm" style={{ color: "#2d6a4f" }}>
              <p className="font-semibold">🎉 Lancement — Consultations gratuites !</p>
              <p className="mt-0.5 text-xs">Dans le cadre de notre lancement, les consultations sont offertes. Une fois approuvée par l&apos;administrateur, votre RDV sera automatiquement confirmé.</p>
            </div>
          </div>
        </div>
      )}
      <Button onClick={() => router.push("/patient/appointments")} className="mt-6 w-full" size="lg">
        Voir mes rendez-vous
      </Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prendre un rendez-vous</h1>
        <div className="mt-3 flex gap-2">
          {["Type", "Médecin", "Créneau", "Confirmer"].map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                i < step ? "bg-green-500 text-white"
                : i === step ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-400"
              )}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={cn("text-xs font-medium hidden sm:block",
                i === step ? "text-blue-600" : "text-gray-400")}>
                {label}
              </span>
              {i < 3 && <span className="text-gray-200 text-sm">›</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* ÉTAPE 1 — Type */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Type de service</h2>
            {[
              { value: "VIDEO"      as const, icon: Video,     label: "Consultation vidéo",       desc: "Consultez un médecin en ligne" },
              { value: "PRESENTIEL" as const, icon: Building2, label: "Consultation en présentiel", desc: "En cabinet, chez le médecin" },
              { value: "CARE"       as const, icon: Home,      label: "Soin à domicile",           desc: "Un agent se déplace chez vous" },
              { value: "SAMPLING"   as const, icon: TestTube2, label: "Prélèvement à domicile",   desc: "Analyses biologiques chez vous" },
            ].map(({ value, icon: Icon, label, desc }) => (
              <button
                key={value}
                onClick={() => { setType(value); if (value === "VIDEO" || value === "PRESENTIEL") loadDoctors() }}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  type === value ? "border-blue-600 bg-blue-50 light-surface" : "border-gray-200 hover:border-blue-200"
                )}>
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2", type === value ? "bg-blue-100" : "bg-gray-100")}>
                    <Icon className={cn("h-5 w-5", type === value ? "text-blue-600" : "text-gray-500")} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  {type === value && <Check className="ml-auto h-4 w-4 text-blue-600" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ÉTAPE 2 — Médecin */}
        {step === 1 && (type === "VIDEO" || type === "PRESENTIEL") && (
          <div>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Choisir un médecin</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {["ALL", "GENERALISTE", "CARDIOLOGUE", "PEDIATRE", "GYNECOLOGUE"].map((s) => (
                <button key={s} onClick={() => setSpecialityFilter(s)}
                  className={cn("rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                    specialityFilter === s ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600")}>
                  {s === "ALL" ? "Tous" : SPECIALITY_LABELS[s] ?? s}
                </button>
              ))}
            </div>
            {(() => {
              const filtered = doctors
                .filter((d) => specialityFilter === "ALL" || d.speciality === specialityFilter)
                .filter((d) => type !== "PRESENTIEL" || !!d.cabinetId)
              return filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">
                  {type === "PRESENTIEL" ? "Aucun médecin avec un cabinet disponible." : "Aucun médecin disponible."}
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filtered.map((doc) => (
                    <button key={doc.id} onClick={() => { setSelectedDoctor(doc); generateSlots(doc.id) }}
                      className={cn(
                        "w-full rounded-xl border-2 p-3 text-left transition-all",
                        selectedDoctor?.id === doc.id ? "border-blue-600 bg-blue-50 light-surface" : "border-gray-200 hover:border-blue-200"
                      )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                            {doc.firstName.charAt(0)}{doc.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Dr {doc.firstName} {doc.lastName}</p>
                            <p className="text-xs text-gray-400">{SPECIALITY_LABELS[doc.speciality] ?? doc.speciality}</p>
                            {type === "PRESENTIEL" && doc.cabinetAddress && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="h-3 w-3" />
                                {doc.cabinetAddress}, {doc.cabinetCity}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-blue-700">{formatXAF(doc.consultationFee)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* ÉTAPE 3 — Créneau */}
        {step === 2 && (
          <div>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Choisir un créneau</h2>
            {slots.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Aucun créneau disponible.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const d = new Date(slot)
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "rounded-xl border-2 p-2 text-center text-xs transition-all",
                        selectedSlot === slot
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                          : "border-gray-200 text-gray-600 hover:border-blue-200"
                      )}>
                      <p className="font-medium">
                        {d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                      </p>
                      <p>{d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 4 — Confirmation */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Confirmer la demande</h2>

            {/* Récapitulatif */}
            <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-2">
              {selectedDoctor && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Médecin</span>
                  <span className="font-medium">Dr {selectedDoctor.firstName} {selectedDoctor.lastName}</span>
                </div>
              )}
              {type === "PRESENTIEL" && selectedDoctor?.cabinetAddress && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cabinet</span>
                  <span className="font-medium text-right">{selectedDoctor.cabinetName}<br /><span className="text-xs text-gray-400">{selectedDoctor.cabinetAddress}, {selectedDoctor.cabinetCity}</span></span>
                </div>
              )}
              {selectedSlot && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Date / Heure</span>
                  <span className="font-medium">
                    {new Date(selectedSlot).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    {" à "}
                    {new Date(selectedSlot).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              {selectedDoctor && !FEATURES.PAYMENT_ENABLED && (
                <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
                  <span style={{ color: "#4CAF87" }}>🎉 Gratuit — Période de lancement</span>
                  <span style={{ color: "#4CAF87" }}>0 XAF</span>
                </div>
              )}
            {selectedDoctor && FEATURES.PAYMENT_ENABLED && (
                <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
                  <span>Tarif (payable après approbation)</span>
                  <span className="text-blue-700">{formatXAF(selectedDoctor.consultationFee)}</span>
                </div>
              )}
            </div>

            {/* Note info */}
            {FEATURES.PAYMENT_ENABLED ? (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  Le paiement se fait <strong>après approbation</strong> par l&apos;administrateur. Un bouton &quot;Payer&quot; apparaîtra dans vos rendez-vous.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "rgba(76,175,135,0.08)", border: "1px solid #4CAF87" }}>
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#4CAF87" }} />
                <p className="text-xs" style={{ color: "#2d6a4f" }}>
                  Dans le cadre du <strong>lancement Mobile Clinic</strong>, les consultations sont <strong>gratuites</strong>. Votre RDV sera confirmé automatiquement après approbation.
                </p>
              </div>
            )}

            {/* Motif */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Motif de consultation *
              </label>
              <textarea rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Décrivez brièvement votre motif (10 caractères min.)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => { setStep((s) => s - 1); setError("") }}>
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          ) : <div />}

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 0 && !type) { setError("Veuillez choisir un type de service."); return }
                if (step === 1 && !selectedDoctor) { setError("Veuillez choisir un médecin."); return }
                if (step === 2 && !selectedSlot) { setError("Veuillez choisir un créneau."); return }
                setError("")
                setStep((s) => s + 1)
              }}>
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button loading={loading} onClick={submit}>
              <Check className="h-4 w-4" />
              Envoyer la demande
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
