"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Video, RefreshCw } from "lucide-react"
import { getPusherClient } from "@/lib/pusher-client"
import { useSession } from "next-auth/react"

type Appt = {
  id: string
  scheduledAt: string
  status: string
  patient: {
    email: string
    patientProfile: { firstName: string; lastName: string } | null
  }
}

export function ActiveConsultationBanner() {
  const { data: session } = useSession()
  const [active, setActive] = useState<Appt[]>([])
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments?activeNow=true&limit=20", { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      setActive(json.data as Appt[])
      setLastRefresh(Date.now())
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => {
    poll()
    // Fallback polling réduit (2 min) — Pusher est la source principale
    const id = setInterval(poll, 120_000)
    return () => clearInterval(id)
  }, [poll])

  // Pusher : déclenché quand un RDV passe CONFIRMED ou IN_PROGRESS
  useEffect(() => {
    if (!session?.user?.id) return
    const pusher = getPusherClient()
    if (!pusher) return
    const ch = pusher.subscribe(`private-doctor-${session.user.id}`)
    ch.bind("appointment-status-changed", () => poll())
    ch.bind("consultation-active-changed", () => poll())
    return () => { pusher.unsubscribe(`private-doctor-${session.user.id}`) }
  }, [session?.user?.id, poll])

  if (active.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border-2 border-green-400 bg-green-50 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-3 w-3 animate-ping rounded-full bg-green-500" />
          <span className="font-semibold text-green-800 text-sm">
            {active.length === 1 ? "Patient en attente" : `${active.length} patients en attente`}
          </span>
        </div>
        <button
          onClick={poll}
          title="Actualiser"
          className="text-green-600 hover:text-green-800"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {active.map((appt) => {
          const name = appt.patient.patientProfile
            ? `${appt.patient.patientProfile.firstName} ${appt.patient.patientProfile.lastName}`
            : appt.patient.email

          const diff = Math.round((new Date(appt.scheduledAt).getTime() - Date.now()) / 60000)
          const timeLabel = diff > 0 ? `dans ${diff} min` : diff === 0 ? "maintenant" : `depuis ${-diff} min`

          return (
            <div key={appt.id} className="flex items-center justify-between rounded-xl bg-white border border-green-200 px-4 py-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">{name}</p>
                <p className="text-xs text-green-600">{timeLabel}</p>
              </div>
              <Link href={`/doctor/consultation/${appt.id}`}>
                <button className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 active:scale-95 transition-transform">
                  <Video className="h-3.5 w-3.5" />
                  Rejoindre
                </button>
              </Link>
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-green-600 text-right">
        Mis à jour il y a{" "}
        {Math.round((Date.now() - lastRefresh) / 1000) < 5 ? "quelques secondes" : `${Math.round((Date.now() - lastRefresh) / 1000)}s`}
      </p>
    </div>
  )
}
