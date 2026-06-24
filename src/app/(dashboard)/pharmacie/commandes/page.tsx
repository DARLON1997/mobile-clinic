"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { formatXAF } from "@/lib/utils"
import { Loader2, Package, Eye, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CommandePharmacieStatus, CommandePharmacieWithRelations } from "@/types"

const TABS: { key: string; label: string }[] = [
  { key: "",              label: "Toutes" },
  { key: "PENDING",       label: "En attente" },
  { key: "PREPARING",     label: "En préparation" },
  { key: "READY_PICKUP",  label: "Prêtes" },
  { key: "DELIVERED",     label: "Livrées" },
  { key: "CANCELLED",     label: "Annulées" },
]

const STATUS_COLOR: Record<string, string> = {
  PENDING:          "bg-orange-100 text-orange-700",
  CONFIRMED:        "bg-blue-100 text-blue-700",
  PREPARING:        "bg-amber-100 text-amber-700",
  READY_PICKUP:     "bg-green-100 text-green-700",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-700",
  DELIVERED:        "bg-green-100 text-green-700",
  CANCELLED:        "bg-red-100 text-red-700",
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente", CONFIRMED: "Confirmée", PREPARING: "En préparation",
  READY_PICKUP: "Prête", OUT_FOR_DELIVERY: "En livraison", DELIVERED: "Livrée", CANCELLED: "Annulée",
}

export default function PharmacieCommandesPage() {
  const queryClient = useQueryClient()
  const [tab,      setTab]     = useState("")
  const [updating, setUpdating] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error,    setError]   = useState("")

  const { data: commandes = [], isLoading: loading } = useQuery<CommandePharmacieWithRelations[]>({
    queryKey: ["pharmacie-commandes", tab],
    queryFn:  async () => {
      const res  = await fetch("/api/pharmacies/commandes")
      const json = await res.json()
      let data: CommandePharmacieWithRelations[] = json.data ?? []
      if (tab) data = data.filter((c) => c.status === tab)
      return data
    },
  })

  async function updateStatus(commandeId: string, status: CommandePharmacieStatus) {
    setUpdating(commandeId)
    setError("")
    const res  = await fetch(`/api/pharmacies/commandes/${commandeId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    })
    setUpdating(null)
    if (!res.ok) { setError("Erreur lors de la mise à jour."); return }
    queryClient.invalidateQueries({ queryKey: ["pharmacie-commandes"] })
  }

  const NEXT_ACTIONS: Record<string, { status: CommandePharmacieStatus; label: string; color: string }[]> = {
    PENDING:      [{ status: "CONFIRMED",        label: "✅ Confirmer",           color: "bg-green-600 hover:bg-green-700 text-white" }],
    CONFIRMED:    [{ status: "PREPARING",         label: "🔄 Mettre en préparation", color: "bg-blue-600 hover:bg-blue-700 text-white" }],
    PREPARING:    [
      { status: "READY_PICKUP",     label: "✅ Prête (retrait)",    color: "bg-green-600 hover:bg-green-700 text-white" },
      { status: "OUT_FOR_DELIVERY", label: "🚗 Envoyer en livraison", color: "bg-purple-600 hover:bg-purple-700 text-white" },
    ],
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes commandes</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Onglets */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
            )}
          >{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#C8906A]" /></div>
      ) : commandes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-gray-400">Aucune commande dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commandes.map((cmd) => {
            const client = cmd.patient.patientProfile
              ? `${cmd.patient.patientProfile.firstName} ${cmd.patient.patientProfile.lastName}`
              : "Patient"
            const actions = NEXT_ACTIONS[cmd.status] ?? []
            const isExpanded = expanded === cmd.id

            return (
              <div key={cmd.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {/* En-tête */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{client}</p>
                      <span className="text-xs text-gray-400">·</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLOR[cmd.status])}>
                        {STATUS_LABEL[cmd.status]}
                      </span>
                      <span className="text-xs text-gray-400">{cmd.typeLivraison === "LIVRAISON_DOMICILE" ? "🚗 Livraison" : "🏪 Retrait"}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {cmd.lignes.length} médicament{cmd.lignes.length > 1 ? "s" : ""} · {formatXAF(cmd.montantTotal)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {actions.map((a) => (
                      <button key={a.status}
                        disabled={updating === cmd.id}
                        onClick={() => updateStatus(cmd.id, a.status)}
                        className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50", a.color)}
                      >
                        {updating === cmd.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : a.label}
                      </button>
                    ))}
                    <button onClick={() => setExpanded(isExpanded ? null : cmd.id)}
                      className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
                      {isExpanded ? <ChevronDown className="h-4 w-4 rotate-180" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Détail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 text-sm">
                    <p className="mb-2 font-medium text-gray-700">Médicaments :</p>
                    <div className="space-y-1 mb-3">
                      {cmd.lignes.map((l, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-600">{l.medicament.nomMedicament} × {l.quantite}</span>
                          <span className="font-medium">{formatXAF(l.sousTotal)}</span>
                        </div>
                      ))}
                      {cmd.montantLivraison > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>Frais de livraison</span>
                          <span>{formatXAF(cmd.montantLivraison)}</span>
                        </div>
                      )}
                    </div>
                    {cmd.adresseLivraison && (
                      <p className="text-gray-500"><span className="font-medium">Adresse :</span> {cmd.adresseLivraison}</p>
                    )}
                    {cmd.patient.phone && (
                      <p className="text-gray-500"><span className="font-medium">Tél :</span> {cmd.patient.phone}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
