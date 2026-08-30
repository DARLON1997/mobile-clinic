import { z } from "zod"

/**
 * Règle de validation du motif de rendez-vous — source unique (audit M1).
 * Utilisée par l'API (src/app/api/appointments/route.ts) et par le
 * parcours de réservation patient (patient/book/page.tsx), qui n'est pas
 * un formulaire classique (sélections par boutons à chaque étape) mais dont
 * le champ motif est un vrai champ texte validé des deux côtés.
 */
export const appointmentReasonSchema = z.string().min(10, "Le motif doit contenir au moins 10 caractères.")
