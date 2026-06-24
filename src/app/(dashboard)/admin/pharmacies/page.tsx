"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, CheckCircle, PauseCircle, PlayCircle, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "" | "pending" | "verified" | "suspended"

interface PharmacieRow {
  id: string; nomPharmacie: string; quartier: string; telephone: string
  isVerified: boolean; isActive: boolean; userId: string
  _count?: { medicaments: number; commandes: number }
}

const TABS: { key: Tab; label: string }[] = [
  { key: "",          label: "Toutes" },
  { key: "pending",   label: "En attente" },
  { key: "verified",  label: "Vérifiées" },
  { key: "suspended", label: "Suspendues" },
]

export default function AdminPharmaciesPage() {
  const queryClient = useQueryClient()
  const [tab,      setTab]     = useState<Tab>("")
  const [acting,   setActing]  = useState<string | null>(null)
  const [error,    setError]   = useState("")
  const [showAdd,  setShowAdd] = useState(false)
  const [addForm,  setAddForm] = useState({
    email: "", telephone: "", nomPharmacie: "", numeroLicence: "", adresse: "", quartier: "", accepteLivraison: false,
  })
  const [adding,   setAdding]  = useState(false)
  const [addError, setAddError] = useState("")

  const { data: pharmacies = [], isLoading: loading } = useQuery<PharmacieRow[]>({
    queryKey: ["admin-pharmacies", tab],
    queryFn:  async () => {
      const res  = await fetch("/api/pharmacies-admin-list")
      const json = await res.json()
      let data: PharmacieRow[] = json.data ?? []
      if (tab === "pending")   data = data.filter((p) => !p.isVerified && p.isActive)
      if (tab === "verified")  data = data.filter((p) => p.isVerified && p.isActive)
      if (tab === "suspended") data = data.filter((p) => !p.isActive)
      return data
    },
  })

  async function verify(id: string) {
    setActing(id)
    await fetch(`/api/pharmacies/${id}/verify`, { method: "POST" })
    setActing(null)
    queryClient.invalidateQueries({ queryKey: ["admin-pharmacies"] })
  }

  async function suspend(id: string, userId: string) {
    setActing(id)
    await fetch(`/api/admin/users/${userId}/suspend`, { method: "POST" })
    setActing(null)
    queryClient.invalidateQueries({ queryKey: ["admin-pharmacies"] })
  }

  async function reactivate(id: string, userId: string) {
    setActing(id)
    await fetch(`/api/admin/users/${userId}/reactivate`, { method: "POST" })
    setActing(null)
    queryClient.invalidateQueries({ queryKey: ["admin-pharmacies"] })
  }

  async function addPharmacie() {
    setAdding(true); setAddError("")
    const res = await fetch("/api/pharmacies", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(addForm),
    })
    const json = await res.json()
    setAdding(false)
    if (!res.ok) { setAddError(json.error ?? "Erreur"); return }
    setShowAdd(false)
    setAddForm({ email: "", telephone: "", nomPharmacie: "", numeroLicence: "", adresse: "", quartier: "", accepteLivraison: false })
    queryClient.invalidateQueries({ queryKey: ["admin-pharmacies"] })
    alert(`Pharmacie créée ! Mot de passe temporaire : ${json.data?.tempPassword}`)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des pharmacies</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Ajouter une pharmacie
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}

      {/* Onglets */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            )}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" /></div>
      ) : pharmacies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-400">Aucune pharmacie dans cette catégorie.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Pharmacie</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Quartier</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Téléphone</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pharmacies.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nomPharmacie}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.quartier}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.telephone}</td>
                  <td className="px-4 py-3">
                    {!p.isActive ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Suspendue</span>
                    ) : p.isVerified ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Vérifiée</span>
                    ) : (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">En attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!p.isVerified && p.isActive && (
                        <button onClick={() => verify(p.id)} disabled={acting === p.id}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                          {acting === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          Vérifier
                        </button>
                      )}
                      {p.isVerified && p.isActive && (
                        <button onClick={() => suspend(p.id, p.userId)} disabled={acting === p.id}
                          className="flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50">
                          {acting === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}
                          Suspendre
                        </button>
                      )}
                      {!p.isActive && (
                        <button onClick={() => reactivate(p.id, p.userId)} disabled={acting === p.id}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                          {acting === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          Réactiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajouter */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Ajouter une pharmacie</h2>
            {addError && <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{addError}</div>}
            <div className="grid gap-3">
              {[
                { label: "Email *",              key: "email",          type: "email" },
                { label: "Téléphone *",          key: "telephone",      type: "tel" },
                { label: "Nom de la pharmacie *", key: "nomPharmacie",   type: "text" },
                { label: "N° de licence *",       key: "numeroLicence",  type: "text" },
                { label: "Adresse *",             key: "adresse",        type: "text" },
                { label: "Quartier *",            key: "quartier",       type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(addForm as Record<string, unknown>)[key] as string ?? ""}
                    onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="livr" checked={addForm.accepteLivraison}
                  onChange={(e) => setAddForm((f) => ({ ...f, accepteLivraison: e.target.checked }))} className="h-4 w-4" />
                <label htmlFor="livr" className="text-sm text-gray-700">Livraison à domicile</label>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={addPharmacie} disabled={adding}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
