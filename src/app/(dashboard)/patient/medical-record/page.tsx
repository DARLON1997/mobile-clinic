"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { Check, Edit2, User, HeartPulse, AlertTriangle, History } from "lucide-react"
import { formatDate } from "@/lib/utils"

type Profile = {
  id: string; firstName: string; lastName: string
  dateOfBirth: string; gender: string; bloodType: string | null
  address: string; city: string; medicalHistory: string | null
  allergies: string | null; emergencyContact: string | null
}

type Consultation = {
  id: string; createdAt: string; diagnosis: string | null; prescriptionUrl: string | null
  appointment: { scheduledAt: string; doctor: { doctorProfile: { firstName: string; lastName: string } | null } }
}

export default function MedicalRecordPage() {
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [consults, setConsults] = useState<Consultation[]>([])
  const [editing,  setEditing]  = useState<"info" | "medical" | "allergies" | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  // Champs éditables
  const [address,        setAddress]        = useState("")
  const [city,           setCity]           = useState("")
  const [emergencyContact, setEmergency]    = useState("")
  const [medicalHistory, setMedicalHistory] = useState("")
  const [allergies,      setAllergies]      = useState("")

  useEffect(() => {
    fetch("/api/patient/profile").then((r) => r.json()).then((j) => {
      if (j.data) {
        setProfile(j.data)
        setAddress(j.data.address ?? "")
        setCity(j.data.city ?? "")
        setEmergency(j.data.emergencyContact ?? "")
        setMedicalHistory(j.data.medicalHistory ?? "")
        setAllergies(j.data.allergies ?? "")
      }
    })
    fetch("/api/patient/consultations").then((r) => r.json()).then((j) => {
      setConsults(j.data ?? [])
    })
  }, [])

  async function saveField(field: string, value: string) {
    setSaving(true)
    try {
      await fetch("/api/patient/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
      setEditing(null)
    }
  }

  const bloodTypeColors: Record<string, string> = {
    "A+": "bg-red-100 text-red-700",   "A-": "bg-red-50 text-red-600",
    "B+": "bg-blue-100 text-blue-700", "B-": "bg-blue-50 text-blue-600",
    "AB+": "bg-purple-100 text-purple-700", "AB-": "bg-purple-50 text-purple-600",
    "O+": "bg-green-100 text-green-700", "O-": "bg-green-50 text-green-600",
  }

  if (!profile) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  )

  const allergyList = allergies.split(",").map((a) => a.trim()).filter(Boolean)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mon dossier médical</h1>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" /> Enregistré
          </span>
        )}
      </div>

      {/* Section 1 — Informations personnelles */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Informations personnelles</h2>
          </div>
          {editing !== "info" && (
            <button onClick={() => setEditing("info")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Modifier
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-gray-400">Nom complet</p>
            <p className="font-medium text-gray-900">{profile.firstName} {profile.lastName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Date de naissance</p>
            <p className="font-medium text-gray-900">
              {new Date(profile.dateOfBirth).toLocaleDateString("fr-FR")}
            </p>
          </div>
          {profile.bloodType && (
            <div>
              <p className="text-xs text-gray-400">Groupe sanguin</p>
              <span className={`mt-0.5 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${bloodTypeColors[profile.bloodType] ?? "bg-gray-100"}`}>
                {profile.bloodType}
              </span>
            </div>
          )}

          {editing === "info" ? (
            <>
              <div className="sm:col-span-2">
                <Input label="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input label="Contact d'urgence" value={emergencyContact} onChange={(e) => setEmergency(e.target.value)} />
              <div className="sm:col-span-2 flex gap-2">
                <Button size="sm" loading={saving}
                  onClick={async () => {
                    await saveField("address", address)
                    await saveField("city", city)
                    await saveField("emergencyContact", emergencyContact)
                  }}>
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-gray-400">Adresse</p>
                <p className="font-medium text-gray-900">{profile.address}, {profile.city}</p>
              </div>
              {profile.emergencyContact && (
                <div>
                  <p className="text-xs text-gray-400">Contact d&apos;urgence</p>
                  <p className="font-medium text-gray-900">{profile.emergencyContact}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Section 2 — Antécédents médicaux */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-gray-900">Antécédents médicaux</h2>
          </div>
          {editing !== "medical" && (
            <button onClick={() => setEditing("medical")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Modifier
            </button>
          )}
        </div>

        {editing === "medical" ? (
          <div className="space-y-3">
            <textarea rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Ex : Diabète type 2, hypertension..."
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" loading={saving} onClick={() => saveField("medicalHistory", medicalHistory)}>
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {profile.medicalHistory || <span className="text-gray-300 italic">Aucun antécédent renseigné</span>}
          </p>
        )}
      </div>

      {/* Section 3 — Allergies */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-900">Allergies</h2>
          </div>
          {editing !== "allergies" && (
            <button onClick={() => setEditing("allergies")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Modifier
            </button>
          )}
        </div>

        {editing === "allergies" ? (
          <div className="space-y-3">
            <textarea rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Séparez par des virgules : Pénicilline, Arachides..."
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" loading={saving} onClick={() => saveField("allergies", allergies)}>
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            </div>
          </div>
        ) : allergyList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allergyList.map((a) => (
              <span key={a} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 border border-orange-200">
                {a}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-300 italic">Aucune allergie renseignée</p>
        )}
      </div>

      {/* Section 4 — Historique consultations */}
      {consults.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Historique des consultations</h2>
          </div>
          <div className="space-y-2">
            {consults.map((c) => {
              const dp = c.appointment.doctor.doctorProfile
              return (
                <div key={c.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {dp ? `Dr ${dp.firstName} ${dp.lastName}` : "Médecin"}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(c.appointment.scheduledAt)}</p>
                    {c.diagnosis && <p className="text-xs text-gray-500 mt-0.5">{c.diagnosis}</p>}
                  </div>
                  {c.prescriptionUrl && (
                    <a href={c.prescriptionUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline">
                      Ordonnance PDF
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
