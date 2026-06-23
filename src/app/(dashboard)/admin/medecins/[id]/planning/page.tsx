"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2, Video, Building2 } from "lucide-react"
import { SPECIALITY_LABELS } from "@/lib/specialities"

const JOURS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"] as const
const JOUR_LABELS: Record<string, string> = {
  LUNDI: "Lun", MARDI: "Mar", MERCREDI: "Mer", JEUDI: "Jeu",
  VENDREDI: "Ven", SAMEDI: "Sam", DIMANCHE: "Dim",
}
type Jour = typeof JOURS[number]
type ConsulType = "VIDEO" | "PRESENTIEL"

type Entry = { startTime: string; endTime: string; isActive: boolean }
type Schedule = Record<Jour, Record<ConsulType, Entry>>

const DEFAULT_ENTRY: Entry = { startTime: "08:00", endTime: "18:00", isActive: false }

function buildEmptySchedule(): Schedule {
  return Object.fromEntries(
    JOURS.map((j) => [j, { VIDEO: { ...DEFAULT_ENTRY }, PRESENTIEL: { ...DEFAULT_ENTRY } }])
  ) as Schedule
}

type Doctor = {
  id: string; role: string
  doctorProfile: { firstName: string; lastName: string; speciality: string } | null
}

export default function PlanningPage() {
  const params = useParams()
  const router = useRouter()
  const doctorId = params.id as string

  const [doctor,   setDoctor]   = useState<Doctor | null>(null)
  const [schedule, setSchedule] = useState<Schedule>(buildEmptySchedule())
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/medecins/${doctorId}/planning`)
      const json = await res.json()
      if (!res.ok) { showToast(json.error ?? "Erreur", "err"); return }

      setDoctor(json.doctor)

      const s = buildEmptySchedule()
      for (const row of json.data ?? []) {
        if (s[row.jour as Jour]?.[row.type as ConsulType]) {
          s[row.jour as Jour][row.type as ConsulType] = {
            startTime: row.startTime,
            endTime:   row.endTime,
            isActive:  row.isActive,
          }
        }
      }
      setSchedule(s)
    } catch { showToast("Erreur réseau", "err") }
    finally  { setLoading(false) }
  }, [doctorId])

  useEffect(() => { load() }, [load])

  function updateEntry(jour: Jour, type: ConsulType, field: keyof Entry, value: string | boolean) {
    setSchedule((prev) => ({
      ...prev,
      [jour]: { ...prev[jour], [type]: { ...prev[jour][type], [field]: value } },
    }))
  }

  async function save() {
    setSaving(true)
    const entries = JOURS.flatMap((j) =>
      (["VIDEO", "PRESENTIEL"] as ConsulType[]).map((t) => ({
        jour: j, type: t, ...schedule[j][t],
      }))
    )
    try {
      const res  = await fetch(`/api/admin/medecins/${doctorId}/planning`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ entries }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erreur")
      showToast("Planning enregistré ✓", "ok")
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erreur serveur.", "err")
    } finally {
      setSaving(false)
    }
  }

  const doctorName = doctor?.doctorProfile
    ? `Dr ${doctor.doctorProfile.firstName} ${doctor.doctorProfile.lastName}`
    : "Médecin"
  const speciality = doctor?.doctorProfile
    ? SPECIALITY_LABELS[doctor.doctorProfile.speciality] ?? doctor.doctorProfile.speciality
    : ""

  return (
    <div className="mx-auto max-w-5xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-5 top-5 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="mb-2 flex items-center gap-1 text-sm text-[#666666] hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <h1 className="text-2xl font-bold text-white">Planning hebdomadaire</h1>
          {doctor && (
            <p className="mt-0.5 text-sm text-[#666666]">{doctorName} · {speciality}</p>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#C8906A] px-4 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#E8B49A] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#C8906A]" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-[10px] font-semibold uppercase tracking-wider text-[#555555]">
                <th className="px-4 py-3 text-left w-32">Type</th>
                {JOURS.map((j) => (
                  <th key={j} className="px-3 py-3 text-center">{JOUR_LABELS[j]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["VIDEO", "PRESENTIEL"] as ConsulType[]).map((type) => (
                <tr key={type} className="border-b border-[#1A1A1A] last:border-0">
                  {/* Label */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {type === "VIDEO"
                        ? <Video className="h-4 w-4 text-blue-400" />
                        : <Building2 className="h-4 w-4 text-[#C8906A]" />}
                      <span className="text-xs font-medium text-[#AAAAAA]">
                        {type === "VIDEO" ? "Vidéo" : "Présentiel"}
                      </span>
                    </div>
                  </td>

                  {/* Cellule par jour */}
                  {JOURS.map((jour) => {
                    const entry = schedule[jour][type]
                    return (
                      <td key={jour} className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Toggle actif */}
                          <button
                            onClick={() => updateEntry(jour, type, "isActive", !entry.isActive)}
                            className={`h-5 w-9 rounded-full transition-colors ${
                              entry.isActive ? "bg-green-500" : "bg-[#2A2A2A]"
                            }`}
                          >
                            <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${
                              entry.isActive ? "translate-x-4" : "translate-x-0"
                            }`} />
                          </button>

                          {/* Heures */}
                          {entry.isActive && (
                            <div className="flex flex-col gap-1">
                              <input
                                type="time"
                                value={entry.startTime}
                                onChange={(e) => updateEntry(jour, type, "startTime", e.target.value)}
                                className="w-20 rounded border border-[#2A2A2A] bg-[#1A1A1A] px-1 py-0.5 text-[11px] text-white focus:border-[#C8906A] focus:outline-none"
                              />
                              <input
                                type="time"
                                value={entry.endTime}
                                onChange={(e) => updateEntry(jour, type, "endTime", e.target.value)}
                                className="w-20 rounded border border-[#2A2A2A] bg-[#1A1A1A] px-1 py-0.5 text-[11px] text-white focus:border-[#C8906A] focus:outline-none"
                              />
                            </div>
                          )}
                          {!entry.isActive && (
                            <span className="text-[10px] text-[#444444]">Fermé</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-[#555555]">
        Le planning hebdomadaire détermine quand le médecin apparaît dans les consultations instantanées (Vidéo) et le nouveau parcours patient "Trouver un médecin".
      </p>
    </div>
  )
}
