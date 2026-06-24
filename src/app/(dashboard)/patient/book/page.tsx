"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn, formatXAF } from "@/lib/utils"
import { FEATURES } from "@/lib/features"
import { getPusherClient } from "@/lib/pusher-client"
import { SPECIALITIES, SPECIALITY_LABELS } from "@/lib/specialities"
import { DateTimePicker } from "@/components/shared/DateTimePicker"
import { getAvailabilityHint } from "@/lib/default-schedules"
import {
  Video, Home, TestTube2, Building2, Zap,
  ArrowLeft, ArrowRight, Check, Clock, MapPin, Loader2, MessageCircle,
} from "lucide-react"

// ─── types ────────────────────────────────────────────────────────────────────

type Doctor = {
  id: string
  firstName: string; lastName: string; speciality: string; consultationFee: number
  cabinetId?: string; cabinetName?: string; cabinetAddress?: string; cabinetCity?: string
}

type ServiceType = "VIDEO" | "CARE" | "SAMPLING" | "PRESENTIEL" | "INSTANT"

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function formatSlot(s: string | null | undefined): string {
  const d = safeDate(s)
  if (!d) return "—"
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
}

// ─── services list ────────────────────────────────────────────────────────────

const SERVICES: {
  value: ServiceType
  label: string
  desc: string
  icon: React.ElementType
  badge?: string
}[] = [
  { value: "INSTANT",    label: "Consultation instantanée",    desc: "Médecin disponible dans ~5 min",           icon: Zap,       badge: "5 min" },
  { value: "VIDEO",      label: "Consultation en ligne",       desc: "Vidéo, date et heure libres",              icon: Video },
  { value: "PRESENTIEL", label: "Consultation en présentiel",  desc: "En cabinet chez le médecin",              icon: Building2 },
  { value: "CARE",       label: "Soin à domicile",             desc: "Un professionnel se déplace chez vous",    icon: Home },
  { value: "SAMPLING",   label: "Prélèvement à domicile",      desc: "Analyses biologiques à domicile",          icon: TestTube2 },
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function BookPage() {
  const router = useRouter()

  const [step,           setStep]          = useState(0)
  const [type,           setType]          = useState<ServiceType | null>(null)
  const [selectedSlot,   setSelectedSlot]  = useState<string | null>(null)
  const [doctors,        setDoctors]       = useState<Doctor[]>([])
  const [docLoading,     setDocLoading]    = useState(false)
  const [speciality,     setSpeciality]    = useState("ALL")
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [reason,         setReason]        = useState("")
  const [loading,        setLoading]       = useState(false)
  const [error,          setError]         = useState("")
  const [done,           setDone]          = useState(false)
  const [appointmentId,  setAppointmentId] = useState<string | null>(null)
  const [patientId,      setPatientId]     = useState<string | null>(null)

  // ── chargement des médecins ──────────────────────────────────────────────
  //   slot : ISO string du créneau choisi (undefined si non pertinent)
  //   Pour VIDEO/PRESENTIEL : transmettre le slot → filtre réel par créneau
  //   Pour INSTANT          : availableNow=true → planning hebdo
  //   Pour CARE/SAMPLING    : aucun filtre de planning (visite à domicile)
  const loadDoctors = useCallback(async (svcType: ServiceType, slot?: string | null) => {
    setDocLoading(true)
    setDoctors([])
    try {
      let url: string
      if (svcType === "INSTANT") {
        // Pour l'instantané tous les médecins vérifiés sont affichés —
        // c'est l'admin qui dispatche selon la disponibilité réelle.
        url = "/api/doctors"
      } else if (
        (svcType === "VIDEO" || svcType === "PRESENTIEL") &&
        slot && safeDate(slot)
      ) {
        // Filtrage réel : seuls les médecins disponibles au créneau sélectionné
        const apiType = svcType === "VIDEO" ? "VIDEO" : "PRESENTIEL"
        url = `/api/doctors?type=${apiType}&scheduledAt=${encodeURIComponent(slot)}`
      } else {
        url = "/api/doctors"
      }

      const res  = await fetch(url)
      if (!res.ok) return
      const json = await res.json()
      const mapped: Doctor[] = (json.data ?? [])
        .filter((d: { doctorProfile: unknown }) => d.doctorProfile)
        .map((d: {
          id: string
          doctorProfile: { firstName: string; lastName: string; speciality: string; consultationFee: number }
          cabinet?: { id: string; name: string; address: string; city: string }
        }) => ({
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
    } catch { /* réseau off — ignorer */ }
    finally  { setDocLoading(false) }
  }, [])

  // Pré-chargement pour INSTANT, CARE et SAMPLING (pas besoin du slot)
  useEffect(() => {
    if (type === "INSTANT" || type === "CARE" || type === "SAMPLING") {
      loadDoctors(type)
    }
  }, [type, loadDoctors])

  // ── navigation ──────────────────────────────────────────────────────────
  function handleNext() {
    setError("")
    if (step === 0) {
      if (!type) { setError("Veuillez choisir un type de service."); return }
      setStep(type === "INSTANT" ? 2 : 1)
      return
    }
    if (step === 1) {
      if (!safeDate(selectedSlot)) { setError("Veuillez sélectionner un jour et une heure."); return }
      // Charger les médecins avec le créneau maintenant connu
      if (type === "VIDEO" || type === "PRESENTIEL") {
        loadDoctors(type, selectedSlot)
      }
      setStep(2)
      return
    }
    if (step === 2) {
      if (!selectedDoctor) { setError("Veuillez choisir un médecin."); return }
      setStep(3)
      return
    }
  }

  function handleBack() {
    setError("")
    setStep(s => (type === "INSTANT" && s === 2) ? 0 : s - 1)
  }

  // ── soumission ───────────────────────────────────────────────────────────
  async function submit() {
    if (!reason.trim() || reason.length < 10) {
      setError("Le motif doit contenir au moins 10 caractères.")
      return
    }
    if (type !== "INSTANT" && !safeDate(selectedSlot)) {
      setError("La date et l'heure sont invalides. Revenez à l'étape précédente.")
      return
    }
    setLoading(true); setError("")
    try {
      const isPresentiel = type === "PRESENTIEL"
      const isInstant    = type === "INSTANT"
      const scheduledAt  = isInstant
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
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
    } finally { setLoading(false) }
  }

  // ── Pusher : redirection auto après approbation instantanée ──────────────
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

  // ─── écrans "terminé" ─────────────────────────────────────────────────────

  if (done && type === "INSTANT") return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-orange-100">
        <Zap className="h-8 w-8 text-orange-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Recherche d&apos;un médecin disponible…</h1>
      <p className="mt-2 text-sm text-gray-500">
        Un administrateur valide votre demande. Vous serez redirigé automatiquement dès approbation.
      </p>
      <div className="mt-5 flex justify-center gap-1.5">
        {[0, 150, 300].map(d => (
          <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: `${d}ms` }} />
        ))}
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
        Votre demande est soumise à l&apos;administrateur. Vous serez notifié dès l&apos;approbation.
      </p>
      {FEATURES.PAYMENT_ENABLED ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              Un bouton <strong>&quot;Payer&quot;</strong> apparaîtra dans <strong>&quot;Mes rendez-vous&quot;</strong> après approbation.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl px-4 py-3 text-center text-[13px] text-gray-500"
          style={{ background: "rgba(200,144,106,0.08)", border: "1px solid rgba(200,144,106,0.2)" }}>
          💳 Paiement en ligne bientôt disponible.
        </p>
      )}
      <Button onClick={() => router.push("/patient/appointments")} className="mt-6 w-full" size="lg">
        Voir mes rendez-vous
      </Button>
    </div>
  )

  // ─── liste filtrée ────────────────────────────────────────────────────────

  const filteredDoctors = doctors
    .filter(d => speciality === "ALL" || d.speciality === speciality)
    .filter(d => type !== "PRESENTIEL" || !!d.cabinetId)

  // Hint de disponibilité contextuel (étape 1 et étape 2)
  const scheduleHint = type && type !== "INSTANT"
    ? getAvailabilityHint(speciality, type)
    : undefined

  const STEP_LABELS = ["Service", "Date & Heure", "Médecin", "Confirmer"]

  // ─── rendu principal ──────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-xl">
      {/* En-tête + stepper */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prendre un rendez-vous</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {STEP_LABELS.map((label, i) => {
            const skipped = type === "INSTANT" && i === 1
            return (
              <div key={label} className={cn("flex items-center gap-1.5", skipped && "opacity-20")}>
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  i < step  ? "bg-green-500 text-white"
                  : i === step ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400"
                )}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={cn("hidden sm:block text-xs font-medium",
                  i === step ? "text-blue-600" : "text-gray-400")}>
                  {label}
                </span>
                {i < 3 && <span className="text-gray-300 text-sm">›</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}

        {/* ── ÉTAPE 0 : Service ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Type de consultation</h2>
            {SERVICES.map(({ value, label, desc, icon: Icon, badge }) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-all",
                  type === value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("shrink-0 rounded-lg p-2", type === value ? "bg-blue-100" : "bg-gray-100")}>
                    <Icon className={cn("h-5 w-5", type === value ? "text-blue-600" : "text-gray-500")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  {badge && (
                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      {badge}
                    </span>
                  )}
                  {type === value && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── ÉTAPE 1 : Date & Heure ────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Date & Heure</h2>

            {/* Hint contextuel basé sur le type de service */}
            {type === "VIDEO" && (
              <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                💡 Généralistes : disponibles à toute heure. Spécialistes : selon leur planning hebdomadaire.
              </p>
            )}
            {type === "PRESENTIEL" && (
              <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                💡 Consultations en cabinet généralement du lundi au samedi, horaires variables selon le médecin.
              </p>
            )}
            {type === "CARE" && (
              <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                💡 Nos agents interviennent à domicile 7j/7. L&apos;heure est indicative.
              </p>
            )}
            {type === "SAMPLING" && (
              <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                💡 Prélèvements à domicile disponibles tous les jours. L&apos;heure est indicative.
              </p>
            )}

            <p className="mb-4 text-xs text-gray-400">
              Sélectionnez un jour dans le calendrier, puis choisissez l&apos;heure.
            </p>
            <DateTimePicker
              value={safeDate(selectedSlot)}
              onChange={(d) => setSelectedSlot(d.toISOString())}
              minDate={new Date(Date.now() + 5 * 60 * 1000)}
            />
          </div>
        )}

        {/* ── ÉTAPE 2 : Médecin ─────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="mb-3 text-base font-semibold text-gray-900">Choisir un médecin</h2>

            {type === "INSTANT" && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                <Zap className="h-4 w-4 shrink-0 text-orange-500" />
                <p className="text-xs font-medium text-orange-700">Choisissez votre médecin — la consultation démarre dans ~5 min après approbation.</p>
              </div>
            )}

            {/* Filtre spécialité */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(["ALL", ...SPECIALITIES.map(s => s.value)] as string[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSpeciality(s)}
                  className={cn(
                    "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                    speciality === s
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-blue-300"
                  )}
                >
                  {s === "ALL" ? "Toutes spécialités" : SPECIALITY_LABELS[s] ?? s}
                </button>
              ))}
            </div>

            {/* Hint de disponibilité selon spécialité + type */}
            {scheduleHint && (
              <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                {scheduleHint}
              </div>
            )}

            {/* Liste des médecins */}
            {docLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">
                  {type === "INSTANT"
                    ? "Aucun médecin enregistré pour le moment."
                    : type === "PRESENTIEL"
                    ? "Aucun médecin en cabinet disponible pour ce créneau."
                    : "Aucun médecin disponible pour ce créneau ou cette spécialité."}
                </p>
                <a
                  href="https://wa.me/242067734369"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contacter via WhatsApp
                </a>
                {type === "INSTANT" && (
                  <p className="mt-3 text-xs text-gray-400">
                    ou essayez une consultation vidéo programmée.
                  </p>
                )}
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
                {filteredDoctors.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={cn(
                      "w-full rounded-xl border-2 p-3 text-left transition-all",
                      selectedDoctor?.id === doc.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {doc.firstName[0]}{doc.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          Dr {doc.firstName} {doc.lastName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {SPECIALITY_LABELS[doc.speciality] ?? doc.speciality}
                        </p>
                        {type === "PRESENTIEL" && doc.cabinetAddress && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {doc.cabinetAddress}, {doc.cabinetCity}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-blue-700">
                          {formatXAF(doc.consultationFee)}
                        </p>
                        {selectedDoctor?.id === doc.id && (
                          <Check className="ml-auto mt-0.5 h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ÉTAPE 3 : Confirmation ────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Confirmer la demande</h2>
            <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Service</span>
                <span className="font-medium">{SERVICES.find(s => s.value === type)?.label ?? "—"}</span>
              </div>
              {selectedDoctor && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Médecin</span>
                  <span className="font-medium">Dr {selectedDoctor.firstName} {selectedDoctor.lastName}</span>
                </div>
              )}
              {type === "PRESENTIEL" && selectedDoctor?.cabinetAddress && (
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
                  {type === "INSTANT" ? "Dans environ 5 minutes" : formatSlot(selectedSlot)}
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
                  Votre demande sera validée par un administrateur en quelques instants.
                </p>
              </div>
            ) : FEATURES.PAYMENT_ENABLED ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  Le paiement se fait <strong>après approbation</strong>. Un bouton &quot;Payer&quot; apparaîtra dans vos rendez-vous.
                </p>
              </div>
            ) : (
              <p className="rounded-xl px-4 py-3 text-center text-xs text-gray-500"
                style={{ background: "rgba(200,144,106,0.08)", border: "1px solid rgba(200,144,106,0.2)" }}>
                💳 Paiement en ligne bientôt disponible. RDV confirmé après approbation.
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Motif de consultation *
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                placeholder="Décrivez brièvement votre motif (10 caractères min.)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          ) : <div />}

          {step < 3 ? (
            <Button onClick={handleNext}>
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              loading={loading}
              onClick={submit}
              disabled={type !== "INSTANT" && !safeDate(selectedSlot)}
            >
              <Check className="h-4 w-4" />
              {type === "INSTANT" ? "Démarrer la consultation" : "Envoyer la demande"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
