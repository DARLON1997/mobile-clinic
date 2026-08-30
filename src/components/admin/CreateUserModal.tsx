"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { UserPlus, X, Eye, EyeOff } from "lucide-react"
import { SPECIALITIES } from "@/lib/specialities"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { BaseUserSchema, DoctorUserSchema } from "@/lib/validation/create-user"

const ROLES = [
  { value: "CALL_CENTER_AGENT", label: "Agent Call Center" },
  { value: "MEDECIN",           label: "Médecin" },
  { value: "AGENT_TERRAIN",     label: "Agent Terrain" },
] as const

type Role = typeof ROLES[number]["value"]
// Superset (DoctorUserSchema étend BaseUserSchema) : un seul type de
// formulaire, le schéma de validation réel est choisi dynamiquement selon
// le rôle sélectionné (voir `resolver` ci-dessous) — audit M1, mêmes
// schémas que l'API (src/lib/validation/create-user.ts), pas de duplication.
type FormData = z.input<typeof DoctorUserSchema>

export function CreateUserModal() {
  const router = useRouter()
  const [open,         setOpen]         = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState(false)

  const {
    register, handleSubmit, watch, setValue, reset: resetForm,
    formState: { errors },
  } = useForm<FormData>({
    // Schéma choisi dynamiquement selon le rôle — TFieldValues (le superset
    // DoctorUserSchema) rend les deux branches équivalentes à l'exécution ;
    // le cast règle uniquement la variance de type entre les deux resolvers.
    resolver: ((values, context, options) =>
      (values.role === "MEDECIN" ? zodResolver(DoctorUserSchema) : zodResolver(BaseUserSchema))(
        values, context, options as never
      )
    ) as Resolver<FormData>,
    defaultValues: {
      email: "", password: "", phone: "", role: "CALL_CENTER_AGENT",
      firstName: "", lastName: "", speciality: "GENERALISTE", licenseNumber: "", consultationFee: undefined,
    },
  })

  const role = watch("role")

  function reset() {
    resetForm()
    setError(null)
    setSuccess(false)
  }

  function close() { setOpen(false); reset() }

  async function submit(data: FormData) {
    setError(null)
    setLoading(true)
    try {
      const payload: Record<string, string> = { email: data.email, password: data.password, phone: data.phone, role: data.role }
      if (data.role === "MEDECIN") {
        payload.firstName       = data.firstName ?? ""
        payload.lastName        = data.lastName ?? ""
        payload.speciality      = data.speciality ?? ""
        payload.licenseNumber   = data.licenseNumber ?? ""
        payload.consultationFee = String(data.consultationFee ?? "")
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

      <Modal
        open={open}
        onClose={close}
        labelledBy="create-user-modal-title"
        className="flex items-center justify-center"
        panelClassName="relative z-10 w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F] p-6 shadow-2xl"
      >
        <>
            {/* En-tête */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="create-user-modal-title" className="text-lg font-semibold text-white">Créer un compte</h2>
                <p className="text-xs text-[#666666] mt-0.5">Ajouter un agent ou un médecin</p>
              </div>
              <button onClick={close} aria-label="Fermer" className="text-[#666666] hover:text-white transition-colors">
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
              <form onSubmit={handleSubmit(submit)} className="space-y-4">
                {/* Rôle */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Rôle</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setValue("role", r.value as Role)}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                          role === r.value
                            ? "border-[#C8906A] bg-[rgba(200,144,106,0.12)] text-[#C8906A]"
                            : "border-[#2A2A2A] text-[#666666] hover:border-[#444444] hover:text-[#AAAAAA]"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Email" type="email" placeholder="exemple@email.com"
                  error={errors.email?.message}
                  {...register("email")} />

                <Input label="Téléphone" type="tel" placeholder="+242060000000"
                  error={errors.phone?.message}
                  {...register("phone")} />

                {/* Champs spécifiques Médecin */}
                {role === "MEDECIN" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Prénom" placeholder="Jean"
                        error={errors.firstName?.message}
                        {...register("firstName")} />
                      <Input label="Nom" placeholder="Dupont"
                        error={errors.lastName?.message}
                        {...register("lastName")} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#AAAAAA]">Spécialité</label>
                      <select
                        {...register("speciality")}
                        className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 text-sm text-white focus:border-[#C8906A] focus:outline-none"
                      >
                        {SPECIALITIES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      {errors.speciality && <p className="mt-1 text-xs text-[#E85454]">{errors.speciality.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="N° de licence" placeholder="MED-2024-001"
                        error={errors.licenseNumber?.message}
                        {...register("licenseNumber")} />
                      <Input label="Tarif (FCFA)" type="number" min={0} placeholder="15000"
                        error={errors.consultationFee?.message}
                        {...register("consultationFee")} />
                    </div>
                  </>
                )}

                {/* Mot de passe */}
                <div className="relative">
                  <Input label="Mot de passe" type={showPassword ? "text" : "password"} placeholder="Minimum 8 caractères"
                    error={errors.password?.message}
                    {...register("password")} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-3 top-8 text-[#666666] hover:text-[#AAAAAA]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Erreur */}
                {error && (
                  <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
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
        </>
      </Modal>
    </>
  )
}
