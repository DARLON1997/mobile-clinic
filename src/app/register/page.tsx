"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Heart, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { BackButton } from "@/components/ui/back-button"
import { cn }     from "@/lib/utils"
import { registerSchema } from "@/lib/validation/register"

// Schéma client = schéma serveur (source unique, audit M1) + confirmation
// de mot de passe, qui n'existe que côté UI et n'est jamais envoyée à l'API.
const clientSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })

// z.input (pas z.infer) : le schéma a un .default() sur `city`, ce qui rend
// le type de sortie différent du type d'entrée — zodResolver attend le type
// d'entrée pour correspondre à ce que le formulaire manipule réellement.
type FormData = z.input<typeof clientSchema>

const STEP_FIELDS: (keyof FormData)[][] = [
  ["email", "phone", "password", "confirmPassword"],
  ["firstName", "lastName", "dateOfBirth", "gender", "address"],
  [],
]

const STEPS = [
  { label: "Compte",         description: "Vos identifiants de connexion" },
  { label: "Informations",   description: "Vos informations personnelles" },
  { label: "Médical",        description: "Votre profil de santé" },
]

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("flex items-center gap-1 text-xs", ok ? "text-[#4CAF87]" : "text-[#444444]")}>
      <span className={cn("h-3.5 w-3.5 rounded-full border text-center text-[9px] font-bold leading-3",
        ok ? "border-[#4CAF87] bg-[#4CAF87] text-white" : "border-[#2A2A2A]"
      )}>
        {ok ? "✓" : ""}
      </span>
      {label}
    </span>
  )
}

export default function RegisterPage() {
  const router  = useRouter()
  const [step,    setStep]    = useState(0)
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  const {
    register, handleSubmit, watch, setValue, trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      email: "", phone: "", password: "", confirmPassword: "",
      firstName: "", lastName: "", dateOfBirth: "", gender: undefined,
      address: "", city: "Brazzaville", emergencyContact: "",
      bloodType: "", medicalHistory: "", allergies: "", referralCodeInput: "",
    },
  })

  const password = watch("password") ?? ""
  const gender    = watch("gender")
  const bloodType = watch("bloodType")

  const pwdLong  = password.length >= 8
  const pwdUpper = /[A-Z]/.test(password)
  const pwdDigit = /\d/.test(password)

  async function handleNext() {
    const valid = await trigger(STEP_FIELDS[step])
    if (!valid) return
    setError("")
    setStep((s) => s + 1)
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:             data.email,
          phone:             data.phone,
          password:          data.password,
          firstName:         data.firstName,
          lastName:          data.lastName,
          dateOfBirth:       data.dateOfBirth,
          gender:            data.gender,
          address:           data.address,
          city:              data.city,
          emergencyContact:  data.emergencyContact    || undefined,
          bloodType:         data.bloodType           || undefined,
          medicalHistory:    data.medicalHistory      || undefined,
          allergies:         data.allergies           || undefined,
          referralCodeInput: data.referralCodeInput   || undefined,
        }),
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error ?? "Erreur lors de l'inscription.")
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setLoading(false)
    }
  }

  // ── Succès ────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#141414] p-10 text-center animate-fade-in-up">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(76,175,135,0.12)]">
            <Check className="h-8 w-8 text-[#4CAF87]" />
          </div>
          <h1 className="font-heading text-xl text-white">Compte créé avec succès !</h1>
          <p className="mt-2 text-sm text-[#AAAAAA]">
            Vérifiez vos SMS pour confirmer votre numéro de téléphone.
          </p>
          <Button onClick={() => router.push("/login")} className="mt-6 w-full" size="lg">
            Se connecter
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-6 text-center animate-fade-in-up">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C8906A] to-[#E8B49A]">
              <Heart className="h-4 w-4 text-[#0A0A0A]" fill="currentColor" />
            </div>
            <span className="font-cormorant text-xl font-semibold italic text-white">Mobile Clinic</span>
          </Link>
          <p className="font-slogan mt-2 text-[10px] text-[#C8906A]">Créer un compte patient</p>
        </div>

        {/* Progression */}
        <div className="mb-6 flex items-center justify-center gap-0 animate-fade-in-up delay-100">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  i < step    ? "bg-[#4CAF87] text-white"
                  : i === step ? "bg-gradient-to-br from-[#C8906A] to-[#E8B49A] text-[#0A0A0A] shadow-[0_0_14px_rgba(200,144,106,0.4)]"
                  : "bg-[#1A1A1A] text-[#666666] border border-[#2A2A2A]"
                )}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn("mt-1 text-[11px] font-medium", i === step ? "text-[#C8906A]" : "text-[#444444]")}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("mb-4 h-0.5 w-10 sm:w-16", i < step ? "bg-[#4CAF87]" : "bg-[#2A2A2A]")} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-8 animate-fade-in-up delay-200">
          <div className="mb-5">
            <h1 className="font-heading text-lg text-white">{STEPS[step].label}</h1>
            <p className="text-sm text-[#666666]">{STEPS[step].description}</p>
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-[rgba(232,84,84,0.2)] bg-[rgba(232,84,84,0.08)] px-4 py-3 text-sm text-[#E85454]">
              {error}
            </div>
          )}

          <form
            onSubmit={step < 2
              ? (e) => { e.preventDefault(); handleNext() }
              : handleSubmit(onSubmit)}
          >

            {/* ── ÉTAPE 1 — Compte ── */}
            {step === 0 && (
              <div className="flex flex-col gap-4">
                <Input label="Adresse email *" type="email" placeholder="vous@exemple.com"
                  error={errors.email?.message}
                  {...register("email")} />
                <Input label="Téléphone *" type="tel" placeholder="+242XXXXXXXXX"
                  error={errors.phone?.message}
                  {...register("phone")} />
                <Input label="Mot de passe *" type="password" placeholder="Minimum 8 caractères"
                  error={errors.password?.message}
                  {...register("password")} />
                {password && (
                  <div className="flex flex-col gap-1">
                    <PasswordRule ok={pwdLong}  label="8 caractères minimum" />
                    <PasswordRule ok={pwdUpper} label="1 lettre majuscule" />
                    <PasswordRule ok={pwdDigit} label="1 chiffre" />
                  </div>
                )}
                <Input label="Confirmer le mot de passe *" type="password" placeholder="Répétez votre mot de passe"
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")} />
              </div>
            )}

            {/* ── ÉTAPE 2 — Informations personnelles ── */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Prénom *" placeholder="Jean"
                    error={errors.firstName?.message}
                    {...register("firstName")} />
                  <Input label="Nom *" placeholder="Mbemba"
                    error={errors.lastName?.message}
                    {...register("lastName")} />
                </div>
                <Input label="Date de naissance *" type="date"
                  error={errors.dateOfBirth?.message}
                  {...register("dateOfBirth")} />
                <div className="flex flex-col gap-1.5">
                  <span className="font-montserrat text-xs font-medium uppercase tracking-[0.06em] text-[#AAAAAA]">Genre *</span>
                  <div className="flex gap-3">
                    {[{ value: "M", label: "Homme" }, { value: "F", label: "Femme" }].map(({ value, label }) => (
                      <button type="button" key={value} onClick={() => setValue("gender", value as "M" | "F", { shouldValidate: true })}
                        className={cn("flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all",
                          gender === value
                            ? "border-[#C8906A] bg-[rgba(200,144,106,0.1)] text-[#C8906A]"
                            : "border-[#2A2A2A] bg-[#1A1A1A] text-[#666666] hover:border-[rgba(200,144,106,0.4)]"
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.gender && <p className="text-xs text-[#E85454]">{errors.gender.message}</p>}
                </div>
                <Input label="Adresse complète *" placeholder="Rue, quartier"
                  error={errors.address?.message}
                  {...register("address")} />
                <Input label="Ville" placeholder="Brazzaville"
                  {...register("city")} />
                <Input label="Contact d'urgence (nom + téléphone)" placeholder="Maman — +242 06 XXX XX XX"
                  {...register("emergencyContact")} />
              </div>
            )}

            {/* ── ÉTAPE 3 — Informations médicales ── */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-montserrat text-xs font-medium uppercase tracking-[0.06em] text-[#AAAAAA]">Groupe sanguin</span>
                  <div className="flex flex-wrap gap-2">
                    {BLOOD_TYPES.map((bt) => (
                      <button type="button" key={bt} onClick={() => setValue("bloodType", bt)}
                        className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                          bloodType === bt
                            ? "border-[#C8906A] bg-[rgba(200,144,106,0.1)] text-[#C8906A]"
                            : "border-[#2A2A2A] bg-[#1A1A1A] text-[#666666] hover:border-[rgba(200,144,106,0.4)]"
                        )}>
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-montserrat text-xs font-medium uppercase tracking-[0.06em] text-[#AAAAAA]">Antécédents médicaux</label>
                  <textarea rows={3}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-[#444444] focus:border-[rgba(200,144,106,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(200,144,106,0.25)]"
                    placeholder="Ex : Diabète, hypertension..."
                    {...register("medicalHistory")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-montserrat text-xs font-medium uppercase tracking-[0.06em] text-[#AAAAAA]">Allergies connues</label>
                  <textarea rows={3}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-[#444444] focus:border-[rgba(200,144,106,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(200,144,106,0.25)]"
                    placeholder="Ex : Pénicilline, arachides..."
                    {...register("allergies")} />
                </div>
                <Input
                  label="Code de parrainage (facultatif)"
                  placeholder="Ex : MC-AB3XY2"
                  {...register("referralCodeInput", {
                    onChange: (e) => setValue("referralCodeInput", e.target.value.toUpperCase()),
                  })}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between gap-3">
              {step > 0 ? (
                <BackButton variant="button" onClick={() => { setStep((s) => s - 1); setError("") }} />
              ) : (
                <Link href="/login" className="text-sm text-[#444444] transition-colors hover:text-[#AAAAAA]">
                  Déjà inscrit ? Se connecter
                </Link>
              )}
              <Button type="submit" loading={loading} className="gap-2">
                {step < 2 ? (
                  <>Continuer <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>Créer mon compte <Check className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
