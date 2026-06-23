"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, X, Eye, EyeOff } from "lucide-react"
import { SPECIALITIES } from "@/lib/specialities"

const ROLES = [
  { value: "CALL_CENTER_AGENT", label: "Agent Call Center" },
  { value: "MEDECIN",           label: "Médecin" },
  { value: "AGENT_TERRAIN",     label: "Agent Terrain" },
] as const

type Role = typeof ROLES[number]["value"]

export function CreateUserModal() {
  const router = useRouter()
  const [open,         setOpen]         = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState(false)

  const [form, setForm] = useState({
    email: "", password: "", phone: "", role: "CALL_CENTER_AGENT" as Role,
    firstName: "", lastName: "", speciality: "GENERALISTE", licenseNumber: "", consultationFee: "",
  })

  function reset() {
    setForm({ email: "", password: "", phone: "", role: "CALL_CENTER_AGENT", firstName: "", lastName: "", speciality: "GENERALISTE", licenseNumber: "", consultationFee: "" })
    setError(null)
    setSuccess(false)
  }

  function close() { setOpen(false); reset() }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload: Record<string, string> = { email: form.email, password: form.password, phone: form.phone, role: form.role }
      if (form.role === "MEDECIN") {
        payload.firstName      = form.firstName
        payload.lastName       = form.lastName
        payload.speciality     = form.speciality
        payload.licenseNumber  = form.licenseNumber
        payload.consultationFee = form.consultationFee
      }
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Erreur inconnue")
      } else {
        setSuccess(true)
        router.refresh()
        setTimeout(() => close(), 1500)
      }
    } catch {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-[#C8906A] px-4 py-2 text-sm font-medium text-[#0A0A0A] hover:bg-[#E8B49A] transition-colors"
      >
        <UserPlus className="h-4 w-4" />
        Créer un compte
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F] p-6 shadow-2xl">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Créer un compte</h2>
                <p className="text-xs text-[#666666] mt-0.5">Ajouter un agent ou un médecin</p>
              </div>
              <button onClick={close} className="text-[#666666] hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <UserPlus className="h-6 w-6 text-green-400" />
                </div>
                <p className="font-medium text-white">Compte créé avec succès !</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {/* Rôle */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Rôle</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: r.value }))}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                          form.role === r.value
                            ? "border-[#C8906A] bg-[rgba(200,144,106,0.12)] text-[#C8906A]"
                            : "border-[#2A2A2A] text-[#666666] hover:border-[#444444] hover:text-[#AAAAAA]"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white placeholder-[#444444] focus:border-[#C8906A] focus:outline-none"
                    placeholder="exemple@email.com"
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Téléphone</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white placeholder-[#444444] focus:border-[#C8906A] focus:outline-none"
                    placeholder="+242060000000"
                  />
                </div>

                {/* Champs spécifiques Médecin */}
                {form.role === "MEDECIN" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Prénom</label>
                        <input
                          type="text" required
                          value={form.firstName}
                          onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                          className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white placeholder-[#444444] focus:border-[#C8906A] focus:outline-none"
                          placeholder="Jean"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Nom</label>
                        <input
                          type="text" required
                          value={form.lastName}
                          onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                          className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white placeholder-[#444444] focus:border-[#C8906A] focus:outline-none"
                          placeholder="Dupont"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Spécialité</label>
                      <select
                        required
                        value={form.speciality}
                        onChange={e => setForm(f => ({ ...f, speciality: e.target.value }))}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white focus:border-[#C8906A] focus:outline-none"
                      >
                        {SPECIALITIES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">N° de licence</label>
                        <input
                          type="text" required
                          value={form.licenseNumber}
                          onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                          className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white placeholder-[#444444] focus:border-[#C8906A] focus:outline-none"
                          placeholder="MED-2024-001"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Tarif (FCFA)</label>
                        <input
                          type="number" required min={0}
                          value={form.consultationFee}
                          onChange={e => setForm(f => ({ ...f, consultationFee: e.target.value }))}
                          className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white placeholder-[#444444] focus:border-[#C8906A] focus:outline-none"
                          placeholder="15000"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Mot de passe */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 pr-10 text-sm text-white placeholder-[#444444] focus:border-[#C8906A] focus:outline-none"
                      placeholder="Minimum 8 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#AAAAAA]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Erreur */}
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-xl border border-[#2A2A2A] py-2.5 text-sm font-medium text-[#AAAAAA] hover:border-[#444444] hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-[#C8906A] py-2.5 text-sm font-medium text-[#0A0A0A] hover:bg-[#E8B49A] disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Création..." : "Créer le compte"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
