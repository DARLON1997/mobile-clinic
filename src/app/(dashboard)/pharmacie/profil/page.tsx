"use client"

import { useState, useEffect } from "react"
import { Loader2, Save, MapPin, Phone, Clock } from "lucide-react"

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const
type Jour = typeof JOURS[number]

interface Horaire { open: string; close: string; closed: boolean }
type HorairesData = Record<Jour, Horaire>

const DEFAULT_HORAIRES: HorairesData = {
  lundi:    { open: "08:00", close: "20:00", closed: false },
  mardi:    { open: "08:00", close: "20:00", closed: false },
  mercredi: { open: "08:00", close: "20:00", closed: false },
  jeudi:    { open: "08:00", close: "20:00", closed: false },
  vendredi: { open: "08:00", close: "20:00", closed: false },
  samedi:   { open: "09:00", close: "18:00", closed: false },
  dimanche: { open: "09:00", close: "14:00", closed: true },
}

export default function ProfilPharmaciePage() {
  const [pharmacieId,  setPharmacieId]  = useState("")
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [error,        setError]        = useState("")

  const [form, setForm] = useState({
    nomPharmacie:    "", adresse: "", quartier: "", ville: "Brazzaville",
    telephone: "", email: "", description: "", accepteLivraison: false,
    zoneLivraison: "", latitude: "", longitude: "",
  })
  const [horaires, setHoraires] = useState<HorairesData>(DEFAULT_HORAIRES)

  useEffect(() => {
    fetch("/api/pharmacies/profil-courant").then((r) => r.json()).then((j) => {
      if (j.data) {
        const d = j.data
        setPharmacieId(d.id)
        setForm({
          nomPharmacie:   d.nomPharmacie,
          adresse:        d.adresse,
          quartier:       d.quartier,
          ville:          d.ville,
          telephone:      d.telephone,
          email:          d.email ?? "",
          description:    d.description ?? "",
          accepteLivraison: d.accepteLivraison,
          zoneLivraison:  d.zoneLivraison ?? "",
          latitude:       d.latitude ? String(d.latitude) : "",
          longitude:      d.longitude ? String(d.longitude) : "",
        })
        if (d.horaires) setHoraires(d.horaires as HorairesData)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setError(""); setSuccess(false)
    const res = await fetch(`/api/pharmacies/${pharmacieId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...form,
        horaires,
        latitude:  form.latitude  ? Number(form.latitude)  : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      }),
    })
    setSaving(false)
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Erreur"); return }
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" /></div>

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mon profil</h1>

      {error   && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">Profil mis à jour avec succès.</div>}

      <div className="space-y-6">
        {/* Informations de base */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" /> Informations générales
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Nom de la pharmacie *", key: "nomPharmacie" },
              { label: "Téléphone *",           key: "telephone" },
              { label: "Email",                 key: "email", type: "email" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type={type ?? "text"} value={(form as Record<string, unknown>)[key] as string ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} rows={3}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" /> Adresse
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Adresse complète *",  key: "adresse" },
              { label: "Quartier *",          key: "quartier" },
              { label: "Ville",               key: "ville" },
              { label: "Latitude (GPS)",      key: "latitude" },
              { label: "Longitude (GPS)",     key: "longitude" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input type="text" value={(form as Record<string, unknown>)[key] as string ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input type="checkbox" id="livraison" checked={form.accepteLivraison}
              onChange={(e) => setForm((f) => ({ ...f, accepteLivraison: e.target.checked }))} className="h-4 w-4" />
            <label htmlFor="livraison" className="text-sm font-medium text-gray-700">Livraison à domicile disponible</label>
          </div>
          {form.accepteLivraison && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone de livraison</label>
              <input type="text" value={form.zoneLivraison} placeholder="ex : Centre-ville, Bacongo..."
                onChange={(e) => setForm((f) => ({ ...f, zoneLivraison: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          )}
        </div>

        {/* Horaires */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" /> Horaires d'ouverture
          </h2>
          <div className="space-y-3">
            {JOURS.map((jour) => {
              const h = horaires[jour]
              return (
                <div key={jour} className="flex items-center gap-3">
                  <div className="w-24 flex items-center gap-2">
                    <input type="checkbox" id={`closed-${jour}`} checked={!h.closed}
                      onChange={(e) => setHoraires((p) => ({ ...p, [jour]: { ...p[jour], closed: !e.target.checked } }))} className="h-4 w-4" />
                    <label htmlFor={`closed-${jour}`} className="text-sm font-medium capitalize text-gray-700">{jour}</label>
                  </div>
                  {!h.closed ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={h.open}
                        onChange={(e) => setHoraires((p) => ({ ...p, [jour]: { ...p[jour], open: e.target.value } }))}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none" />
                      <span className="text-gray-400 text-sm">–</span>
                      <input type="time" value={h.close}
                        onChange={(e) => setHoraires((p) => ({ ...p, [jour]: { ...p[jour], close: e.target.value } }))}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none" />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Fermé</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer les modifications
        </button>
      </div>
    </div>
  )
}
