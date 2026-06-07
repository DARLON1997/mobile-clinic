"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { VideoRoom } from "@/components/video/VideoRoom"
import { Video, Clock, AlertTriangle, Loader2, PhoneOff, User } from "lucide-react"

type AppointmentInfo = {
  id: string
  scheduledAt: string
  status: string
  reason: string
  videoRoomUrl: string | null
  videoRoomName: string | null
  doctor: {
    email: string
    doctorProfile: { firstName: string; lastName: string; speciality: string } | null
  }
}

export default function PatientConsultationPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const [appt,    setAppt]    = useState<AppointmentInfo | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(true)
  const [endModal, setEndModal] = useState(false)

  useEffect(() => {
    async function init() {
      // 1. Récupérer les infos du RDV
      const apptRes = await fetch(`/api/appointments/${id}`)
      if (!apptRes.ok) {
        setError("Rendez-vous introuvable ou accès refusé.")
        setLoading(false)
        return
      }
      const apptJson = await apptRes.json()
      setAppt(apptJson.data)

      // 2. Obtenir le token vidéo patient
      const tokenRes = await fetch("/api/video/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      })
      const tokenJson = await tokenRes.json()

      if (!tokenRes.ok) {
        // La salle n'est pas encore ouverte
        if (tokenRes.status === 425) {
          setError(tokenJson.error ?? "La salle n'est pas encore ouverte.")
        } else if (tokenRes.status === 404) {
          setError("La salle vidéo n'a pas encore été créée par l'administrateur.")
        } else {
          setError(tokenJson.error ?? "Accès vidéo non disponible.")
        }
        setLoading(false)
        return
      }

      setToken(tokenJson.token)
      setLoading(false)
    }
    init()
  }, [id])

  function leaveConsultation() {
    router.push("/patient/appointments")
  }

  // --- États d'affichage ---

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#C8906A]" />
        <p className="text-sm text-[#AAAAAA]">Connexion à la salle…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="mx-auto mt-20 max-w-md">
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F] p-8 text-center">
        {error.includes("n'est pas encore ouverte") || error.includes("pas encore créée") ? (
          <>
            <Clock className="mx-auto mb-4 h-12 w-12 text-[#C8906A]" />
            <h2 className="mb-2 text-lg font-semibold text-white">Salle pas encore disponible</h2>
            <p className="text-sm text-[#AAAAAA]">{error}</p>
            {appt && (
              <p className="mt-3 text-sm text-[#C8906A]">
                RDV prévu le {new Date(appt.scheduledAt).toLocaleDateString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long",
                  hour: "2-digit", minute: "2-digit"
                })}
              </p>
            )}
          </>
        ) : (
          <>
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-lg font-semibold text-white">Accès impossible</h2>
            <p className="text-sm text-[#AAAAAA]">{error}</p>
          </>
        )}
        <button
          onClick={() => router.push("/patient/appointments")}
          className="mt-6 rounded-xl border border-[#2A2A2A] px-6 py-2.5 text-sm text-[#AAAAAA] hover:border-[#C8906A] hover:text-white transition-colors"
        >
          Retour à mes RDV
        </button>
      </div>
    </div>
  )

  const doctorName = appt?.doctor.doctorProfile
    ? `Dr ${appt.doctor.doctorProfile.firstName} ${appt.doctor.doctorProfile.lastName}`
    : appt?.doctor.email ?? "Médecin"

  const speciality = appt?.doctor.doctorProfile?.speciality ?? ""

  return (
    <div className="mx-auto max-w-4xl">
      {/* En-tête */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#C8906A] to-[#E8B49A]">
            <User className="h-5 w-5 text-[#0A0A0A]" />
          </div>
          <div>
            <p className="font-semibold text-white">{doctorName}</p>
            <p className="text-xs text-[#666666]">{speciality} · Consultation vidéo</p>
          </div>
        </div>
        <button
          onClick={() => setEndModal(true)}
          className="flex items-center gap-2 rounded-xl bg-red-600/10 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/20 transition-colors"
        >
          <PhoneOff className="h-4 w-4" />
          Quitter
        </button>
      </div>

      {/* Salle vidéo */}
      <div className="h-[560px] overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A]">
        {appt?.videoRoomUrl && token ? (
          <VideoRoom
            roomUrl={appt.videoRoomUrl}
            token={token}
            onLeave={() => setEndModal(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(200,144,106,0.1)] border border-[rgba(200,144,106,0.2)]">
              <Video className="h-7 w-7 text-[#C8906A]" />
            </div>
            <p className="text-sm text-[#666666]">En attente de la salle vidéo…</p>
          </div>
        )}
      </div>

      {/* Infos RDV sous la vidéo */}
      {appt && (
        <div className="mt-4 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4">
          <div className="flex items-center gap-2 text-sm text-[#AAAAAA]">
            <Clock className="h-4 w-4 text-[#C8906A]" />
            <span>
              {new Date(appt.scheduledAt).toLocaleDateString("fr-FR", {
                weekday: "long", day: "numeric", month: "long",
                hour: "2-digit", minute: "2-digit"
              })}
            </span>
            <span className="mx-2 text-[#333333]">·</span>
            <span className="truncate">{appt.reason}</span>
          </div>
        </div>
      )}

      {/* Modal de confirmation de sortie */}
      {endModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F] p-6 shadow-2xl">
            <h2 className="mb-2 text-base font-semibold text-white">Quitter la consultation ?</h2>
            <p className="mb-5 text-sm text-[#666666]">
              Vous allez quitter la salle vidéo. La consultation reste active pour le médecin.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setEndModal(false)}
                className="flex-1 rounded-xl border border-[#2A2A2A] py-2.5 text-sm text-[#AAAAAA] hover:border-[#444444] hover:text-white transition-colors"
              >
                Rester
              </button>
              <button
                onClick={leaveConsultation}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
