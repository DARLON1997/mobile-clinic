"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatXAF } from "@/lib/utils"
import type { PaymentMethod } from "@/types"
import { cn } from "@/lib/utils"

const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "MTN_MONEY",    label: "MTN Mobile Money",    icon: "📱" },
  { value: "AIRTEL_MONEY", label: "Airtel Money",        icon: "📲" },
  { value: "CARD",         label: "Carte bancaire",      icon: "💳" },
]

interface PaymentModalProps {
  appointmentId: string
  amount:        number
  onClose:       () => void
  onSuccess:     () => void
}

export function PaymentModal({
  appointmentId,
  amount,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [method, setMethod]   = useState<PaymentMethod>("MTN_MONEY")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  async function handlePay() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, method }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur paiement.")

      // Rediriger vers Flutterwave
      window.location.href = data.paymentLink
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Payer la consultation</h2>
        <p className="mb-5 text-2xl font-bold text-blue-700">{formatXAF(amount)}</p>

        <p className="mb-3 text-sm font-medium text-gray-700">Méthode de paiement</p>
        <div className="mb-5 flex flex-col gap-2">
          {METHODS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors text-left",
                method === value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-700 hover:border-blue-300"
              )}
            >
              <span className="text-xl">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handlePay} loading={loading} className="flex-1">
            Payer maintenant
          </Button>
        </div>
      </div>
    </div>
  )
}
