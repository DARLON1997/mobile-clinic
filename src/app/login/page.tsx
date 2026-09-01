"use client"

import { useState, useEffect } from "react"
import Link         from "next/link"
import { signIn }   from "next-auth/react"
import { Eye, EyeOff, Shield } from "lucide-react"
import { Button }       from "@/components/ui/button"
import { Input }        from "@/components/ui/input"
import { LogoMark }     from "@/components/shared/LogoMark"
import { getDashboardUrl } from "@/lib/utils"

// Messages jamais montrés au patient tels quels — uniquement ceux
// explicitement reconnus ici comme sûrs (texte simple, sans détail
// technique). Tout le reste (ex. un message de configuration Resend en
// cas d'échec d'envoi d'email) retombe sur un message générique, quel
// que soit ce que l'API renvoie réellement.
const SAFE_ERRORS = new Set([
  "Trop de requêtes. Réessayez dans une minute.",
  "Trop de tentatives. Réessayez dans une heure.",
  "Email ou mot de passe incorrect.",
  "Données invalides.",
])

function toFriendlyError(raw: string | undefined): string {
  if (raw && SAFE_ERRORS.has(raw)) return raw
  return "Une erreur est survenue. Réessayez."
}

export default function LoginPage() {
  const [step, setStep]       = useState<"credentials" | "otp">("credentials")
  const [maskedEmail, setMaskedEmail] = useState("")

  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPwd,  setShowPwd]  = useState(false)

  const [otp,          setOtp]          = useState("")
  const [resendTimer,  setResendTimer]  = useState(0)

  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const res = await fetch("/api/auth/pre-login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: normalizedEmail, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(toFriendlyError(data.error))
        return
      }

      // Rôles internes : connexion directe sans étape OTP
      if (data.skipOtp && data.directCode) {
        const result = await signIn("credentials", {
          email:    normalizedEmail,
          otp:      data.directCode,
          redirect: false,
        })
        if (result?.error) {
          setError("Erreur de connexion. Réessayez.")
          return
        }
        const sessionRes  = await fetch("/api/auth/session", { cache: "no-store" })
        const sessionData = await sessionRes.json()
        const role = sessionData?.user?.role ?? "PATIENT"
        window.location.href = getDashboardUrl(role)
        return
      }

      // PATIENT : afficher l'étape OTP
      setMaskedEmail(data.maskedEmail)
      setStep("otp")
      setResendTimer(60)
    } catch {
      setError("Une erreur est survenue. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email:    email.toLowerCase().trim(),
        otp,
        redirect: false,
      })
      if (result?.error) {
        setError("Code invalide ou expiré. Demandez un nouveau code.")
        setOtp("")
        return
      }
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const sessionData = await res.json()
      const role = sessionData?.user?.role ?? "PATIENT"
      window.location.href = getDashboardUrl(role)
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
      const res = await fetch("/api/auth/pre-login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.toLowerCase().trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(toFriendlyError(data.error))
        return
      }
      setResendTimer(60)
      setOtp("")
    } catch {
      setError("Impossible de renvoyer le code.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-6">
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200,144,106,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <div className="relative w-full max-w-[360px]">

        {step === "credentials" ? (
          <>
            <div className="mb-10 flex justify-center animate-fade-in-up">
              <Link href="/">
                <LogoMark size="sm" showText />
              </Link>
            </div>

            <form onSubmit={handleCredentials} className="flex flex-col gap-4 animate-fade-in-up delay-100">
              <Input
                label="Email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                required
                autoComplete="email"
              />

              <div className="relative">
                <Input
                  label="Mot de passe"
                  type={showPwd ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError("") }}
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-8 text-[#666666] hover:text-[#AAAAAA] transition-colors"
                  aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="font-montserrat text-xs text-[#C8906A] hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-[rgba(232,84,84,0.2)] bg-[rgba(232,84,84,0.08)] px-4 py-2.5 text-sm text-[#E85454]">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
                Continuer
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-[#666666] animate-fade-in-up delay-200">
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-medium text-[#C8906A] hover:underline">
                S&apos;inscrire
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(200,144,106,0.1)]">
                <Shield className="h-6 w-6 text-[#C8906A]" />
              </div>
            </div>

            <p className="mb-1 text-center text-sm text-[#666666]">Code envoyé par email à</p>
            <p className="mb-7 text-center text-sm font-medium text-[#C8906A]">{maskedEmail}</p>

            {error && (
              <div role="alert" className="mb-5 rounded-lg border border-[rgba(232,84,84,0.2)] bg-[rgba(232,84,84,0.08)] px-4 py-3 text-sm text-[#E85454]">
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
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                required
                autoComplete="one-time-code"
              />

              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={otp.length !== 6}
                className="mt-1 w-full"
              >
                Vérifier le code
              </Button>
            </form>

            <div className="mt-4 text-center">
              {resendTimer > 0 ? (
                <p className="text-sm text-[#666666]">
                  Renvoyer dans <span className="text-[#AAAAAA]">{resendTimer}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-sm text-[#C8906A] hover:underline disabled:opacity-50"
                >
                  Renvoyer un code
                </button>
              )}
            </div>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => { setStep("credentials"); setOtp(""); setError("") }}
                className="text-sm text-[#666666] hover:text-[#AAAAAA] transition-colors"
              >
                ← Changer de compte
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
