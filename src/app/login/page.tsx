"use client"

import { useState } from "react"
import Link         from "next/link"
import { useRouter } from "next/navigation"
import { signIn }   from "next-auth/react"
import { Eye, EyeOff, Heart } from "lucide-react"
import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { getDashboardUrl } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const result = await signIn("credentials", { email: normalizedEmail, password, redirect: false })

      // Auth.js v5 peut retourner { error } OU lancer une exception
      if (result?.error) {
        setError("Email ou mot de passe incorrect.")
        return
      }

      // Récupérer le rôle depuis la session fraîchement créée
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      const sessionData = await res.json()
      const role = sessionData?.user?.role ?? "PATIENT"

      // window.location.href force un vrai rechargement — garantit que les
      // cookies de session sont lus par le serveur sans cache client
      window.location.href = getDashboardUrl(role)
    } catch (e: unknown) {
      // Auth.js v5 peut lancer AuthError sur credentials invalides
      const msg = e instanceof Error ? e.message : ""
      if (msg.toLowerCase().includes("credential") || msg.toLowerCase().includes("signin")) {
        setError("Email ou mot de passe incorrect.")
      } else {
        setError("Une erreur est survenue. Réessayez.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      {/* Halo */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200,144,106,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />

      <div className="relative w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 text-center animate-fade-in-up">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C8906A] to-[#E8B49A] shadow-[0_0_24px_rgba(200,144,106,0.4)]">
              <Heart className="h-6 w-6 text-[#0A0A0A]" fill="currentColor" />
            </div>
            <span className="font-cormorant text-2xl font-semibold italic text-white">Mobile Clinic</span>
          </Link>
          <p className="font-slogan mt-2 text-[10px] text-[#C8906A]">
            La santé plus proche de vous
          </p>
        </div>

        {/* Formulaire */}
        <div className="animate-fade-in-up delay-100 rounded-2xl border border-[#2A2A2A] bg-[#141414] p-8">
          <h1 className="font-heading mb-1 text-xl text-white">Connexion</h1>
          <p className="mb-7 text-sm text-[#666666]">Accédez à votre espace personnel</p>

          {error && (
            <div className="mb-5 rounded-lg border border-[rgba(232,84,84,0.2)] bg-[rgba(232,84,84,0.08)] px-4 py-3 text-sm text-[#E85454]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Adresse email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPwd ? "text" : "password"}
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-8 text-[#666666] hover:text-[#AAAAAA] transition-colors"
                aria-label={showPwd ? "Masquer" : "Afficher"}>
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link href="#" className="font-montserrat text-xs text-[#C8906A] hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
              Se connecter
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#666666]">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-[#C8906A] hover:underline">
              S&apos;inscrire gratuitement
            </Link>
          </p>
        </div>

        {/* Lien retour */}
        <p className="mt-6 text-center">
          <Link href="/" className="font-montserrat text-xs text-[#444444] hover:text-[#AAAAAA] transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  )
}
