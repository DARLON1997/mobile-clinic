import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"
import { getDashboardUrl } from "@/lib/utils"

const { auth } = NextAuth(authConfig)

const ROLE_ROUTES: Record<string, string[]> = {
  "/admin":        ["SUPER_ADMIN"],
  "/doctor":       ["MEDECIN"],
  "/patient":      ["PATIENT"],
  "/call-center":  ["CALL_CENTER_AGENT"],
  "/agent":        ["AGENT_TERRAIN"],
  "/pharmacie":    ["PHARMACIE"],
}

// Routes accessibles sans authentification
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/unauthorized",
  "/suspended",
  // Page légale — doit rester joignable sans session : consultée par les
  // visiteurs avant inscription, et obligatoirement par les revues Apple/Google.
  "/politique-confidentialite",
  // PWA — doivent rester joignables par un visiteur sans session (avant sa
  // toute première connexion), sinon le service worker ne s'enregistre
  // jamais et l'invite d'installation ne peut jamais aboutir.
  "/manifest.webmanifest",
  "/sw.js",
  "/~offline",
]

// Préfixes d'API publics (pas de vérification de session)
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/payments/webhook",
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ── API publiques ─────────────────────────────────────────────────────────
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Pages publiques ───────────────────────────────────────────────────────
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))

  if (isPublic) {
    // Utilisateur connecté sur /login ou /register → rediriger vers son dashboard
    if (session && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL(getDashboardUrl(session.user.role), req.url))
    }
    return NextResponse.next()
  }

  // ── Authentification requise ─────────────────────────────────────────────
  if (!session) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Compte suspendu ───────────────────────────────────────────────────────
  if (session.user.isActive === false) {
    return NextResponse.redirect(new URL("/suspended", req.url))
  }

  // ── Vérification du rôle ─────────────────────────────────────────────────
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
      break
    }
  }

  // ── RÈGLE CRITIQUE : médecin → dossier patient ────────────────────────────
  // Le middleware vérifie uniquement le rôle.
  // La vérification adminApprovedAt est OBLIGATOIRE dans chaque handler.
  if (pathname.startsWith("/doctor/patient/")) {
    if (session.user.role !== "MEDECIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Exclure /api/* — les routes API gèrent leur propre auth (401 JSON, pas redirect HTML)
    // Exclure assets statiques Next.js et fichiers médias
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
