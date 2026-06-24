export type PatientActivityStatus =
  | "ACTIF"            // connexion dans les 30 derniers jours
  | "DORMANT"          // dernière connexion entre 30 et 90 jours
  | "INACTIF"          // plus de 90 jours sans connexion
  | "JAMAIS_CONNECTE"  // inscrit mais jamais connecté

export function computeActivityStatus(
  lastConnectionAt: Date | null | undefined
): PatientActivityStatus {
  if (!lastConnectionAt) return "JAMAIS_CONNECTE"

  const daysSince = Math.floor(
    (Date.now() - new Date(lastConnectionAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSince <= 30) return "ACTIF"
  if (daysSince <= 90) return "DORMANT"
  return "INACTIF"
}

export const STATUS_LABEL: Record<PatientActivityStatus, string> = {
  ACTIF:           "Actif",
  DORMANT:         "Dormant",
  INACTIF:         "Inactif",
  JAMAIS_CONNECTE: "Jamais connecté",
}

export const STATUS_COLOR: Record<PatientActivityStatus, string> = {
  ACTIF:           "#22c55e",  // green-500
  DORMANT:         "#f97316",  // orange-500
  INACTIF:         "#6b7280",  // gray-500
  JAMAIS_CONNECTE: "#ef4444",  // red-500
}
