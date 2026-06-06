"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { VideoRoom } from "@/components/video/VideoRoom"
import { MedicalRecord } from "@/components/medical/MedicalRecord"
import { PrescriptionForm } from "@/components/medical/PrescriptionForm"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"

type PatientProfile = {
  firstName: string; lastName: string; dateOfBirth: string
  bloodType: string | null; medicalHistory: string | null
  allergies: string | null; gender?: string | null
  address?: string | null; city?: string | null
}

type AppointmentData = {
  id: string; scheduledAt: string; videoRoomUrl: string | null; videoRoomName: string | null
  status: string; reason: string
  patient: { id: string; email: string; patientProfile: PatientProfile | null }
}

export default function ConsultationPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const [appt,   setAppt]   = useState<AppointmentData | null>(null)
  const [token,  setToken]  = useState<string | null>(null)
  const [error,  setError]  = useState("")
  const [loading, setLoading] = useState(true)
  const [tab,    setTab]    = useState<"record" | "prescription">("record")
  const [endModal, setEndModal] = useState(false)

  useEffect(() => {
    async function init() {
      // 1. Récupérer les infos du RDV
      const apptRes = await fetch(`/api/appointments/${id}`)
      if (!apptRes.ok) { setError("Rendez-vous non trouvé ou accès refusé."); setLoading(false); return }
      const apptJson = await apptRes.json()
      setAppt(apptJson.data)

      // 2. Obtenir le token vidéo (R1 + R2 vérifiés côté serveur)
      const tokenRes = await fetch("/api/video/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      })
      const tokenJson = await tokenRes.json()
      if (!tokenRes.ok) {
        setError(tokenJson.error ?? "Accès vidéo non disponible.")
        setLoading(false)
        return
      }
      setToken(tokenJson.token)
      setLoading(false)
    }
    init()
  }, [id])

  async function endConsultation() {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    })
    router.push("/doctor/appointments")
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )

  if (error) return (
    <div className="mx-auto mt-20 max-w-md rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
      <p className="font-semibold text-red-700">{error}</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>
        Retour
      </Button>
    </div>
  )

  const patientName = appt?.patient.patientProfile
    ? `${appt.patient.patientProfile.firstName} ${appt.patient.patientProfile.lastName}`
    : appt?.patient.email ?? "Patient"

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Consultation — {patientName}</h1>
        <Button variant="danger" size="sm" onClick={() => setEndModal(true)}>
          Terminer la consultation
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Salle vidéo */}
        <div className="h-[500px] overflow-hidden rounded-2xl bg-gray-900">
          {appt?.videoRoomUrl && token ? (
            <VideoRoom
              roomUrl={appt.videoRoomUrl}
              token={token}
              onLeave={() => setEndModal(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              <p className="text-sm">Salle vidéo non encore active.</p>
            </div>
          )}
        </div>

        {/* Dossier + Ordonnance */}
        <div className="flex flex-col">
          {/* Onglets */}
          <div className="mb-4 flex rounded-lg border border-gray-200 bg-white p-1">
            {[
              { key: "record" as const, label: "Dossier patient" },
              { key: "prescription" as const, label: "Ordonnance" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  tab === key ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[440px]">
            {tab === "record" && appt?.patient.patientProfile ? (
              <MedicalRecord
                profile={{
                  dateOfBirth:    new Date(appt.patient.patientProfile.dateOfBirth),
                  bloodType:      appt.patient.patientProfile.bloodType,
                  gender:         null,
                  allergies:      appt.patient.patientProfile.allergies,
                  medicalHistory: appt.patient.patientProfile.medicalHistory,
                  address:        null,
                  city:           null,
                }}
                patientName={patientName}
              />
            ) : tab === "record" ? (
              <p className="text-sm text-gray-400">Dossier médical non complété par le patient.</p>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <PrescriptionForm
                  appointmentId={id}
                  patientName={patientName}
                  onSaved={() => {}}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal fin consultation */}
      {endModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-semibold text-gray-900">Terminer la consultation ?</h2>
            <p className="mb-4 text-sm text-gray-500">
              Cette action marquera le rendez-vous comme terminé.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setEndModal(false)}>
                Retour pour rédiger
              </Button>
              <Button variant="danger" className="flex-1" onClick={endConsultation}>
                Terminer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
