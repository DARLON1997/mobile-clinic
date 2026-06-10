"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Camera, ShoppingCart, Store, Loader2, MapPin, Phone, Star, Clock, Upload, Package, AlertCircle, CheckCircle } from "lucide-react"
import { cn, formatXAF } from "@/lib/utils"
import { MEDICAMENT_CATEGORIE_LABELS, type MedicamentCategorie, COMMANDE_PHARMACIE_STATUS_LABELS, type CommandePharmacieWithRelations } from "@/types"

type Tab = "recherche" | "ordonnance" | "commandes" | "pharmacies"

interface SearchResult {
  medicament: { nom: string; generique: string | null; categorie: string; formeGalenique: string }
  disponiblesDans: Array<{
    pharmacie: { id: string; nom: string; adresse: string; quartier: string; telephone: string; isOpen: boolean }
    prix: number
    quantite: number
    medicamentId: string
    ordonnanceRequise: boolean
  }>
  totalPharmacies: number
}

interface PharmacieCard {
  id: string; nomPharmacie: string; adresse: string; quartier: string; telephone: string
  horaires: Record<string, { open: string; close: string; closed?: boolean }>
  notesMoyenne: number | null; nombreAvis: number; isVerified: boolean; accepteLivraison: boolean
}

interface OrdonnanceItem {
  id: string; createdAt: string; status: string; ordonnanceUrl: string; ordonnanceType: string
  medicamentsTrouves?: unknown
}

const STATUS_COLOR: Record<string, string> = {
  UPLOADED:       "bg-orange-100 text-orange-700",
  PROCESSING:     "bg-blue-100 text-blue-700",
  FOUND:          "bg-green-100 text-green-700",
  PARTIALLY_FOUND:"bg-amber-100 text-amber-700",
  NOT_FOUND:      "bg-red-100 text-red-700",
  ORDERED:        "bg-[rgba(200,144,106,0.15)] text-[#C8906A]",
}
const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "En cours de traitement", PROCESSING: "Notre équipe cherche...",
  FOUND: "Médicaments trouvés !", PARTIALLY_FOUND: "Partiellement trouvés",
  NOT_FOUND: "Non disponibles", ORDERED: "Commande passée",
}

const TABS: { key: Tab; label: string; icon: typeof Search }[] = [
  { key: "recherche",   label: "Rechercher",   icon: Search },
  { key: "ordonnance",  label: "Mon ordonnance", icon: Camera },
  { key: "commandes",   label: "Mes commandes", icon: ShoppingCart },
  { key: "pharmacies",  label: "Nos pharmacies", icon: Store },
]

const CATEGORIES = Object.entries(MEDICAMENT_CATEGORIE_LABELS) as [MedicamentCategorie, string][]

function isPharmacieOpen(horaires: Record<string, { open: string; close: string; closed?: boolean }>) {
  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  const now   = new Date()
  const jour  = jours[now.getDay()]
  const heure = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  const h = horaires?.[jour]
  return !!(h && !h.closed && heure >= h.open && heure <= h.close)
}

export default function PatientPharmaciePage() {
  const [tab,           setTab]           = useState<Tab>("recherche")
  const [query,         setQuery]         = useState("")
  const [catFilter,     setCatFilter]     = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching,     setSearching]     = useState(false)
  const [pharmacies,    setPharmacies]    = useState<PharmacieCard[]>([])
  const [loadingPharma, setLoadingPharma] = useState(false)
  const [ordonnances,   setOrdonnances]   = useState<OrdonnanceItem[]>([])
  const [loadingOrd,    setLoadingOrd]    = useState(false)
  const [commandes,     setCommandes]     = useState<CommandePharmacieWithRelations[]>([])
  const [loadingCmd,    setLoadingCmd]    = useState(false)
  const [uploadUrl,     setUploadUrl]     = useState("")
  const [uploading,     setUploading]     = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitOk,      setSubmitOk]      = useState(false)
  const [error,         setError]         = useState("")

  const loadPharmacies = useCallback(async () => {
    setLoadingPharma(true)
    const res  = await fetch("/api/pharmacies?isVerified=true")
    const json = await res.json()
    setPharmacies(json.data ?? [])
    setLoadingPharma(false)
  }, [])

  const loadOrdonnances = useCallback(async () => {
    setLoadingOrd(true)
    const res  = await fetch("/api/pharmacies/ordonnances")
    const json = await res.json()
    setOrdonnances(json.data ?? [])
    setLoadingOrd(false)
  }, [])

  const loadCommandes = useCallback(async () => {
    setLoadingCmd(true)
    const res  = await fetch("/api/pharmacies/commandes")
    const json = await res.json()
    setCommandes(json.data ?? [])
    setLoadingCmd(false)
  }, [])

  useEffect(() => {
    if (tab === "pharmacies" && pharmacies.length === 0) loadPharmacies()
    if (tab === "ordonnance") loadOrdonnances()
    if (tab === "commandes")  loadCommandes()
  }, [tab, pharmacies.length, loadPharmacies, loadOrdonnances, loadCommandes])

  async function search() {
    if (query.length < 2) return
    setSearching(true); setError("")
    const params = new URLSearchParams({ q: query })
    if (catFilter) params.set("categorie", catFilter)
    const res  = await fetch(`/api/medicaments/search?${params}`)
    const json = await res.json()
    setSearchResults(json.data ?? [])
    setSearching(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", "ml_default")
    const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`, { method: "POST", body: fd })
    const json = await res.json()
    setUploadUrl(json.secure_url ?? "")
    setUploading(false)
  }

  async function submitOrdonnance() {
    if (!uploadUrl) { setError("Veuillez d'abord importer votre ordonnance."); return }
    setSubmitting(true); setError("")
    const res = await fetch("/api/pharmacies/ordonnances", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ordonnanceUrl: uploadUrl, ordonnanceType: "PHOTO" }),
    })
    setSubmitting(false)
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Erreur"); return }
    setSubmitOk(true); setUploadUrl(""); loadOrdonnances()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pharmacie</h1>
        <p className="text-sm text-gray-500">Recherchez vos médicaments, soumettez votre ordonnance, commandez en ligne.</p>
      </div>

      {/* Onglets */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
              tab === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── ONGLET RECHERCHE ── */}
      {tab === "recherche" && (
        <div>
          <div className="mb-4 flex gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Rechercher un médicament, un générique..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none hidden sm:block">
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={search} disabled={query.length < 2 || searching}
              className="rounded-xl bg-[#C8906A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b07a58] disabled:opacity-50">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          {searching ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" /></div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((result, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{result.medicament.nom}</p>
                      {result.medicament.generique && <p className="text-xs text-gray-500">{result.medicament.generique}</p>}
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{result.medicament.formeGalenique}</span>
                        <span className="text-xs text-gray-400">{result.totalPharmacies} pharmacie{result.totalPharmacies > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {result.disponiblesDans.map((d, j) => (
                      <div key={j} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{d.pharmacie.nom}</p>
                            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", d.pharmacie.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                              {d.pharmacie.isOpen ? "Ouvert" : "Fermé"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{d.pharmacie.quartier} · {d.quantite} unités</p>
                          {d.ordonnanceRequise && <span className="text-[10px] text-orange-600 font-medium">Ordonnance requise</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-blue-700">{formatXAF(d.prix)}</span>
                          <a href={`https://maps.google.com/?q=${encodeURIComponent(d.pharmacie.adresse + " Brazzaville")}`} target="_blank" rel="noreferrer"
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-white">
                            <MapPin className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : query.length > 0 && !searching ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-gray-500">Médicament non trouvé dans nos pharmacies.</p>
              <button onClick={() => setTab("ordonnance")}
                className="mt-3 text-sm text-blue-600 underline">Soumettre mon ordonnance pour recherche</button>
            </div>
          ) : null}
        </div>
      )}

      {/* ── ONGLET ORDONNANCE ── */}
      {tab === "ordonnance" && (
        <div>
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Photographiez ou importez votre ordonnance. Notre équipe recherche vos médicaments dans les pharmacies partenaires.
          </div>

          {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}
          {submitOk && (
            <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Ordonnance envoyée ! Notre équipe vous contactera rapidement.
            </div>
          )}

          {/* Zone upload */}
          <div className="mb-5 rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center hover:border-blue-400 transition-colors">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" />
                <p className="text-sm text-gray-500">Téléchargement en cours...</p>
              </div>
            ) : uploadUrl ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <p className="text-sm font-medium text-green-700">Ordonnance importée</p>
                <button onClick={() => setUploadUrl("")} className="text-xs text-gray-400 underline">Changer</button>
              </div>
            ) : (
              <>
                <Camera className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-700">Prenez une photo ou importez</p>
                <p className="text-xs text-gray-400 mt-1">Formats acceptés : JPG, PNG, PDF</p>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#C8906A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b07a58]">
                  <Upload className="h-4 w-4" />
                  Importer une ordonnance
                  <input type="file" accept="image/*,application/pdf" onChange={handleUpload} className="sr-only" />
                </label>
              </>
            )}
          </div>

          {uploadUrl && (
            <button onClick={submitOrdonnance} disabled={submitting}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 mb-6">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Envoyer pour recherche
            </button>
          )}

          {/* Historique ordonnances */}
          <h2 className="mb-3 font-semibold text-gray-900">Mes demandes</h2>
          {loadingOrd ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#C8906A]" /></div>
          ) : ordonnances.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune demande pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {ordonnances.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.ordonnanceType}</p>
                    <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS_COLOR[o.status])}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET COMMANDES ── */}
      {tab === "commandes" && (
        <div>
          {loadingCmd ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" /></div>
          ) : commandes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-gray-400">Aucune commande pour le moment.</p>
              <button onClick={() => setTab("pharmacies")} className="mt-3 text-sm text-blue-600 underline">
                Voir nos pharmacies
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {commandes.map((cmd) => (
                <div key={cmd.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{cmd.pharmacie.nomPharmacie}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cmd.lignes.length} médicament{cmd.lignes.length > 1 ? "s" : ""} · {formatXAF(cmd.montantTotal)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                          cmd.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                          cmd.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {COMMANDE_PHARMACIE_STATUS_LABELS[cmd.status]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {cmd.typeLivraison === "LIVRAISON_DOMICILE" ? "🚗 Livraison" : "🏪 Retrait"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">{new Date(cmd.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ONGLET PHARMACIES ── */}
      {tab === "pharmacies" && (
        <div>
          {loadingPharma ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" /></div>
          ) : pharmacies.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Aucune pharmacie partenaire pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {pharmacies.map((p) => {
                const ouvert = isPharmacieOpen(p.horaires)
                return (
                  <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{p.nomPharmacie}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", ouvert ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                            {ouvert ? "Ouvert" : "Fermé"}
                          </span>
                          {p.isVerified && <span className="text-[10px] text-blue-600 font-medium">✓ Vérifié</span>}
                          {p.accepteLivraison && <span className="text-[10px] text-purple-600 font-medium">🚗 Livraison</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{p.adresse} · {p.quartier}</p>
                        {p.notesMoyenne && p.notesMoyenne > 0 ? (
                          <div className="mt-1 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-medium text-gray-700">{Number(p.notesMoyenne).toFixed(1)}</span>
                            <span className="text-xs text-gray-400">({p.nombreAvis} avis)</span>
                          </div>
                        ) : null}
                      </div>
                      <a href={`tel:${p.telephone}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 shrink-0">
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
