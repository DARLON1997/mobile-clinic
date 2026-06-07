"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { CheckCircle, XCircle, Trash2, RefreshCw, ShieldCheck, Loader2, AlertTriangle } from "lucide-react"

const SPECIALITY_LABELS: Record<string, string> = {
  GENERALISTE:   "Généraliste",
  CARDIOLOGUE:   "Cardiologue",
  DERMATOLOGUE:  "Dermatologue",
  PEDIATRE:      "Pédiatre",
  GYNECOLOGUE:   "Gynécologue",
  OPHTALMOLOGUE: "Ophtalmologue",
  PSYCHIATRE:    "Psychiatre",
  NEUROLOGUE:    "Neurologue",
  ORTHOPEDIE:    "Orthopédiste",
  AUTRE:         "Autre",
}

type Doctor = {
  id: string
  email: string
  isActive: boolean
  createdAt: string
  doctorProfile: {
    id: string
    firstName: string
    lastName: string
    speciality: string
    licenseNumber: string
    consultationFee: number
    isVerifiedByAdmin: boolean
    avatarUrl: string | null
  } | null
}

type ConfirmDialog = {
  open: boolean
  action: "suspend" | "reactivate" | "delete" | "verify" | null
  doctorId: string
  doctorName: string
}

function formatXAF(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(n)
}

export default function DoctorsPage() {
  const [doctors,  setDoctors]  = useState<Doctor[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState<string | null>(null)
  const [toast,    setToast]    = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [confirm,  setConfirm]  = useState<ConfirmDialog>({ open: false, action: null, doctorId: "", doctorName: "" })

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/doctors-list")
      const json = await res.json()
      setDoctors(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function runAction(action: "suspend" | "reactivate" | "delete" | "verify", doctorId: string) {
    setBusy(doctorId)
    setConfirm({ open: false, action: null, doctorId: "", doctorName: "" })
    try {
      let res: Response
      if (action === "verify") {
        res = await fetch(`/api/admin/doctors/${doctorId}/verify`, { method: "POST" })
      } else if (action === "delete") {
        res = await fetch(`/api/admin/users/${doctorId}/delete`, { method: "DELETE" })
      } else {
        res = await fetch(`/api/admin/users/${doctorId}/${action}`, { method: "POST" })
      }
      if (!res.ok) {
        const json = await res.json()
        showToast(json.error ?? "Erreur", "err")
      } else {
        showToast(
          action === "verify"     ? "Médecin vérifié ✓"     :
          action === "suspend"    ? "Médecin suspendu"       :
          action === "reactivate" ? "Médecin réactivé ✓"    :
          "Médecin supprimé",
          "ok"
        )
        await load()
      }
    } catch {
      showToast("Erreur réseau", "err")
    } finally {
      setBusy(null)
    }
  }

  function askConfirm(action: ConfirmDialog["action"], doc: Doctor) {
    const name = doc.doctorProfile
      ? `Dr ${doc.doctorProfile.firstName} ${doc.doctorProfile.lastName}`
      : doc.email
    setConfirm({ open: true, action, doctorId: doc.id, doctorName: name })
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-5 top-5 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
          toast.type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Modal de confirmation */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F] p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-white">
                {confirm.action === "delete"     ? "Supprimer ce médecin ?"  :
                 confirm.action === "suspend"    ? "Suspendre ce médecin ?"  :
                 confirm.action === "reactivate" ? "Réactiver ce médecin ?"  :
                 "Valider ce médecin ?"}
              </h3>
            </div>
            <p className="mb-5 text-sm text-[#AAAAAA]">
              {confirm.action === "delete"
                ? `${confirm.doctorName} et toutes ses données seront supprimés définitivement.`
                : confirm.action === "suspend"
                ? `${confirm.doctorName} ne pourra plus accéder à la plateforme.`
                : confirm.action === "reactivate"
                ? `${confirm.doctorName} retrouvera accès à la plateforme.`
                : `${confirm.doctorName} sera visible par les patients.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(c => ({ ...c, open: false }))}
                className="flex-1 rounded-xl border border-[#2A2A2A] py-2.5 text-sm text-[#AAAAAA] hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => confirm.action && runAction(confirm.action, confirm.doctorId)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
                  confirm.action === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : confirm.action === "verify" || confirm.action === "reactivate"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des médecins</h1>
          <p className="mt-0.5 text-sm text-[#666666]">{doctors.length} médecin{doctors.length > 1 ? "s" : ""} enregistré{doctors.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] px-3 py-2 text-xs text-[#AAAAAA] hover:text-white transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#C8906A]" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#444444]">Aucun médecin enregistré.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-[10px] font-semibold uppercase tracking-wider text-[#555555]">
                <th className="px-5 py-3.5 text-left">Médecin</th>
                <th className="px-5 py-3.5 text-left">Spécialité</th>
                <th className="px-5 py-3.5 text-left">Tarif</th>
                <th className="px-5 py-3.5 text-left">Statut</th>
                <th className="px-5 py-3.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {doctors.map((doc) => {
                const dp      = doc.doctorProfile
                const isBusy  = busy === doc.id
                return (
                  <tr key={doc.id} className="hover:bg-[#141414] transition-colors">
                    {/* Médecin */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {dp?.avatarUrl ? (
                          <Image src={dp.avatarUrl} alt="" width={36} height={36}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-[#2A2A2A]" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] ring-1 ring-[rgba(200,144,106,0.2)] text-xs font-bold text-[#C8906A]">
                            {dp ? `${dp.firstName.charAt(0)}${dp.lastName.charAt(0)}` : "?"}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">
                            {dp ? `Dr ${dp.firstName} ${dp.lastName}` : "—"}
                          </p>
                          <p className="text-xs text-[#555555]">{doc.email}</p>
                          {dp && <p className="text-[10px] text-[#444444]">Licence : {dp.licenseNumber}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Spécialité */}
                    <td className="px-5 py-4 text-[#AAAAAA]">
                      {dp ? SPECIALITY_LABELS[dp.speciality] ?? dp.speciality : "—"}
                    </td>

                    {/* Tarif */}
                    <td className="px-5 py-4 text-[#AAAAAA]">
                      {dp ? formatXAF(dp.consultationFee) : "—"}
                    </td>

                    {/* Statut */}
                    <td className="px-5 py-4">
                      {!dp ? (
                        <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-400">
                          Profil incomplet
                        </span>
                      ) : !dp.isVerifiedByAdmin ? (
                        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-400">
                          En attente
                        </span>
                      ) : doc.isActive ? (
                        <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-medium text-green-400">
                          Vérifié · Actif
                        </span>
                      ) : (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-400">
                          Suspendu
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#C8906A]" />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {/* Valider */}
                          {dp && !dp.isVerifiedByAdmin && (
                            <button
                              onClick={() => askConfirm("verify", doc)}
                              title="Valider le médecin"
                              className="flex items-center gap-1 rounded-lg bg-green-600/10 border border-green-500/30 px-2.5 py-1.5 text-[11px] font-medium text-green-400 hover:bg-green-600/20 transition-colors"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Valider
                            </button>
                          )}

                          {/* Suspendre / Réactiver */}
                          {dp && dp.isVerifiedByAdmin && (
                            doc.isActive ? (
                              <button
                                onClick={() => askConfirm("suspend", doc)}
                                title="Suspendre"
                                className="flex items-center gap-1 rounded-lg bg-orange-600/10 border border-orange-500/30 px-2.5 py-1.5 text-[11px] font-medium text-orange-400 hover:bg-orange-600/20 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Suspendre
                              </button>
                            ) : (
                              <button
                                onClick={() => askConfirm("reactivate", doc)}
                                title="Réactiver"
                                className="flex items-center gap-1 rounded-lg bg-blue-600/10 border border-blue-500/30 px-2.5 py-1.5 text-[11px] font-medium text-blue-400 hover:bg-blue-600/20 transition-colors"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Réactiver
                              </button>
                            )
                          )}

                          {/* Supprimer */}
                          <button
                            onClick={() => askConfirm("delete", doc)}
                            title="Supprimer définitivement"
                            className="flex items-center gap-1 rounded-lg bg-red-600/10 border border-red-500/30 px-2.5 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-600/20 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
