"use client"

import Link from "next/link"
import { Video, RefreshCw, CalendarPlus } from "lucide-react"
import { useState } from "react"

export type SerializedAppointment = {
  id:           string
  scheduledAt:  string   // ISO string — sérialisé par le Server Component
  status:       string
  doctor: {
    doctorProfile: {
      firstName:  string
      lastName:   string
      speciality: string
    } | null
  }
} | null

interface Props {
  appt: SerializedAppointment
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    hour:    "2-digit",
    minute:  "2-digit",
  })
}

export function NextAppointmentCard({ appt }: Props) {
  const [refreshing, setRefreshing] = useState(false)

  if (!appt) {
    return (
      <div
        className="mb-5 flex items-center justify-between rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, #C8906A, #E8B49A)" }}
      >
        <div>
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-black/60">
            Mon prochain rendez-vous
          </p>
          <p className="text-[16px] font-bold text-black">Aucun rendez-vous prévu</p>
        </div>
        <Link href="/patient/book">
          <button className="rounded-xl bg-black/15 px-4 py-2 text-[12px] font-bold text-black backdrop-blur-sm transition-opacity active:opacity-70">
            Prendre RDV
          </button>
        </Link>
      </div>
    )
  }

  const now    = new Date()
  const apptAt = new Date(appt.scheduledAt)
  const isVideoActive =
    appt.status === "CONFIRMED" &&
    now >= new Date(apptAt.getTime() - 5 * 60 * 1000) &&
    now <= new Date(apptAt.getTime() + 60 * 60 * 1000)

  const minutesLeft = Math.max(0, Math.ceil((apptAt.getTime() - now.getTime()) / 60000))

  const doctorName = appt.doctor.doctorProfile
    ? `Dr ${appt.doctor.doctorProfile.firstName} ${appt.doctor.doctorProfile.lastName}`
    : "Médecin"

  return (
    <div
      className="mb-5 rounded-2xl p-5"
      style={{ background: "linear-gradient(135deg, #C8906A, #E8B49A)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-black/60">
          Mon prochain rendez-vous
        </p>
        <button
          aria-label="Rafraîchir"
          onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800) }}
          className="rounded-full p-1 transition-opacity active:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
            style={{ color: "rgba(0,0,0,0.5)" }}
          />
        </button>
      </div>

      <p className="mb-0.5 text-[18px] font-bold text-black">{doctorName}</p>
      {appt.doctor.doctorProfile && (
        <p className="mb-1 text-[12px] text-black/60">{appt.doctor.doctorProfile.speciality}</p>
      )}
      <p className="mb-3 text-[13px] font-medium text-black/80">{formatDate(appt.scheduledAt)}</p>

      {appt.status === "CONFIRMED" && minutesLeft <= 60 && (
        <p className="mb-3 text-[12px] font-semibold text-black/70">
          {minutesLeft < 1 ? "Commence dans moins d'1 min" : `Dans ${minutesLeft} minutes`}
        </p>
      )}

      <div className="flex gap-2">
        {appt.status === "CONFIRMED" && (
          <Link href={`/patient/consultation/${appt.id}`}>
            <button
              disabled={!isVideoActive}
              className="flex items-center gap-1.5 rounded-xl bg-black/20 px-4 py-2 text-[12px] font-bold text-black backdrop-blur-sm transition-opacity disabled:opacity-40 active:opacity-70"
            >
              <Video size={14} />
              {isVideoActive ? "Rejoindre" : "Bientôt disponible"}
            </button>
          </Link>
        )}
        {appt.status === "PAYMENT_PENDING" && (
          <Link href="/patient/appointments">
            <button className="rounded-xl bg-black/20 px-4 py-2 text-[12px] font-bold text-black backdrop-blur-sm transition-opacity active:opacity-70">
              Payer maintenant
            </button>
          </Link>
        )}
        <Link href="/patient/appointments">
          <button className="rounded-xl bg-black/10 px-4 py-2 text-[12px] font-medium text-black/70 active:opacity-70">
            Voir tous mes RDV
          </button>
        </Link>
      </div>
    </div>
  )
}
