import type { MedicalSpeciality, JourSemaine, TypeConsultationDispo } from "@prisma/client"

// ─── Entrées de planning ────────────────────────────────────────────────────

type ScheduleEntry = {
  doctorId:  string
  jour:      JourSemaine
  type:      TypeConsultationDispo
  startTime: string
  endTime:   string
  isActive:  boolean
}

const JOURS_SEMAINE: JourSemaine[] = [
  "LUNDI","MARDI","MERCREDI","JEUDI","VENDREDI","SAMEDI","DIMANCHE",
]
const JOURS_PRESENTIEL: JourSemaine[] = [
  "LUNDI","MARDI","MERCREDI","JEUDI","VENDREDI","SAMEDI",
]

// Retourne les 13 entrées de planning par défaut selon la spécialité.
// Renvoie un tableau vide si aucun planning par défaut n'existe pour la spécialité.
//   GYNECOLOGUE → VIDEO 7j/7 14h-19h + PRESENTIEL lun-sam 8h-14h
//   GENERALISTE → aucune entrée (la règle "toujours disponible" est gérée dans weekly-schedule.ts)
//   Autres      → aucune entrée (configuration manuelle requise via l'admin)
export function buildDefaultScheduleEntries(
  doctorId:  string,
  speciality: MedicalSpeciality
): ScheduleEntry[] {
  if (speciality !== "GYNECOLOGUE") return []

  const entries: ScheduleEntry[] = []
  for (const jour of JOURS_SEMAINE) {
    entries.push({ doctorId, jour, type: "VIDEO", startTime: "14:00", endTime: "19:00", isActive: true })
  }
  for (const jour of JOURS_PRESENTIEL) {
    entries.push({ doctorId, jour, type: "PRESENTIEL", startTime: "08:00", endTime: "14:00", isActive: true })
  }
  return entries
}

// ─── Hints UX pour l'interface patient ─────────────────────────────────────

// Retourne un message contextuel à afficher au patient selon la combinaison
// spécialité + type de service. undefined = pas de message à afficher.
export function getAvailabilityHint(
  speciality: string,   // valeur du filtre spécialité (enum value ou "ALL")
  type: "VIDEO" | "PRESENTIEL" | "CARE" | "SAMPLING" | "INSTANT"
): string | undefined {
  if (type === "INSTANT") return undefined
  if (type === "CARE")     return "💡 Nos agents se déplacent à domicile 7j/7, selon disponibilités."
  if (type === "SAMPLING") return "💡 Prélèvements à domicile disponibles 7j/7."

  if (speciality === "GENERALISTE" || speciality === "ALL") {
    return "💡 Les médecins généralistes sont disponibles à toute heure, y compris en consultation instantanée."
  }
  if (speciality === "GYNECOLOGUE") {
    if (type === "VIDEO")      return "💡 Gynécologues disponibles en vidéo tous les jours, de 14h à 19h."
    if (type === "PRESENTIEL") return "💡 Gynécologues en cabinet du lundi au samedi, de 8h à 14h."
  }
  return undefined
}
