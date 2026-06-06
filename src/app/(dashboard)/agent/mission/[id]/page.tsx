"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { HomeVisitStatusBadge } from "@/components/shared/StatusBadge"
import { ArrowLeft, MapPin, User, Clock, Camera, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type Mission = {
  id: string; type: string; status: string; address: string; city: string
  scheduledAt: string; reason: string; notes: string | null; reportText: string | null
  patient: {
    phone: string | null
    patientProfile: { firstName: string; lastName: string; address: string; bloodType: string | null } | null
  }
}

export default function MissionDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const [mission,      setMission]      = useState<Mission | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [reportText,   setReportText]   = useState("")
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState("")
  const [done,         setDone]         = useState(false)

  useEffect(() => {
    fetch(`/api/home-visits/${id}`)
      .then((r) => r.json())
      .then((j) => {
        setMission(j.data)
        setReportText(j.data?.reportText ?? "")
        setLoading(false)
      })
  }, [id])

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    if (!reportText.trim()) {
      setError("Le rapport de mission est obligatoire.")
      return
    }
    setSubmitting(true)
    setError("")

    let photoUrl: string | undefined

    if (photoFile) {
      const fd = new FormData()
      fd.append("file", photoFile)
      fd.append("folder", "mission-photos")
      const upRes  = await fetch("/api/upload", { method: "POST", body: fd })
      const upJson = await upRes.json()
      if (!upRes.ok) {
        setError(upJson.error ?? "Erreur upload photo.")
        setSubmitting(false)
        return
      }
      photoUrl = upJson.url
    }

    const res = await fetch("/api/home-visits", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeVisitId: id, status: "COMPLETED", reportText: reportText.trim(), photoUrl }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? "Erreur serveur.")
      setSubmitting(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push("/agent"), 2000)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  )

  if (!mission) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Mission introuvable.</p>
      <Link href="/agent" className="text-sm text-blue-600 hover:underline">Retour</Link>
    </div>
  )

  const patientName = mission.patient.patientProfile
    ? `${mission.patient.patientProfile.firstName} ${mission.patient.patientProfile.lastName}`
    : "Patient"
  const hour    = new Date(mission.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  const dateStr = new Date(mission.scheduledAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/agent" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Détail mission</p>
        </div>
        <HomeVisitStatusBadge status={mission.status as Parameters<typeof HomeVisitStatusBadge>[0]["status"]} />
      </header>

      <main className="px-4 py-4 space-y-4">
        {done && (
          <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-5 w-5 shrink-0" />
            Mission clôturée avec succès. Retour en cours...
          </div>
        )}

        {/* Infos mission */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className={`-mx-4 -mt-4 mb-3 rounded-t-2xl px-4 py-2 ${mission.type === "CARE" ? "bg-blue-50" : "bg-purple-50"}`}>
            <span className={`text-xs font-semibold ${mission.type === "CARE" ? "text-blue-700" : "text-purple-700"}`}>
              {mission.type === "CARE" ? "SOIN À DOMICILE" : "PRÉLÈVEMENT"}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="font-semibold text-gray-900">{patientName}</span>
              {mission.patient.patientProfile?.bloodType && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                  {mission.patient.patientProfile.bloodType}
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-gray-700">{mission.address}, {mission.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-gray-600 capitalize">{dateStr} à {hour}</span>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <p className="text-xs font-medium text-gray-500 mb-0.5">Motif</p>
            <p className="text-gray-800">{mission.reason}</p>
          </div>

          {mission.notes && (
            <div className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
              📝 {mission.notes}
            </div>
          )}

          {mission.patient.phone && (
            <a href={`tel:${mission.patient.phone}`}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              📞 Appeler le patient
            </a>
          )}

          {mission.status !== "COMPLETED" && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mission.address}, ${mission.city}, Congo`)}`}
              target="_blank" rel="noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm text-blue-700 hover:bg-blue-100"
            >
              <MapPin className="h-4 w-4" /> Ouvrir dans Google Maps
            </a>
          )}
        </div>

        {/* Rapport */}
        {(mission.status === "ARRIVED" || mission.status === "COMPLETED") && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              {mission.status === "COMPLETED" ? "Rapport soumis" : "Rédiger le rapport de mission"}
            </h2>

            {mission.status === "COMPLETED" ? (
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                {mission.reportText}
              </div>
            ) : (
              <form onSubmit={submitReport} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">Rapport *</label>
                  <textarea rows={5}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Soins effectués, état du patient, observations..."
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Photo de confirmation (optionnel)
                  </label>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="preview" className="h-32 w-full rounded-lg object-cover" />
                    ) : (
                      <>
                        <Camera className="h-6 w-6" />
                        <span className="text-xs">Prendre ou sélectionner une photo</span>
                      </>
                    )}
                    <input type="file" accept="image/jpeg,image/png" className="hidden"
                      onChange={handlePhoto} capture="environment" />
                  </label>
                  {photoFile && <p className="mt-1 text-xs text-green-600">{photoFile.name}</p>}
                </div>

                <Button type="submit" loading={submitting} size="lg" className="w-full">
                  <CheckCircle className="h-4 w-4" /> Clôturer la mission
                </Button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
