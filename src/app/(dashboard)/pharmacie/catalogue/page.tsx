"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Plus, Edit2, Package, AlertTriangle } from "lucide-react"
import { formatXAF } from "@/lib/utils"
import { MEDICAMENT_CATEGORIE_LABELS, type MedicamentCategorie, type MedicamentStockData } from "@/types"
import { cn } from "@/lib/utils"

const CATEGORIES = Object.entries(MEDICAMENT_CATEGORIE_LABELS) as [MedicamentCategorie, string][]

interface ModalState {
  open:  boolean
  mode:  "add" | "edit" | "stock"
  medId?: string
}

const EMPTY_FORM = {
  nomMedicament: "", nomGenerique: "", marque: "", categorie: "ANALGESIQUE" as MedicamentCategorie,
  formeGalenique: "", dosage: "", conditionnement: "", prixUnitaire: 0, quantiteStock: 0,
  stockMinimum: 5, ordonnanceRequise: false,
}

export default function CataloguePage() {
  const [medicaments,   setMedicaments]   = useState<MedicamentStockData[]>([])
  const [loading,       setLoading]       = useState(true)
  const [pharmacieId,   setPharmacieId]   = useState("")
  const [modal,         setModal]         = useState<ModalState>({ open: false, mode: "add" })
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [newStock,      setNewStock]      = useState(0)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState("")
  const [search,        setSearch]        = useState("")
  const [catFilter,     setCatFilter]     = useState("")

  const loadPharmacie = useCallback(async () => {
    setLoading(true)
    const res  = await fetch("/api/pharmacies/dashboard")
    if (!res.ok) { setLoading(false); return }
    // On récupère le pharmacieId depuis le profil
    const meRes  = await fetch("/api/pharmacies?isVerified=false")
    setLoading(false)
  }, [])

  const loadMedicaments = useCallback(async (pid: string) => {
    if (!pid) return
    setLoading(true)
    const params = new URLSearchParams()
    if (search)    params.set("search", search)
    if (catFilter) params.set("categorie", catFilter)
    const res  = await fetch(`/api/pharmacies/${pid}/medicaments?${params}`)
    const json = await res.json()
    setMedicaments(json.data ?? [])
    setLoading(false)
  }, [search, catFilter])

  // Récupérer le pharmacieId du profil connecté
  useEffect(() => {
    fetch("/api/pharmacies/profil-courant").then((r) => r.json()).then((j) => {
      if (j.data?.id) {
        setPharmacieId(j.data.id)
        loadMedicaments(j.data.id)
      }
    }).catch(() => setLoading(false))
  }, [loadMedicaments])

  const openAdd = () => { setForm(EMPTY_FORM); setError(""); setModal({ open: true, mode: "add" }) }
  const openEdit = (med: MedicamentStockData) => {
    setForm({
      nomMedicament: med.nomMedicament, nomGenerique: med.nomGenerique ?? "",
      marque: med.marque ?? "", categorie: med.categorie,
      formeGalenique: med.formeGalenique, dosage: med.dosage ?? "",
      conditionnement: med.conditionnement ?? "", prixUnitaire: med.prixUnitaire,
      quantiteStock: med.quantiteStock, stockMinimum: med.stockMinimum,
      ordonnanceRequise: med.ordonnanceRequise,
    })
    setError("")
    setModal({ open: true, mode: "edit", medId: med.id })
  }
  const openStock = (med: MedicamentStockData) => {
    setNewStock(med.quantiteStock)
    setError("")
    setModal({ open: true, mode: "stock", medId: med.id })
  }

  async function save() {
    setSaving(true); setError("")
    try {
      if (modal.mode === "add") {
        const res = await fetch(`/api/pharmacies/${pharmacieId}/medicaments`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        })
        if (!res.ok) { const j = await res.json(); setError(j.error ?? "Erreur"); setSaving(false); return }
      } else if (modal.mode === "edit") {
        const res = await fetch(`/api/pharmacies/${pharmacieId}/medicaments/${modal.medId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        })
        if (!res.ok) { const j = await res.json(); setError(j.error ?? "Erreur"); setSaving(false); return }
      } else {
        const res = await fetch(`/api/pharmacies/${pharmacieId}/medicaments/${modal.medId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantiteStock: newStock }),
        })
        if (!res.ok) { const j = await res.json(); setError(j.error ?? "Erreur"); setSaving(false); return }
      }
      setModal({ open: false, mode: "add" })
      loadMedicaments(pharmacieId)
    } catch { setError("Erreur réseau.") }
    setSaving(false)
  }

  async function toggleDisponible(med: MedicamentStockData) {
    await fetch(`/api/pharmacies/${pharmacieId}/medicaments/${med.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estDisponible: !med.estDisponible }),
    })
    loadMedicaments(pharmacieId)
  }

  const displayed = medicaments.filter((m) => {
    if (search && !m.nomMedicament.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && m.categorie !== catFilter) return false
    return true
  })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Mon catalogue</h1>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Ajouter un médicament
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex gap-3 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none w-56" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" /></div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-gray-400">Aucun médicament. Ajoutez votre premier médicament.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((med) => {
            const stockOk    = med.quantiteStock > med.stockMinimum
            const stockFaible = med.quantiteStock > 0 && med.quantiteStock <= med.stockMinimum
            const rupture    = med.quantiteStock === 0

            return (
              <div key={med.id} className={cn("rounded-xl border bg-white p-4 shadow-sm", !med.estDisponible && "opacity-60")}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 leading-tight">{med.nomMedicament}</p>
                    {med.nomGenerique && <p className="text-xs text-gray-400">{med.nomGenerique}</p>}
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      {MEDICAMENT_CATEGORIE_LABELS[med.categorie]}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-gray-900">{formatXAF(med.prixUnitaire)}</span>
                    {med.ordonnanceRequise && (
                      <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700">Ordonnance</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3">{med.formeGalenique}{med.dosage ? ` · ${med.dosage}` : ""}</p>

                {/* Indicateur stock */}
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", stockOk ? "bg-green-500" : stockFaible ? "bg-orange-400" : "bg-red-500 animate-pulse")} />
                  <span className={cn("text-xs font-medium", stockOk ? "text-green-700" : stockFaible ? "text-orange-600" : "text-red-600")}>
                    {rupture ? "Rupture de stock" : stockFaible ? `Stock faible (${med.quantiteStock})` : `${med.quantiteStock} unités`}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(med)} className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
                    <Edit2 className="h-3 w-3" /> Modifier
                  </button>
                  <button onClick={() => openStock(med)} className="flex-1 rounded-lg border border-blue-200 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Stock
                  </button>
                  <button onClick={() => toggleDisponible(med)}
                    className={cn("rounded-lg px-2 py-1.5 text-xs font-medium", med.estDisponible ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                    {med.estDisponible ? "En vente" : "Désactivé"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {modal.mode === "add" ? "Ajouter un médicament" : modal.mode === "edit" ? "Modifier le médicament" : "Mettre à jour le stock"}
            </h2>

            {error && <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

            {modal.mode === "stock" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau stock</label>
                <input type="number" min={0} value={newStock} onChange={(e) => setNewStock(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Nom du médicament *", key: "nomMedicament", type: "text" },
                  { label: "Nom générique", key: "nomGenerique", type: "text" },
                  { label: "Marque", key: "marque", type: "text" },
                  { label: "Forme galénique *", key: "formeGalenique", type: "text" },
                  { label: "Dosage", key: "dosage", type: "text" },
                  { label: "Conditionnement", key: "conditionnement", type: "text" },
                  { label: "Prix unitaire (XAF) *", key: "prixUnitaire", type: "number" },
                  { label: "Quantité en stock *", key: "quantiteStock", type: "number" },
                  { label: "Stock minimum (alerte)", key: "stockMinimum", type: "number" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input type={type} value={(form as Record<string, unknown>)[key] as string ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie *</label>
                  <select value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value as MedicamentCategorie }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox" id="ordReq" checked={form.ordonnanceRequise}
                    onChange={(e) => setForm((f) => ({ ...f, ordonnanceRequise: e.target.checked }))} className="h-4 w-4" />
                  <label htmlFor="ordReq" className="text-sm text-gray-700">Ordonnance requise</label>
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setModal({ open: false, mode: "add" })}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
