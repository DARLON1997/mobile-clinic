"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { CalendrierRDV } from "@/components/presentiel/CalendrierRDV"
import { formatDate, formatXAF } from "@/lib/utils"
import { Check, CalendarDays, MapPin, Clock } from "lucide-react"
import type { BookPresentielInput, CabinetMedecin } from "@/types"

interface DoctorOption {
  id: string
  firstName: string
  lastName: string
  speciality: string
  consultationFee: number
  cabinet?: CabinetMedecin | null
}

const DURATIONS = [15, 30, 45, 60] as const

export default function PresentielPage() {
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null)
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null)
  const [duration, setDuration] = useState<typeof DURATIONS[number]>(30)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await fetch("/api/doctors")
        if (!res.ok) return
        const json = await res.json()
        const mapped = (json.data ?? []).map((item: any) => ({
          id: item.id,
          firstName: item.doctorProfile?.firstName ?? "",
          lastName: item.doctorProfile?.lastName ?? "",
          speciality: item.doctorProfile?.speciality ?? "",
          consultationFee: item.doctorProfile?.consultationFee ?? 0,
          cabinet: item.cabinet ?? null,
        }))
        setDoctors(mapped)
        if (mapped.length > 0) setSelectedDoctor(mapped[0])
      } catch {
        // ignore
      }
    }
    fetchDoctors()
  }, [])

  useEffect(() => {
    setSelectedDateTime(null)
  }, [selectedDoctor])

  async function submit() {
    setError("")
    if (!selectedDoctor) {
      setError("Sélectionnez un médecin.")
      return
    }
    if (!selectedDoctor.cabinet) {
      setError("Le médecin choisi n'a pas de cabinet référencé.")
      return
    }
    if (!selectedDateTime) {
      setError("Choisissez d'abord un créneau.")
      return
    }
    if (!reason.trim() || reason.trim().length < 10) {
      setError("Le motif doit contenir au moins 10 caractères.")
      return
    }

    setLoading(true)

    const body: BookPresentielInput = {
      doctorId: selectedDoctor.id,
      cabinetId: selectedDoctor.cabinet.id,
      scheduledAt: selectedDateTime.toISOString(),
      duration,
      reason: reason.trim(),
    }

    try {
      const res = await fetch("/api/presentiel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de la réservation.")
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur serveur.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Votre demande de présentiel est bien enregistrée</h1>
        <p className="mt-3 text-sm text-gray-500">
          Nous vous contacterons dès que le cabinet confirme le créneau. Vous pouvez suivre l&apos;évolution dans "Mes RDV".
        </p>
        <Button onClick={() => window.location.assign("/patient/appointments")} className="mt-6">
          Voir mes rendez-vous
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Consultation en présentiel</p>
            <p className="text-sm text-gray-500">Réservez un cabinet avec un médecin validé.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            <CalendarDays className="h-4 w-4" /> Présentiel
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Médecin</p>
            <select
              value={selectedDoctor?.id ?? ""}
              onChange={(event) => {
                const selected = doctors.find((doc) => doc.id === event.target.value)
                setSelectedDoctor(selected ?? null)
              }}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr {doctor.firstName} {doctor.lastName} — {doctor.speciality}
                </option>
              ))}
            </select>
          </div>

          {selectedDoctor && (
            <div className="space-y-3 rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">Cabinet</p>
                  <p className="mt-1 text-xs text-gray-500">{selectedDoctor.cabinet ? selectedDoctor.cabinet.name : "Aucun cabinet référencé."}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {selectedDoctor.cabinet ? selectedDoctor.cabinet.city : ""}
                </div>
              </div>
              {selectedDoctor.cabinet && (
                <div className="space-y-1 text-sm text-gray-500">
                  <p>{selectedDoctor.cabinet.address}</p>
                  <p className="flex items-center gap-2 text-xs text-gray-400"><MapPin className="h-3.5 w-3.5" /> {selectedDoctor.cabinet.phone}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Durée</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDuration(value)}
                  className={`rounded-2xl border px-4 py-2 text-sm transition ${duration === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}
                >
                  {value} min
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Motif</p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={5}
              placeholder="Expliquez brièvement le motif de la consultation"
              className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          {selectedDoctor ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Choisir le créneau</p>
                  <p className="text-sm text-gray-500">Tous les jours de 07h00 à 21h00 sont possibles.</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  Tarif estimé
                  <p className="font-semibold text-gray-900">{formatXAF(selectedDoctor.consultationFee)}</p>
                </div>
              </div>
              <CalendrierRDV doctorId={selectedDoctor.id} onDateTimeSelect={setSelectedDateTime} />
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              Sélectionnez d&apos;abord un médecin pour choisir un créneau.
            </div>
          )}

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">Résumé</p>
            <p className="mt-2">Médecin : {selectedDoctor ? `Dr ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : "Aucun"}</p>
            <p>Cabinet : {selectedDoctor?.cabinet?.name ?? "Aucun"}</p>
            <p>Créneau : {selectedDateTime ? formatDate(selectedDateTime) : "Aucun"}</p>
            <p>Durée : {duration} min</p>
          </div>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <Button onClick={submit} disabled={loading} className="w-full py-4">
            {loading ? "Réservation en cours…" : "Envoyer la demande"}
          </Button>
        </div>
      </div>
    </div>
  )
}
