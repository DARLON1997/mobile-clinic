"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn, formatXAF } from "@/lib/utils"
import { FEATURES } from "@/lib/features"
import { getPusherClient } from "@/lib/pusher-client"
import { SPECIALITIES, SPECIALITY_LABELS } from "@/lib/specialities"
import {
  Video, Home, TestTube2, Building2, Zap, ArrowLeft, ArrowRight, Check,
  Clock, CreditCard, MapPin, Search, MessageCircle, Loader2,
} from "lucide-react"

type Doctor = {
  id: string; firstName: string; lastName: string; speciality: string; consultationFee: number
  cabinetId?: string; cabinetAddress?: string; cabinetCity?: string; cabinetName?: string
  bio?: string
}

type ServiceType = "VIDEO" | "CARE" | "SAMPLING" | "PRESENTIEL" | "INSTANT" | "FIND"

function getMinDatetime(): string {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
}

function safeDate(str: string | null | undefined): Date | null {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function formatSlot(str: string | null | undefined): string {
  const d = safeDate(str)
  if (!d) return "—"
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
}

export default function BookPage() {
  const router = useRouter()
  const [step,              setStep]             = useState(0)
  const [type,              setType]             = useState<ServiceType | null>(null)

  // Liste de médecins pour VIDEO/PRESENTIEL/INSTANT
  const [doctors,           setDoctors]          = useState<Doctor[]>([])
  const [lastLoadedType,    setLastLoadedType]   = useState<ServiceType | null>(null)
  const [selectedDoctor,    setSelectedDoctor]   = useState<Doctor | null>(null)
  const [specialityFilter,  setSpecialityFilter] = useState("ALL")
  const [customDatetime,    setCustomDatetime]   = useState("")
  const [selectedSlot,      setSelectedSlot]     = useState<string | null>(null)

  // État spécifique au parcours FIND
  const [findConsultType,   setFindConsultType]  = useState<"VIDEO" | "PRESENTIEL">("VIDEO")
  const [findSpeciality,    setFindSpeciality]   = useState("ALL")
  const [findDatetime,      setFindDatetime]     = useState("")
  const [findResults,       setFindResults]      = useState<Doctor[]>([])
  const [findLoading,       setFindLoading]      = useState(false)
  const [findSearched,      setFindSearched]     = useState(false)

  // Motif + soumission
  const [reason,            setReason]           = useState("")
  const [loading,           setLoading]          = useState(false)
  const [error,             setError]            = useState("")
  const [done,              setDone]             = useState(false)
  const [appointmentId,     setAppointmentId]    = useState<string | null>(null)
  const [patientId,         setPatientId]        = useState<string | null>(null)

  async function loadDoctors(serviceType: ServiceType) {
    const wasInstant = lastLoadedType === "INSTANT"
    const isInstant  = serviceType === "INSTANT"
    if (lastLoadedType !== null && wasInstant === isInstant) return
    try {
      const url = isInstant ? "/api/doctors?availableNow=true" : "/api/doctors"
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        const mapped: Doctor[] = (json.data ?? [])
          .filter((d: { doctorProfile: unknown }) => d.doctorProfile)
          .map((d: {
            id: string
            doctorProfile: { firstName: string; lastName: string; speciality: string; consultationFee: number; bio?: string }
            cabinet?: { id: string; name: string; address: string; city: string }
          }) => ({
            id:              d.id,
            firstName:       d.doctorProfile.firstName,
            lastName:        d.doctorProfile.lastName,
            speciality:      d.doctorProfile.speciality,
            consultationFee: d.doctorProfile.consultationFee,
            bio:             d.doctorProfile.bio,
            cabinetId:       d.cabinet?.id,
            cabinetName:     d.cabinet?.name,
            cabinetAddress:  d.cabinet?.address,
            cabinetCity:     d.cabinet?.city,
          }))
        setDoctors(mapped)
        setLastLoadedType(serviceType)
      }
    } catch { /* ignore */ }
  }

  async function searchDoctors() {
    if (!findDatetime || !safeDate(findDatetime)) { setError("Veuillez choisir une date et une heure valide."); return }
    setFindLoading(true)
    setFindSearched(false)
    setError("")
    try {
      const res = await fetch("/api/patient/find-available-doctors", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:       findConsultType,
          dateTime:   new Date(findDatetime).toISOString(),
          speciality: findSpeciality === "ALL" ? undefined : findSpeciality,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erreur")
      const mapped: Doctor[] = (json.data ?? []).map((d: {
        id: string
        doctorProfile: { firstName: string; lastName: string; speciality: string; consultationFee: number; bio?: string }
        cabinet?: { id: string; name: string; address: string; city: string }
      }) => ({
        id:              d.id,
        firstName:       d.doctorProfile.firstName,
        lastName:        d.doctorProfile.lastName,
        speciality:      d.doctorProfile.speciality,
        consultationFee: d.doctorProfile.consultationFee,
        bio:             d.doctorProfile.bio,
        cabinetId:       d.cabinet?.id,
        cabinetName:     d.cabinet?.name,
        cabinetAddress:  d.cabinet?.address,
        cabinetCity:     d.cabinet?.city,
      }))
      setFindResults(mapped)
      setFindSearched(true)
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur serveur.")
    } finally {
      setFindLoading(false)
    }
  }

  // type effectif pour la soumission (FIND → findConsultType)
  const effectiveType = type === "FIND" ? findConsultType : type

  async function submit() {
    if (!reason.trim() || reason.length < 10) { setError("Le motif doit contenir au moins 10 caractères."); return }

    // Validation de la date avant tout appel API
    if (type !== "INSTANT") {
      const rawDate = type === "FIND" ? findDatetime : selectedSlot
      if (!safeDate(rawDate)) {
        setError("La date et l'heure sélectionnées sont invalides. Veuillez revenir à l'étape précédente et resélectionner.")
        return
      }
    }

    setLoading(true)
    setError("")
    try {
      const isPresentiel = effectiveType === "PRESENTIEL"
      const isInstant    = type === "INSTANT"

      const scheduledAt = isInstant
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        : type === "FIND"
        ? safeDate(findDatetime)!.toISOString()
        : selectedSlot!

      const url  = isPresentiel ? "/api/presentiel" : "/api/appointments"
      const body = isPresentiel
        ? { doctorId: selectedDoctor!.id, cabinetId: selectedDoctor!.cabinetId, scheduledAt, reason: reason.trim(), duration: 30 }
        : { doctorId: selectedDoctor!.id, scheduledAt, reason: reason.trim(), duration: 30, ...(isInstant ? { instant: true } : {}) }

      const res  = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (json.data?.id)        setAppointmentId(json.data.id)
      if (json.data?.patientId) setPatientId(json.data.patientId)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création du rendez-vous.")
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (step === 0 && !type) { setError("Veuillez choisir un type de service."); return }

    if (type === "FIND") {
      if (step === 1) { searchDoctors(); return } // déclenche la recherche + setStep(2) en cas de succès
      if (step === 2 && !selectedDoctor) { setError("Veuillez choisir un médecin."); return }
      setError(""); setStep(3); return
    }

    if (step === 1 && !selectedDoctor) { setError("Veuillez choisir un médecin."); return }
    if (step === 1 && type === "INSTANT") { setError(""); setStep(3); return }
    if (step === 2 && !selectedSlot)   { setError("Veuillez choisir une date et une heure."); return }
    setError("")
    setStep((s) => s + 1)
  }

  function handleBack() {
    if (type === "INSTANT" && step === 3) { setStep(1); setError(""); return }
    if (type === "FIND" && step === 3)    { setStep(2); setError(""); return }
    setStep((s) => s - 1); setError("")
  }

  const isWithDoctor = type === "VIDEO" || type === "PRESENTIEL" || type === "INSTANT"

  useEffect(() => {
    if (!done || type !== "INSTANT" || !appointmentId || !patientId) return
    const pusher = getPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(`private-patient-${patientId}`)
    channel.bind("appointment-approved-instant", (data: { appointmentId: string }) => {
      if (data.appointmentId === appointmentId) router.push("/patient/appointments")
    })
    return () => { pusher.unsubscribe(`private-patient-${patientId}`) }
  }, [done, type, appointmentId, patientId, router])

  if (done && type === "INSTANT") return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 animate-pulse">
        <Zap className="h-8 w-8 text-orange-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Recherche d&apos;un médecin disponible...</h1>
      <p className="mt-2 text-sm text-gray-500">
        Un administrateur valide votre demande. Vous serez redirigé automatiquement dès l&apos;approbation.
      </p>
      <div className="mt-5 flex items-center justify-center gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: "300ms" }} />
      </div>
      <Button onClick={() => router.push("/patient/appointments")} variant="ghost" className="mt-8 w-full text-sm text-gray-500">
        Voir mes rendez-vous
      </Button>
    </div>
  )

  if (done) return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Demande envoyée !</h1>
      <p className="mt-2 text-sm text-gray-500">
        Votre demande est soumise à l&apos;administrateur. Vous recevrez une notification dès l&apos;approbation.
      </p>

      {(FEATURES.PAYMENT_ENABLED ? (
        <>
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-left">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Prochaine étape : Paiement</p>
                <p className="mt-0.5 text-xs">Une fois approuvée, un bouton <strong>&quot;Payer&quot;</strong> apparaîtra dans <strong>&quot;Mes rendez-vous&quot;</strong>.</p>
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
        <p className="mt-4 rounded-xl px-4 py-3 text-center text-[13px] text-gray-500"
          style={{ background: "rgba(200,144,106,0.08)", border: "1px solid rgba(200,144,106,0.2)" }}>
          💳 Paiement en ligne bientôt disponible.
        </p>
      ))}

      <Button onClick={() => router.push("/patient/appointments")} className="mt-6 w-full" size="lg">
        Voir mes rendez-vous
      </Button>
    </div>
  )

  const stepLabels = type === "FIND"
    ? ["Type", "Critères", "Résultats", "Confirmer"]
    : ["Type", "Médecin", "Date / Heure", "Confirmer"]

  return (
    <div className="mx-auto max-w-2xl">
      {/* En-tête + indicateur d'étapes */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prendre un rendez-vous</h1>
        <div className="mt-3 flex gap-2">
          {stepLabels.map((label, i) => {
            const skipped = type === "INSTANT" && i === 2
            return (
              <div key={label} className={cn("flex items-center gap-1.5", skipped && "opacity-25")}>
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
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        {/* ÉTAPE 0 — Type de service */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Type de service</h2>
            {([
              { value: "FIND"       as const, icon: Search,    label: "Trouver un médecin disponible", desc: "Choisissez une spécialité, un type et une heure — on vous trouve le bon médecin", badge: null },
              { value: "INSTANT"    as const, icon: Zap,       label: "Consultation instantanée",      desc: "Rejoignez un médecin disponible dans ~5 minutes",                                badge: "5 min" },
              { value: "VIDEO"      as const, icon: Video,     label: "Consultation vidéo",             desc: "Programmez date et heure librement",                                            badge: null },
              { value: "PRESENTIEL" as const, icon: Building2, label: "Consultation en présentiel",    desc: "En cabinet, chez le médecin",                                                   badge: null },
              { value: "CARE"       as const, icon: Home,      label: "Soin à domicile",               desc: "Un agent se déplace chez vous",                                                 badge: null },
              { value: "SAMPLING"   as const, icon: TestTube2, label: "Prélèvement à domicile",        desc: "Analyses biologiques chez vous",                                                badge: null },
            ] as { value: ServiceType; icon: React.ElementType; label: string; desc: string; badge: string | null }[]).map(({ value, icon: Icon, label, desc, badge }) => (
              <button
                key={value}
                onClick={() => {
                  setType(value)
                  if (value === "VIDEO" || value === "PRESENTIEL" || value === "INSTANT") loadDoctors(value)
                  if (value === "FIND") {
                    setFindResults([])
                    setFindSearched(false)
                    setSelectedDoctor(null)
                  }
                }}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  type === value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                )}>
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2", type === value ? "bg-blue-100" : "bg-gray-100")}>
                    <Icon className={cn("h-5 w-5", type === value ? "text-blue-600" : "text-gray-500")} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  {badge && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      {badge}
                    </span>
                  )}
                  {type === value && !badge && <Check className="h-4 w-4 text-blue-600" />}
                  {type === value && badge && <Check className="h-4 w-4 text-orange-500" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ÉTAPE 1 — Critères FIND */}
        {step === 1 && type === "FIND" && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Critères de recherche</h2>

            {/* Type consultation */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Type de consultation</label>
              <div className="flex gap-3">
                {[
                  { v: "VIDEO"      as const, Icon: Video,     label: "Vidéo" },
                  { v: "PRESENTIEL" as const, Icon: Building2, label: "Présentiel" },
                ].map(({ v, Icon, label }) => (
                  <button key={v} onClick={() => setFindConsultType(v)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-all",
                      findConsultType === v ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-200"
                    )}>
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spécialité */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Spécialité (optionnel)</label>
              <div className="flex flex-wrap gap-2">
                {(["ALL", ...SPECIALITIES.map(s => s.value)] as string[]).map((s) => (
                  <button key={s} onClick={() => setFindSpeciality(s)}
                    className={cn("rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                      findSpeciality === s ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600")}>
                    {s === "ALL" ? "Toutes les spécialités" : SPECIALITY_LABELS[s] ?? s}
                  </button>
                ))}
              </div>
            </div>

            {/* Date et heure */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Date et heure souhaitées</label>
              <input
                type="datetime-local"
                min={getMinDatetime()}
                value={findDatetime}
                onChange={(e) => setFindDatetime(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ÉTAPE 1 — Médecin (VIDEO, PRESENTIEL, INSTANT) */}
        {step === 1 && isWithDoctor && (
          <div>
            <h2 className="mb-3 text-base font-semibold text-gray-900">Choisir un médecin</h2>

            {type === "INSTANT" && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <Zap className="h-4 w-4 shrink-0 text-orange-500" />
                <p className="text-xs font-medium text-orange-700">
                  La consultation démarrera ~5 min après confirmation
                </p>
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              {(["ALL", ...SPECIALITIES.map(s => s.value)] as string[]).map((s) => (
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
                <p className="py-8 text-center text-sm text-gray-400">
                  {type === "INSTANT"
                    ? "Aucun médecin disponible en ce moment. Essayez dans quelques heures ou choisissez une consultation vidéo programmée."
                    : type === "PRESENTIEL"
                    ? "Aucun médecin avec un cabinet disponible."
                    : "Aucun médecin disponible."}
                </p>
              ) : (
                <DoctorList docs={filtered} selected={selectedDoctor} onSelect={setSelectedDoctor} showCabinet={type === "PRESENTIEL"} />
              )
            })()}
          </div>
        )}

        {/* ÉTAPE 2 — Résultats FIND */}
        {step === 2 && type === "FIND" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {findResults.length > 0
                  ? `${findResults.length} médecin${findResults.length > 1 ? "s" : ""} disponible${findResults.length > 1 ? "s" : ""}`
                  : "Aucun résultat"}
              </h2>
              {findSearched && safeDate(findDatetime) && (
                <p className="text-xs text-gray-400">
                  {findConsultType === "VIDEO" ? "Vidéo" : "Présentiel"} ·{" "}
                  {safeDate(findDatetime)!.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                  {" "}
                  {safeDate(findDatetime)!.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>

            {findResults.length > 0 ? (
              <DoctorList docs={findResults} selected={selectedDoctor} onSelect={setSelectedDoctor} showCabinet={findConsultType === "PRESENTIEL"} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                <p className="mb-3 text-sm text-gray-500">
                  Aucun médecin disponible pour ce créneau. Essayez une autre heure ou contactez-nous directement.
                </p>
                <a
                  href="https://wa.me/242067734369"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contacter via WhatsApp
                </a>
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 2 — Date / Heure libre (VIDEO et PRESENTIEL uniquement) */}
        {step === 2 && (type === "VIDEO" || type === "PRESENTIEL") && (
          <div>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Date et heure souhaitées</h2>
            <p className="mb-5 text-xs text-gray-400">
              Choisissez librement la date et l&apos;heure de votre consultation (min. 5 min dans le futur).
            </p>
            <input
              type="datetime-local"
              min={getMinDatetime()}
              value={customDatetime}
              onChange={(e) => {
                setCustomDatetime(e.target.value)
                const d = safeDate(e.target.value)
                setSelectedSlot(d ? d.toISOString() : null)
              }}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
            />
            {customDatetime && safeDate(customDatetime) && (
              <p className="mt-3 text-sm font-medium text-blue-600">
                ✓{" "}
                {safeDate(customDatetime)!.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                {" à "}
                {safeDate(customDatetime)!.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        )}

        {/* ÉTAPE 3 — Confirmation */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Confirmer la demande</h2>

            <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
              {selectedDoctor && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Médecin</span>
                  <span className="font-medium">Dr {selectedDoctor.firstName} {selectedDoctor.lastName}</span>
                </div>
              )}
              {effectiveType === "PRESENTIEL" && selectedDoctor?.cabinetAddress && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cabinet</span>
                  <span className="text-right font-medium">
                    {selectedDoctor.cabinetName}<br />
                    <span className="text-xs text-gray-400">{selectedDoctor.cabinetAddress}, {selectedDoctor.cabinetCity}</span>
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">{type === "INSTANT" ? "Démarrage" : "Date / Heure"}</span>
                <span className="font-medium">
                  {type === "INSTANT"
                    ? "Dans environ 5 minutes"
                    : type === "FIND"
                    ? formatSlot(findDatetime)
                    : formatSlot(selectedSlot)
                  }
                </span>
              </div>
              {selectedDoctor && (
                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                  <span>Tarif</span>
                  <span className="text-blue-700">{formatXAF(selectedDoctor.consultationFee)}</span>
                </div>
              )}
            </div>

            {type === "INSTANT" ? (
              <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                <p className="text-xs text-orange-700">
                  Votre demande sera validée par un administrateur en quelques instants. Vous serez redirigé automatiquement dès l&apos;approbation.
                </p>
              </div>
            ) : FEATURES.PAYMENT_ENABLED ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  Le paiement se fait <strong>après approbation</strong> par l&apos;administrateur. Un bouton &quot;Payer&quot; apparaîtra dans vos rendez-vous.
                </p>
              </div>
            ) : (
              <p className="rounded-xl px-4 py-3 text-center text-xs text-gray-500"
                style={{ background: "rgba(200,144,106,0.08)", border: "1px solid rgba(200,144,106,0.2)" }}>
                💳 Paiement en ligne bientôt disponible. Votre RDV sera confirmé après approbation.
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Motif de consultation *
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Décrivez brièvement votre motif (10 caractères min.)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          ) : <div />}

          {/* FIND step 2 sans résultats : pas de bouton "Continuer" */}
          {!(type === "FIND" && step === 2 && findResults.length === 0) && (
            step < 3 ? (
              <Button onClick={handleNext} disabled={findLoading}>
                {findLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Recherche...</>
                  : type === "FIND" && step === 1
                  ? <><Search className="h-4 w-4" /> Rechercher</>
                  : <>Continuer <ArrowRight className="h-4 w-4" /></>
                }
              </Button>
            ) : (() => {
              const dateInvalid = type !== "INSTANT" && !safeDate(type === "FIND" ? findDatetime : selectedSlot)
              return (
                <Button loading={loading} onClick={submit} disabled={dateInvalid}>
                  <Check className="h-4 w-4" />
                  {type === "INSTANT" ? "Démarrer la consultation" : "Envoyer la demande"}
                </Button>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}

function DoctorList({
  docs, selected, onSelect, showCabinet,
}: {
  docs: Doctor[]
  selected: Doctor | null
  onSelect: (d: Doctor) => void
  showCabinet: boolean
}) {
  return (
    <div className="max-h-80 space-y-2 overflow-y-auto">
      {docs.map((doc) => (
        <button key={doc.id} onClick={() => onSelect(doc)}
          className={cn(
            "w-full rounded-xl border-2 p-3 text-left transition-all",
            selected?.id === doc.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-200"
          )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                {doc.firstName.charAt(0)}{doc.lastName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Dr {doc.firstName} {doc.lastName}</p>
                <p className="text-xs text-gray-400">{SPECIALITY_LABELS[doc.speciality] ?? doc.speciality}</p>
                {showCabinet && doc.cabinetAddress && (
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
}
