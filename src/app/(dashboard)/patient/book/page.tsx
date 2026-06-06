"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { cn, formatXAF } from "@/lib/utils"
import {
  Video, Home, TestTube2, ArrowLeft, ArrowRight, Check, CreditCard, Smartphone
} from "lucide-react"

type Doctor = { id: string; firstName: string; lastName: string; speciality: string; consultationFee: number }

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
  const [type, setType]     = useState<"VIDEO" | "CARE" | "SAMPLING" | null>(null)
  const [doctors, setDoctors]         = useState<Doctor[]>([])
  const [doctorsLoaded, setDoctorsLoaded] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [specialityFilter, setSpecialityFilter] = useState("ALL")
  const [slots,    setSlots]    = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [reason,   setReason]   = useState("")
  const [payMethod, setPayMethod] = useState<"MTN_MONEY" | "AIRTEL_MONEY" | "CARD" | null>(null)
  const [payPhone, setPayPhone] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [done,     setDone]     = useState(false)

  // Charger les médecins
  async function loadDoctors() {
    if (doctorsLoaded) return
    try {
      const res = await fetch("/api/appointments?_doctors=1")
      // Fallback : on appelle l'API publique des médecins
      const res2 = await fetch("/api/doctors")
      if (res2.ok) {
        const json = await res2.json()
        setDoctors(json.data ?? [])
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
    if (!payMethod) { setError("Veuillez choisir un moyen de paiement."); return }
    if ((payMethod === "MTN_MONEY" || payMethod === "AIRTEL_MONEY") && !payPhone.trim()) {
      setError("Numéro Mobile Money requis.")
      return
    }
    setLoading(true)
    setError("")
    try {
      // 1. Créer le RDV
      const apptRes = await fetch("/api/appointments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId:    selectedDoctor!.id,
          scheduledAt: selectedSlot!,
          reason:      reason.trim(),
          duration:    30,
        }),
      })
      const apptJson = await apptRes.json()
      if (!apptRes.ok) throw new Error(apptJson.error)

      // 2. Initialiser le paiement
      const payRes = await fetch("/api/payments/initialize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: apptJson.data.id,
          method:        payMethod,
          phone:         payPhone || undefined,
        }),
      })
      const payJson = await payRes.json()
      if (!payRes.ok) throw new Error(payJson.error)

      // 3. Si lien Flutterwave → rediriger
      if (payJson.data?.paymentLink) {
        window.location.href = payJson.data.paymentLink
        return
      }

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
      <h1 className="text-xl font-bold text-gray-900">Rendez-vous demandé !</h1>
      <p className="mt-2 text-sm text-gray-500">
        Votre demande est en cours de validation. Vous recevrez un SMS de confirmation.
      </p>
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
          {["Type", "Médecin", "Créneau", "Paiement"].map((label, i) => (
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
              { value: "VIDEO"    as const, icon: Video,     label: "Consultation vidéo",       desc: "Consultez un médecin en ligne" },
              { value: "CARE"     as const, icon: Home,      label: "Soin à domicile",           desc: "Un agent se déplace chez vous" },
              { value: "SAMPLING" as const, icon: TestTube2, label: "Prélèvement à domicile",   desc: "Analyses biologiques chez vous" },
            ].map(({ value, icon: Icon, label, desc }) => (
              <button
                key={value}
                onClick={() => { setType(value); if (value === "VIDEO") loadDoctors() }}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  type === value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-200"
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
        {step === 1 && type === "VIDEO" && (
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
            {doctors.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Aucun médecin disponible.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {doctors
                  .filter((d) => specialityFilter === "ALL" || d.speciality === specialityFilter)
                  .map((doc) => (
                    <button key={doc.id} onClick={() => { setSelectedDoctor(doc); generateSlots(doc.id) }}
                      className={cn(
                        "w-full rounded-xl border-2 p-3 text-left transition-all",
                        selectedDoctor?.id === doc.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                      )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                            {doc.firstName.charAt(0)}{doc.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Dr {doc.firstName} {doc.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{SPECIALITY_LABELS[doc.speciality] ?? doc.speciality}</p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-blue-700">{formatXAF(doc.consultationFee)}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
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

        {/* ÉTAPE 4 — Confirmation + Paiement */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Confirmation et paiement</h2>

            {/* Récapitulatif */}
            <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-1">
              {selectedDoctor && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Médecin</span>
                  <span className="font-medium">Dr {selectedDoctor.firstName} {selectedDoctor.lastName}</span>
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
              {selectedDoctor && (
                <div className="flex justify-between font-semibold">
                  <span>Tarif</span>
                  <span className="text-blue-700">{formatXAF(selectedDoctor.consultationFee)}</span>
                </div>
              )}
            </div>

            {/* Motif */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Motif de consultation *
              </label>
              <textarea rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Décrivez brièvement votre motif de consultation (10 caractères min.)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)} />
            </div>

            {/* Moyen de paiement */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Moyen de paiement *</p>
              <div className="space-y-2">
                {[
                  { value: "MTN_MONEY" as const,    label: "MTN Mobile Money",  icon: Smartphone, color: "text-yellow-600" },
                  { value: "AIRTEL_MONEY" as const, label: "Airtel Money",       icon: Smartphone, color: "text-red-600" },
                  { value: "CARD" as const,         label: "Carte bancaire",     icon: CreditCard, color: "text-blue-600" },
                ].map(({ value, label, icon: Icon, color }) => (
                  <div key={value}>
                    <button onClick={() => setPayMethod(value)}
                      className={cn(
                        "w-full rounded-xl border-2 p-3 text-left flex items-center gap-3 transition-all",
                        payMethod === value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                      )}>
                      <Icon className={cn("h-5 w-5", color)} />
                      <span className="text-sm font-medium text-gray-900">{label}</span>
                      {payMethod === value && <Check className="ml-auto h-4 w-4 text-blue-600" />}
                    </button>
                    {payMethod === value && (value === "MTN_MONEY" || value === "AIRTEL_MONEY") && (
                      <div className="mt-2 pl-2">
                        <Input
                          label=""
                          type="tel"
                          placeholder="+242XXXXXXXXX"
                          value={payPhone}
                          onChange={(e) => setPayPhone(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
              Confirmer et payer {selectedDoctor ? formatXAF(selectedDoctor.consultationFee) : ""}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
