"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Shield, KeyRound } from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { LogoMark } from "@/components/shared/LogoMark"

type Step = "email" | "otp" | "password" | "done"

export default function ForgotPasswordPage() {
  const [step, setStep]             = useState<Step>("email")
  const [email, setEmail]           = useState("")
  const [maskedEmail, setMaskedEmail] = useState("")
  const [otp, setOtp]               = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [error, setError]           = useState("")
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.toLowerCase().trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.")
        return
      }
      setMaskedEmail(data.maskedEmail)
      setStep("otp")
      setResendTimer(60)
    } catch {
      setError("Une erreur est survenue. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendTimer > 0 || loading) return
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.toLowerCase().trim() }),
      })
      if (res.ok) { setResendTimer(60); setOtp("") }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (otp.length !== 6) { setError("Entrez le code à 6 chiffres."); return }
    setStep("password")
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.toLowerCase().trim(), otp, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.")
        if (data.error?.includes("expiré")) setStep("otp")
        return
      }
      setStep("done")
    } catch {
      setError("Une erreur est survenue. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200,144,106,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 text-center animate-fade-in-up">
          <Link href="/" className="inline-flex justify-center">
            <LogoMark size="lg" showText showTagline />
          </Link>
        </div>

        <div className="animate-fade-in-up delay-100 rounded-2xl border border-[#2A2A2A] bg-[#141414] p-8">

          {/* ── ÉTAPE 1 : Email ─────────────────────────────── */}
          {step === "email" && (
            <>
              <h1 className="font-heading mb-1 text-xl text-white">Mot de passe oublié</h1>
              <p className="mb-7 text-sm text-[#666666]">
                Entre ton adresse email — nous t'enverrons un code de vérification par email.
              </p>

              {error && (
                <div className="mb-5 rounded-lg border border-[rgba(232,84,84,0.2)] bg-[rgba(232,84,84,0.08)] px-4 py-3 text-sm text-[#E85454]">
                  {error}
                </div>
              )}

              <form onSubmit={handleEmail} className="flex flex-col gap-4">
                <Input
                  label="Adresse email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
                  Envoyer le code
                </Button>
              </form>
            </>
          )}

          {/* ── ÉTAPE 2 : OTP ───────────────────────────────── */}
          {step === "otp" && (
            <>
              <div className="mb-5 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(200,144,106,0.1)]">
                  <Shield className="h-6 w-6 text-[#C8906A]" />
                </div>
              </div>
              <h1 className="font-heading mb-1 text-center text-xl text-white">Vérification</h1>
              <p className="mb-1 text-center text-sm text-[#666666]">Code envoyé par email à</p>
              <p className="mb-7 text-center text-sm font-medium text-[#C8906A]">{maskedEmail}</p>

              {error && (
                <div className="mb-5 rounded-lg border border-[rgba(232,84,84,0.2)] bg-[rgba(232,84,84,0.08)] px-4 py-3 text-sm text-[#E85454]">
                  {error}
                </div>
              )}

              <form onSubmit={handleOtp} className="flex flex-col gap-4">
                <Input
                  label="Code à 6 chiffres"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                />
                <Button type="submit" size="lg" disabled={otp.length !== 6} className="mt-1 w-full">
                  Continuer
                </Button>
              </form>

              <div className="mt-4 text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-[#666666]">
                    Renvoyer dans <span className="text-[#AAAAAA]">{resendTimer}s</span>
                  </p>
                ) : (
                  <button type="button" onClick={handleResend} disabled={loading}
                    className="text-sm text-[#C8906A] hover:underline disabled:opacity-50">
                    Renvoyer un code
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── ÉTAPE 3 : Nouveau mot de passe ──────────────── */}
          {step === "password" && (
            <>
              <div className="mb-5 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(200,144,106,0.1)]">
                  <KeyRound className="h-6 w-6 text-[#C8906A]" />
                </div>
              </div>
              <h1 className="font-heading mb-1 text-center text-xl text-white">Nouveau mot de passe</h1>
              <p className="mb-7 text-center text-sm text-[#666666]">
                Minimum 8 caractères, une majuscule et un chiffre.
              </p>

              {error && (
                <div className="mb-5 rounded-lg border border-[rgba(232,84,84,0.2)] bg-[rgba(232,84,84,0.08)] px-4 py-3 text-sm text-[#E85454]">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  placeholder="Minimum 8 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <Input
                  label="Confirmer le mot de passe"
                  type="password"
                  placeholder="Répétez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
                  Réinitialiser
                </Button>
              </form>
            </>
          )}

          {/* ── ÉTAPE 4 : Succès ────────────────────────────── */}
          {step === "done" && (
            <div className="text-center">
              <div className="mb-5 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(34,197,94,0.1)]">
                  <span className="text-2xl">✓</span>
                </div>
              </div>
              <h1 className="font-heading mb-2 text-xl text-white">Mot de passe réinitialisé</h1>
              <p className="mb-8 text-sm text-[#666666]">
                Ton mot de passe a été mis à jour. Tu peux maintenant te connecter.
              </p>
              <Link href="/login">
                <Button size="lg" className="w-full">Se connecter</Button>
              </Link>
            </div>
          )}

          {step !== "done" && (
            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-[#666666] hover:text-[#AAAAAA] transition-colors">
                ← Retour à la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
