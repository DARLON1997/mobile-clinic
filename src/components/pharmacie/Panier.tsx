"use client"

import { useState, createContext, useContext, useCallback } from "react"
import { ShoppingCart, X, Minus, Plus, Trash2, MapPin, Truck, Loader2 } from "lucide-react"
import { cn, formatXAF } from "@/lib/utils"

export type CartItem = {
  medicamentId:  string
  pharmacieId:   string
  pharmacieNom:  string
  nom:           string
  formeGalenique: string
  prix:          number
  quantite:      number
  ordonnanceRequise: boolean
}

type PanierCtx = {
  items:      CartItem[]
  addItem:    (item: Omit<CartItem, "quantite">) => void
  removeItem: (medicamentId: string) => void
  updateQty:  (medicamentId: string, delta: number) => void
  clear:      () => void
  total:      number
}

const PanierContext = createContext<PanierCtx>({
  items: [], addItem: () => {}, removeItem: () => {}, updateQty: () => {}, clear: () => {}, total: 0,
})

export function PanierProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((item: Omit<CartItem, "quantite">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.medicamentId === item.medicamentId)
      if (existing) return prev.map((i) => i.medicamentId === item.medicamentId ? { ...i, quantite: i.quantite + 1 } : i)

      // Vérifier pharmacie différente
      if (prev.length > 0 && prev[0].pharmacieId !== item.pharmacieId) {
        const ok = window.confirm(
          `Votre panier contient des médicaments de "${prev[0].pharmacieNom}".\nVider le panier pour commander chez "${item.pharmacieNom}" ?`
        )
        if (!ok) return prev
        return [{ ...item, quantite: 1 }]
      }

      return [...prev, { ...item, quantite: 1 }]
    })
  }, [])

  const removeItem = useCallback((medicamentId: string) => {
    setItems((prev) => prev.filter((i) => i.medicamentId !== medicamentId))
  }, [])

  const updateQty = useCallback((medicamentId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => i.medicamentId === medicamentId ? { ...i, quantite: i.quantite + delta } : i)
        .filter((i) => i.quantite > 0)
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const total = items.reduce((s, i) => s + i.prix * i.quantite, 0)

  return (
    <PanierContext.Provider value={{ items, addItem, removeItem, updateQty, clear, total }}>
      {children}
    </PanierContext.Provider>
  )
}

export function usePanier() {
  return useContext(PanierContext)
}

const FRAIS_LIVRAISON = 1500

export function PanierWidget() {
  const { items, removeItem, updateQty, clear, total } = usePanier()
  const [open,      setOpen]      = useState(false)
  const [livraison, setLivraison] = useState<"CLICK_AND_COLLECT" | "LIVRAISON_DOMICILE">("CLICK_AND_COLLECT")
  const [adresse,   setAdresse]   = useState("")
  const [ordering,  setOrdering]  = useState(false)
  const [error,     setError]     = useState("")

  const montantLivraison = livraison === "LIVRAISON_DOMICILE" ? FRAIS_LIVRAISON : 0
  const totalAvecLivraison = total + montantLivraison
  const needsOrdonnance = items.some((i) => i.ordonnanceRequise)

  async function commander() {
    if (livraison === "LIVRAISON_DOMICILE" && !adresse.trim()) {
      setError("Veuillez saisir votre adresse de livraison.")
      return
    }
    setOrdering(true); setError("")
    const res = await fetch("/api/pharmacies/commandes", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        pharmacieId:      items[0]?.pharmacieId,
        typeLivraison:    livraison,
        lignes:           items.map((i) => ({ medicamentId: i.medicamentId, quantite: i.quantite })),
        adresseLivraison: adresse || undefined,
      }),
    })
    const json = await res.json()
    setOrdering(false)
    if (!res.ok) { setError(json.error ?? "Erreur"); return }
    clear(); setOpen(false)
    alert(`Commande passée ! Total : ${formatXAF(json.data?.montantTotal ?? 0)}`)
  }

  if (items.length === 0 && !open) return null

  return (
    <>
      {/* Bouton flottant */}
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#C8906A] text-white shadow-lg hover:bg-[#b07a58] transition-transform hover:scale-105">
        <ShoppingCart className="h-6 w-6" />
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
            {items.reduce((s, i) => s + i.quantite, 0)}
          </span>
        )}
      </button>

      {/* Panneau panier */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div>
                <h2 className="font-bold text-gray-900">Mon panier</h2>
                {items.length > 0 && (
                  <p className="text-xs text-gray-500">{items[0].pharmacieNom}</p>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Votre panier est vide.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.medicamentId} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.nom}</p>
                        <p className="text-xs text-gray-400">{item.formeGalenique} · {formatXAF(item.prix)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateQty(item.medicamentId, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantite}</span>
                        <button onClick={() => updateQty(item.medicamentId, +1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">
                          <Plus className="h-3 w-3" />
                        </button>
                        <button onClick={() => removeItem(item.medicamentId)} className="ml-1 text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-gray-100 p-4 space-y-3">
                {/* Options livraison */}
                <div className="space-y-2">
                  {([
                    { value: "CLICK_AND_COLLECT",  label: "Retrait en pharmacie", desc: "Gratuit", icon: MapPin },
                    { value: "LIVRAISON_DOMICILE",  label: "Livraison à domicile", desc: `+${formatXAF(FRAIS_LIVRAISON)}`, icon: Truck },
                  ] as const).map(({ value, label, desc, icon: Icon }) => (
                    <button key={value} onClick={() => setLivraison(value)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all",
                        livraison === value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                      )}>
                      <Icon className={cn("h-4 w-4 shrink-0", livraison === value ? "text-blue-600" : "text-gray-400")} />
                      <span className="flex-1 font-medium text-gray-900">{label}</span>
                      <span className={cn("text-xs font-medium", livraison === value ? "text-blue-600" : "text-gray-500")}>{desc}</span>
                    </button>
                  ))}
                </div>

                {livraison === "LIVRAISON_DOMICILE" && (
                  <input type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Votre adresse de livraison"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                )}

                {needsOrdonnance && (
                  <p className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-xs text-orange-700">
                    Certains médicaments nécessitent une ordonnance. Elle vous sera demandée à la livraison ou au retrait.
                  </p>
                )}

                {error && <p className="text-xs text-red-600">{error}</p>}

                {/* Total */}
                <div className="space-y-1 border-t border-gray-100 pt-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Sous-total</span>
                    <span>{formatXAF(total)}</span>
                  </div>
                  {montantLivraison > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Livraison</span>
                      <span>{formatXAF(montantLivraison)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-blue-700">{formatXAF(totalAvecLivraison)}</span>
                  </div>
                </div>

                <button onClick={commander} disabled={ordering}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {ordering ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Commander · {formatXAF(totalAvecLivraison)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
