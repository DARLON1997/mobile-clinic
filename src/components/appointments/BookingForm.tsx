"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Doctor {
  id:              string
  firstName:       string
  lastName:        string
  speciality:      string
  consultationFee: number
}

interface BookingFormProps {
  doctors: Doctor[]
}

export function BookingForm({ doctors }: BookingFormProps) {
  const router = useRouter()
  const [doctorId, setDoctorId] = useState("")
  const [date, setDate]         = useState("")
  const [time, setTime]         = useState("")
  const [reason, setReason]     = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!doctorId || !date || !time || !reason) {
      setError("Veuillez remplir tous les champs obligatoires.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString()

      const res = await fetch("/api/appointments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ doctorId, scheduledAt, reason }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la réservation.")

      router.push("/patient/appointments?booked=true")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Médecin */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Médecin *</label>
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className={cn(
            "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
          )}
          required
        >
          <option value="">— Sélectionner un médecin —</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              Dr {d.firstName} {d.lastName} — {d.speciality} ({d.consultationFee.toLocaleString()} XAF)
            </option>
          ))}
        </select>
      </div>

      {/* Date et heure */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input label="Heure *" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>

      {/* Motif */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Motif de consultation *</label>
        <textarea
          className={cn(
            "min-h-[80px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
          )}
          placeholder="Décrivez brièvement votre motif de consultation…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={5}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" loading={loading} className="w-full">
        Soumettre la demande de RDV
      </Button>
    </form>
  )
}
