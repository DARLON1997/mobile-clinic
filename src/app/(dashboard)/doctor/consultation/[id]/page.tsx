"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { VideoRoom } from "@/components/video/VideoRoom"
import { Button } from "@/components/ui/button"
import { calculateAge } from "@/lib/date-utils"
import {
  AlertTriangle, Loader2, FileText, Stethoscope,
  Home, Pill, FlaskConical, Camera, CheckCircle2, Plus, X,
} from "lucide-react"

type PatientProfile = {
  firstName: string; lastName: string; dateOfBirth: string
  bloodType: string | null; medicalHistory: string | null
  allergies: string | null; gender?: string | null
}

type AppointmentData = {
  id: string; scheduledAt: string; videoRoomUrl: string | null; videoRoomName: string | null
  status: string; reason: string
  patient: { id: string; email: string; patientProfile: PatientProfile | null }
}

type ExamenPrescrit = {
  id: string; typeExamen: string; instructions: string | null; statut: string
}

type Tab = "notes" | "presentiel" | "prescription" | "examens" | "ordonnance"

const URGENCE_OPTIONS: { value: "EVENTUEL" | "OBLIGATOIRE" | "URGENT"; label: string; color: string; ring: string; pulse?: boolean }[] = [
  { value: "EVENTUEL",    label: "Éventuel",    color: "bg-gray-100 text-gray-700 border-gray-300",      ring: "ring-gray-400" },
  { value: "OBLIGATOIRE", label: "Obligatoire", color: "bg-orange-50 text-orange-700 border-orange-300", ring: "ring-orange-500" },
  { value: "URGENT",      label: "URGENT",      color: "bg-red-50 text-red-700 border-red-300",          ring: "ring-red-500",   pulse: true },
]

const EXAMENS_SUGGESTIONS = [
  "Bilan sanguin complet", "Glycémie à jeun", "Bilan lipidique",
  "Bilan hépatique", "Bilan rénal (créatinine, urée)",
  "NFS (Numération Formule Sanguine)", "Radiographie thorax",
  "Échographie abdominale", "ECG", "Test paludisme (TDR)",
  "Test VIH", "Test de grossesse", "Examen des urines (ECBU)",
]

export default function ConsultationPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [appt,    setAppt]    = useState<AppointmentData | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<Tab>("notes")
  const [endModal, setEndModal] = useState(false)

  // Notes (auto-save)
  const [signes,       setSignes]      = useState("")
  const [hypotheses,   setHypotheses]  = useState("")
  const [prescription, setPrescription] = useState("")
  const [saveStatus,   setSaveStatus]  = useState<"idle" | "saving" | "saved">("idle")

  // Présentiel
  const [urgence,      setUrgence]     = useState<"EVENTUEL" | "OBLIGATOIRE" | "URGENT" | null>(null)
  const [motif,        setMotif]       = useState("")
  const [presentielSent, setPresentielSent] = useState(false)
  const [presentielLoading, setPresentielLoading] = useState(false)

  // Examens
  const [examens,     setExamens]    = useState<ExamenPrescrit[]>([])
  const [newExamen,   setNewExamen]  = useState("")
  const [newInstr,    setNewInstr]   = useState("")
  const [examenLoading, setExamenLoading] = useState(false)

  // Ordonnance photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoSent,    setPhotoSent]   = useState(false)
  const [photoProgress, setPhotoProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-save ref
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const autoSaveInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const consultationId = useRef<string | null>(null)

  useEffect(() => {
    async function init() {
      const apptRes = await fetch(`/api/appointments/${id}`)
      if (!apptRes.ok) { setError("Rendez-vous non trouvé ou accès refusé."); setLoading(false); return }
      const apptJson = await apptRes.json()
      setAppt(apptJson.data)

      const tokenRes = await fetch("/api/video/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      })
      const tokenJson = await tokenRes.json()
      if (!tokenRes.ok) { setError(tokenJson.error ?? "Accès vidéo non disponible."); setLoading(false); return }
      setToken(tokenJson.token)
      setRoomUrl(tokenJson.roomUrl)
      setLoading(false)
    }
    init()
  }, [id])

  // Charger les examens existants
  useEffect(() => {
    if (!consultationId.current) return
    fetch(`/api/examens-prescrits?consultationId=${consultationId.current}`)
      .then(r => r.json())
      .then(j => j.data && setExamens(j.data))
  }, [tab])

  // Auto-save notes toutes les 10s
  useEffect(() => {
    autoSaveInterval.current = setInterval(() => {
      saveNotes()
    }, 10000)
    return () => {
      clearInterval(autoSaveInterval.current)
      clearTimeout(autoSaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signes, hypotheses, prescription])

  const saveNotes = useCallback(async () => {
    if (!signes && !hypotheses && !prescription) return
    setSaveStatus("saving")
    try {
      const res = await fetch("/api/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: id,
          signesSubjectifs: signes || undefined,
          hypothesesDiagnostic: hypotheses || undefined,
          prescriptionTexte: prescription || undefined,
        }),
      })
      const json = await res.json()
      if (json.data?.id) consultationId.current = json.data.id
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch {
      setSaveStatus("idle")
    }
  }, [id, signes, hypotheses, prescription])

  function onNotesChange(setter: (v: string) => void, value: string) {
    setter(value)
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveNotes(), 3000)
  }

  async function sendPresentiel() {
    if (!urgence || !motif.trim()) return
    setPresentielLoading(true)
    try {
      await fetch("/api/consultations/presentiel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id, presentielRecommande: urgence, presentielMotif: motif }),
      })
      setPresentielSent(true)
    } finally {
      setPresentielLoading(false)
    }
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoSent(false)
  }

  async function uploadOrdonnance() {
    if (!photoFile) return
    setPhotoUploading(true)
    setPhotoProgress(20)
    try {
      const fd = new FormData()
      fd.append("file", photoFile)
      fd.append("appointmentId", id)
      setPhotoProgress(60)
      const res = await fetch("/api/consultations/ordonnance-photo", { method: "POST", body: fd })
      setPhotoProgress(100)
      if (res.ok) { setPhotoSent(true) }
    } finally {
      setPhotoUploading(false)
      setTimeout(() => setPhotoProgress(0), 1500)
    }
  }

  async function addExamen() {
    if (!newExamen.trim()) return
    setExamenLoading(true)
    try {
      const res = await fetch("/api/examens-prescrits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id, typeExamen: newExamen.trim(), instructions: newInstr || undefined }),
      })
      const json = await res.json()
      if (json.data) {
        setExamens(prev => [json.data, ...prev])
        if (json.data.consultationId) consultationId.current = json.data.consultationId
        setNewExamen("")
        setNewInstr("")
      }
    } finally {
      setExamenLoading(false)
    }
  }

  async function endConsultation() {
    await saveNotes()
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
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Retour</Button>
    </div>
  )

  const pp = appt?.patient.patientProfile
  const patientName = pp ? `${pp.firstName} ${pp.lastName}` : (appt?.patient.email ?? "Patient")
  const age = pp?.dateOfBirth ? calculateAge(pp.dateOfBirth) : null

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "notes",       label: "Notes",       icon: FileText    },
    { key: "presentiel",  label: "Présentiel",  icon: Home        },
    { key: "prescription",label: "Prescription",icon: Pill        },
    { key: "examens",     label: "Examens",     icon: FlaskConical },
    { key: "ordonnance",  label: "Ordonnance",  icon: Camera      },
  ]

  return (
    <div className="mx-auto max-w-7xl px-2">
      {/* En-tête */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {patientName}{age !== null && <span className="ml-2 text-sm font-normal text-gray-500">{age} ans</span>}
          </h1>
          <p className="text-xs text-gray-400">{appt?.reason}</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && <span className="text-xs text-gray-400 animate-pulse">Sauvegarde…</span>}
          {saveStatus === "saved"  && <span className="text-xs text-green-600">✓ Sauvegardé</span>}
          <Button variant="danger" size="sm" onClick={() => setEndModal(true)}>Terminer</Button>
        </div>
      </div>

      {/* Layout : vidéo à gauche, panneau à droite */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">

        {/* Vidéo */}
        <div className="h-[480px] overflow-hidden rounded-2xl bg-gray-900">
          {roomUrl && token ? (
            <VideoRoom roomUrl={roomUrl} token={token} onLeave={() => setEndModal(true)} />
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              <p className="text-sm">Salle vidéo non encore active.</p>
            </div>
          )}
        </div>

        {/* Panneau dossier */}
        <div className="flex flex-col">

          {/* Onglets */}
          <div className="mb-3 flex rounded-xl border border-gray-200 bg-white p-1 gap-0.5">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                  tab === key ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"
                }`}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4" style={{ maxHeight: 420 }}>

            {/* ── Onglet Notes ── */}
            {tab === "notes" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    <Stethoscope className="mr-1 inline h-3.5 w-3.5" />
                    Signes subjectifs (plaintes du patient)
                  </label>
                  <textarea rows={4}
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Ce que le patient décrit : douleurs, fièvre, durée des symptômes…"
                    value={signes} onChange={e => onNotesChange(setSignes, e.target.value)}
                    onBlur={saveNotes}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Hypothèses diagnostiques</label>
                  <textarea rows={3}
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Pistes diagnostiques envisagées…"
                    value={hypotheses} onChange={e => onNotesChange(setHypotheses, e.target.value)}
                    onBlur={saveNotes}
                  />
                </div>
              </div>
            )}

            {/* ── Onglet Présentiel ── */}
            {tab === "presentiel" && (
              <div className="space-y-4">
                {presentielSent ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <p className="font-semibold text-gray-800">Alerte envoyée au Call Center</p>
                    <p className="text-xs text-gray-400">Le Call Center a été notifié en temps réel.</p>
                    <button className="mt-2 text-xs text-blue-500 underline" onClick={() => { setPresentielSent(false); setUrgence(null); setMotif("") }}>
                      Modifier
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-gray-600">Niveau d'urgence de la visite présentielle :</p>
                    <div className="flex flex-col gap-2">
                      {URGENCE_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setUrgence(opt.value)}
                          className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${opt.color} ${urgence === opt.value ? `ring-2 ${opt.ring} scale-[1.01]` : "opacity-70 hover:opacity-100"} ${opt.pulse && urgence === opt.value ? "animate-pulse" : ""}`}>
                          <span className={`h-3 w-3 rounded-full ${opt.value === "EVENTUEL" ? "bg-gray-500" : opt.value === "OBLIGATOIRE" ? "bg-orange-500" : "bg-red-500"}`} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {urgence && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600">Motif de la visite recommandée</label>
                        <textarea rows={3}
                          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="Pourquoi le patient doit consulter en présentiel…"
                          value={motif} onChange={e => setMotif(e.target.value)}
                        />
                        <Button className="w-full" onClick={sendPresentiel} loading={presentielLoading} disabled={!motif.trim()}>
                          Envoyer l'alerte au Call Center
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Onglet Prescription ── */}
            {tab === "prescription" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  <Pill className="mr-1 inline h-3.5 w-3.5" />
                  Prescription médicale
                </label>
                <textarea rows={12}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder={"Médicament — Dosage — Durée\nEx:\nAmoxicilline 500mg — 3x/jour — 7 jours\nParacétamol 1g — si fièvre > 38°5\n\nRecommandations:\n…"}
                  value={prescription} onChange={e => onNotesChange(setPrescription, e.target.value)}
                  onBlur={saveNotes}
                />
                <p className="mt-1 text-xs text-gray-400">Sauvegarde automatique toutes les 10s</p>
              </div>
            )}

            {/* ── Onglet Examens ── */}
            {tab === "examens" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Visible uniquement par vous et l'Admin.</p>

                {/* Ajouter un examen */}
                <div className="space-y-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/30 p-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Type d'examen</label>
                    <input list="examens-suggestions" value={newExamen}
                      onChange={e => setNewExamen(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                      placeholder="Ex: Bilan sanguin complet"
                    />
                    <datalist id="examens-suggestions">
                      {EXAMENS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Instructions (facultatif)</label>
                    <input value={newInstr} onChange={e => setNewInstr(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                      placeholder="Précisions pour le patient ou le labo"
                    />
                  </div>
                  <Button size="sm" className="w-full gap-1" onClick={addExamen} loading={examenLoading} disabled={!newExamen.trim()}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                </div>

                {/* Liste */}
                {examens.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">Aucun examen prescrit pour cette consultation.</p>
                ) : (
                  <div className="space-y-2">
                    {examens.map(e => (
                      <div key={e.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-800">{e.typeExamen}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            e.statut === "EN_ATTENTE"       ? "bg-amber-100 text-amber-700" :
                            e.statut === "EFFECTUE"         ? "bg-blue-100 text-blue-700"   :
                            "bg-green-100 text-green-700"
                          }`}>{e.statut.replace(/_/g, " ")}</span>
                        </div>
                        {e.instructions && <p className="mt-0.5 text-xs text-gray-500">{e.instructions}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Onglet Ordonnance Photo ── */}
            {tab === "ordonnance" && (
              <div className="space-y-3">
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={onPhotoChange}
                />

                {photoPreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Aperçu ordonnance"
                      className="w-full rounded-xl border border-gray-200 object-contain" style={{ maxHeight: 200 }} />
                    <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); setPhotoSent(false) }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                    <Camera className="h-8 w-8" />
                    <span className="text-sm font-medium">Prendre une photo ou importer</span>
                    <span className="text-xs">JPEG / PNG – 5 Mo max</span>
                  </button>
                )}

                {photoProgress > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${photoProgress}%` }} />
                  </div>
                )}

                {photoSent ? (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Ordonnance envoyée au patient
                  </div>
                ) : (
                  <Button className="w-full" onClick={uploadOrdonnance}
                    loading={photoUploading} disabled={!photoFile || photoUploading}>
                    Envoyer l'ordonnance au patient
                  </Button>
                )}

                {photoPreview && !photoSent && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full text-center text-xs text-blue-500 underline">
                    Changer la photo
                  </button>
                )}
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
              Les notes seront sauvegardées automatiquement avant de quitter.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setEndModal(false)}>
                Retour
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
