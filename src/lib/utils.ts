import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Redirige chaque rôle vers son dashboard.
 */
export function getDashboardUrl(role: string): string {
  const dashboards: Record<string, string> = {
    SUPER_ADMIN:       "/admin",
    CALL_CENTER_AGENT: "/call-center",
    MEDECIN:           "/doctor",
    AGENT_TERRAIN:     "/agent",
    PATIENT:           "/patient",
    PHARMACIE:         "/pharmacie",
  }
  return dashboards[role] ?? "/"
}

/**
 * Formate un montant en XAF.
 * Ex: formatXAF(5000) → "5 000 XAF"
 */
export function formatXAF(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} XAF`
}

/**
 * Formate une date en français long.
 * Ex: "Lundi 3 juin 2025 à 14h30"
 */
export function formatDateFR(date: Date | string): string {
  return format(new Date(date), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
}

/**
 * Formate une date courte.
 * Ex: "03/06/2025 14:30"
 */
export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm")
}

/**
 * Génère un numéro d'ordonnance unique.
 * Format : MC-2025-XXXXX
 */
let _prescCounter = 0
export function generatePrescriptionNumber(): string {
  _prescCounter++
  const year = new Date().getFullYear()
  const seq  = String(_prescCounter).padStart(5, "0")
  return `MC-${year}-${seq}`
}

/**
 * Vérifie si la salle vidéo est active.
 * Active entre scheduledAt-5min et scheduledAt+60min.
 */
export function isVideoRoomActive(scheduledAt: Date): boolean {
  const now  = Date.now()
  const start = scheduledAt.getTime() - 5  * 60 * 1000
  const end   = scheduledAt.getTime() + 60 * 60 * 1000
  return now >= start && now <= end
}

/**
 * Normalise un numéro de téléphone congolais en +242XXXXXXXXX.
 */
export function normalizeCongoPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("242")) return `+${digits}`
  if (digits.startsWith("0"))   return `+242${digits.slice(1)}`
  return `+242${digits}`
}

// ── Utilitaires Chat ────────────────────────────────────────────────────────

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()      === b.getMonth()
    && a.getDate()       === b.getDate()
}

export function formatMessageTime(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(date))
}

export function formatDateLabel(date: string | Date): string {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(d, today))     return "Aujourd'hui"
  if (isSameDay(d, yesterday)) return "Hier"
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d)
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  if (isSameDay(d, now)) return formatMessageTime(d)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(d, yesterday)) return "Hier"
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  if (d > weekAgo) return new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d)
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(d)
}

export function getInitials(name: string): string {
  return name.split(" ").map(n => n.charAt(0).toUpperCase()).slice(0, 2).join("")
}
