"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn, formatXAF } from "@/lib/utils"
import { FEATURES } from "@/lib/features"
import { getPusherClient } from "@/lib/pusher-client"
import { SPECIALITIES, SPECIALITY_LABELS } from "@/lib/specialities"
import {
  Video, Home, TestTube2, Building2, Zap, ArrowLeft, ArrowRight, Check, Clock, CreditCard, MapPin
} from "lucide-react"

type Doctor = {
  id: string; firstName: string; lastName: string; speciality: string; consultationFee: number
  cabinetId?: string; cabinetAddress?: string; cabinetCity?: string; cabinetName?: string
}

type ServiceType = "VIDEO" | "CARE" | "SAMPLING" | "PRESENTIEL" | "INSTANT"


function getMinDatetime(): string {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
}

export default function BookPage() {
  const router = useRouter()
  const [step,            setStep]           = useState(0)
  const [type,            setType]           = useState<ServiceType | null>(null)
  const [doctors,         setDoctors]        = useState<Doctor[]>([])
  const [doctorsLoaded,   setDoctorsLoaded]  = useState(false)
  const [selectedDoctor,  setSelectedDoctor] = useState<Doctor | null>(null)
  const [specialityFilter,setSpecialityFilter] = useState("ALL")
  const [customDatetime,  setCustomDatetime] = useState("")
  const [selectedSlot,    setSelectedSlot]   = useState<string | null>(null)
  const [reason,          setReason]         = useState("")
  const [loading,         setLoading]        = useState(false)
  const [error,           setError]          = useState("")
  const [done,            setDone]           = useState(false)
  const [appointmentId,   setAppointmentId]  = useState<string | null>(null)
  const [patientId,       setPatientId]      = useState<string | null>(null)

  async function loadDoctors() {
    if (doctorsLoaded) return
    try {
      const res = await fetch("/api/doctors")
      if (res.ok) {
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
      }
    } catch { /* ignore */ } finally {
      setDoctorsLoaded(true)
    }
  }

  async function submit() {
    if (!reason.trim() || reason.length < 10) { setError("Le motif doit contenir au moins 10 caractères."); return }
    setLoading(true)
    setError("")
    try {
      const isPresentiel = type === "PRESENTIEL"
      const isInstant    = type === "INSTANT"

      // Pour INSTANT : recalculer l'heure au moment de la soumission
      const scheduledAt = isInstant
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        : selectedSlot!

      const url = isPresentiel ? "/api/presentiel" : "/api/appointments"
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
    if (step === 0 && !type)           { setError("Veuillez choisir un type de service."); return }
    if (step === 1 && !selectedDoctor) { setError("Veuillez choisir un médecin."); return }

    // INSTANT : sauter l'étape date/heure
    if (step === 1 && type === "INSTANT") {
      setError("")
      setStep(3)
      return
    }

    if (step === 2 && !selectedSlot)   { setError("Veuillez choisir une date et une heure."); return }
    setError("")
    setStep((s) => s + 1)
  }

  function handleBack() {
    // INSTANT : depuis la confirmation revenir au choix médecin (step 1)
    if (type === "INSTANT" && step === 3) { setStep(1); setError(""); return }
    setStep((s) => s - 1); setError("")
  }

  const isWithDoctor = type === "VIDEO" || type === "PRESENTIEL" || type === "INSTANT"

  // Listener Pusher : redirige le patient automatiquement dès approbation admin d'une demande instantanée
  useEffect(() => {
    if (!done || type !== "INSTANT" || !appointmentId || !patientId) return
    const pusher = getPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(`private-patient-${patientId}`)
    channel.bind("appointment-approved-instant", (data: { appointmentId: string }) => {
      if (data.appointmentId === appointmentId) {
        router.push("/patient/appointments")
      }
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

  return (
    <div className="mx-auto max-w-2xl">
      {/* En-tête + indicateur d'étapes */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prendre un rendez-vous</h1>
        <div className="mt-3 flex gap-2">
          {["Type", "Médecin", "Date / Heure", "Confirmer"].map((label, i) => {
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
              { value: "INSTANT"    as const, icon: Zap,      label: "Consultation instantanée", desc: "Rejoignez un médecin dans 5 minutes",  badge: "5 min" },
              { value: "VIDEO"      as const, icon: Video,     label: "Consultation vidéo",        desc: "Programmez date et heure librement",   badge: null },
              { value: "PRESENTIEL" as const, icon: Building2, label: "Consultation en présentiel", desc: "En cabinet, chez le médecin",         badge: null },
              { value: "CARE"       as const, icon: Home,      label: "Soin à domicile",           desc: "Un agent se déplace chez vous",        badge: null },
              { value: "SAMPLING"   as const, icon: TestTube2, label: "Prélèvement à domicile",    desc: "Analyses biologiques chez vous",       badge: null },
            ] as { value: ServiceType; icon: React.ElementType; label: string; desc: string; badge: string | null }[]).map(({ value, icon: Icon, label, desc, badge }) => (
              <button
                key={value}
                onClick={() => {
                  setType(value)
                  if (value === "VIDEO" || value === "PRESENTIEL" || value === "INSTANT") loadDoctors()
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
                  {type === "PRESENTIEL" ? "Aucun médecin avec un cabinet disponible." : "Aucun médecin disponible."}
                </p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {filtered.map((doc) => (
                    <button key={doc.id} onClick={() => setSelectedDoctor(doc)}
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

        {/* ÉTAPE 2 — Date / Heure libre (VIDEO et PRESENTIEL uniquement — INSTANT saute cette étape) */}
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
                setSelectedSlot(e.target.value ? new Date(e.target.value).toISOString() : null)
              }}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-600 focus:outline-none"
            />
            {customDatetime && (
              <p className="mt-3 text-sm font-medium text-blue-600">
                ✓{" "}
                {new Date(customDatetime).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                {" à "}
                {new Date(customDatetime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
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
                  {type === "INSTANT"
                    ? "Dans environ 5 minutes"
                    : selectedSlot
                    ? `${new Date(selectedSlot).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${new Date(selectedSlot).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                    : "—"
                  }
                </span>
              </div>
              {selectedDoctor && (
                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                  <>
                    <span>Tarif</span>
                    <span className="text-blue-700">{formatXAF(selectedDoctor.consultationFee)}</span>
                  </>
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

          {step < 3 ? (
            <Button onClick={handleNext}>
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button loading={loading} onClick={submit}>
              <Check className="h-4 w-4" />
              {type === "INSTANT" ? "Démarrer la consultation" : "Envoyer la demande"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
