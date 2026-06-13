"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { CreditCard, Smartphone, Check, ArrowLeft, Loader2, Clock } from "lucide-react"
import { cn, formatXAF } from "@/lib/utils"

type ApptInfo = {
  id: string
  scheduledAt: string
  reason: string
  status: string
  doctor: {
    doctorProfile: { firstName: string; lastName: string; consultationFee: number } | null
  }
}

export default function PayPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [appt,      setAppt]      = useState<ApptInfo | null>(null)
  const [loadingAppt, setLoadingAppt] = useState(true)
  const [payMethod, setPayMethod] = useState<"MTN_MONEY" | "AIRTEL_MONEY" | "CARD" | null>(null)
  const [payPhone,  setPayPhone]  = useState("")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")

  useEffect(() => {
    fetch(`/api/appointments/${id}`)
      .then(r => r.json())
      .then(j => setAppt(j.data))
      .finally(() => setLoadingAppt(false))
  }, [id])

  async function pay() {
    if (!payMethod) { setError("Veuillez choisir un moyen de paiement."); return }
    if ((payMethod === "MTN_MONEY" || payMethod === "AIRTEL_MONEY") && !payPhone.trim()) {
      setError("Numéro Mobile Money requis."); return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id, method: payMethod, phone: payPhone || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Erreur paiement"); return }
      if (json.data?.paymentLink) {
        window.location.href = json.data.paymentLink
      } else {
        router.push("/patient/appointments")
      }
    } catch {
      setError("Erreur réseau. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingAppt) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" />
    </div>
  )

  if (!appt) return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-gray-500">Rendez-vous introuvable.</p>
      <button onClick={() => router.push("/patient/appointments")} className="mt-4 text-sm text-blue-600 underline">
        Retour à mes rendez-vous
      </button>
    </div>
  )

  const doctorName = appt.doctor.doctorProfile
    ? `Dr ${appt.doctor.doctorProfile.firstName} ${appt.doctor.doctorProfile.lastName}`
    : "Médecin"
  const fee = appt.doctor.doctorProfile?.consultationFee ?? 0

  return (
    <div className="mx-auto max-w-md">
      <button onClick={() => router.push("/patient/appointments")}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Payer la consultation</h1>

      {/* Récapitulatif */}
      <div className="mb-6 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Médecin</span>
          <span className="font-medium">{doctorName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Date / Heure</span>
          <span className="font-medium">
            {new Date(appt.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            {" à "}
            {new Date(appt.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
          <span>Montant à payer</span>
          <span className="text-blue-700 text-base">{formatXAF(fee)}</span>
        </div>
      </div>

      {/* Note */}
      <div className="mb-5 flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 p-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <p className="text-xs text-green-800">
          Votre rendez-vous est <strong>approuvé</strong>. Le paiement confirme définitivement votre consultation.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Moyens de paiement */}
      <div className="space-y-2">
        {([
          { value: "MTN_MONEY"    as const, label: "MTN Mobile Money", color: "text-yellow-600", bg: "bg-yellow-50" },
          { value: "AIRTEL_MONEY" as const, label: "Airtel Money",      color: "text-red-600",    bg: "bg-red-50" },
          { value: "CARD"         as const, label: "Carte bancaire",    color: "text-blue-600",   bg: "bg-blue-50" },
        ]).map(({ value, label, color, bg }) => (
          <div key={value}>
            <button
              onClick={() => setPayMethod(value)}
              className={cn(
                "w-full rounded-xl border-2 p-3.5 text-left flex items-center gap-3 transition-all",
                payMethod === value
                  ? "border-blue-600 bg-blue-50 light-surface"
                  : "border-gray-200 bg-white hover:border-blue-200"
              )}
            >
              <div className={`rounded-lg p-1.5 ${bg}`}>
                {value === "CARD"
                  ? <CreditCard className={`h-5 w-5 ${color}`} />
                  : <Smartphone className={`h-5 w-5 ${color}`} />
                }
              </div>
              <span className="text-sm font-medium text-gray-900">{label}</span>
              {payMethod === value && <Check className="ml-auto h-4 w-4 text-blue-600" />}
            </button>
            {payMethod === value && (value === "MTN_MONEY" || value === "AIRTEL_MONEY") && (
              <div className="mt-2 px-1">
                <input
                  type="tel"
                  placeholder="+242XXXXXXXXX"
                  value={payPhone}
                  onChange={e => setPayPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={pay}
        disabled={loading || !payMethod}
        className="mt-6 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading
          ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Traitement...</span>
          : `Payer ${formatXAF(fee)}`
        }
      </button>
    </div>
  )
}
