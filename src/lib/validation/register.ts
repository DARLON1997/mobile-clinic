import { z } from "zod"

/**
 * Schéma d'inscription patient — source unique de vérité (audit M1).
 * Utilisé tel quel par l'API (src/app/api/auth/register/route.ts) et
 * étendu côté client (confirmation de mot de passe, champ UI uniquement)
 * dans register/page.tsx.
 */
export const registerSchema = z.object({
  firstName:        z.string().min(2, "Prénom requis (2 caractères minimum)"),
  lastName:         z.string().min(2, "Nom requis (2 caractères minimum)"),
  email:            z.string().email("Email invalide"),
  // Format Congo : +242XXXXXXXXX
  phone:            z.string().regex(/^\+242\d{9}$/, "Format requis : +242XXXXXXXXX"),
  // Min 8 chars, au moins 1 majuscule et 1 chiffre
  password:         z.string().regex(
    /^(?=.*[A-Z])(?=.*\d).{8,}$/,
    "Minimum 8 caractères, une majuscule et un chiffre"
  ),
  gender:           z.enum(["M", "F"], { message: "Genre requis" }),
  dateOfBirth:      z.string().min(1, "Date de naissance requise"),
  address:          z.string().min(3, "Adresse requise"),
  city:             z.string().min(2).default("Brazzaville"),
  bloodType:        z.string().optional(),
  allergies:        z.string().optional(),
  medicalHistory:   z.string().optional(),
  emergencyContact: z.string().optional(),
  referralCodeInput: z.string().optional(),
})

export type RegisterData = z.infer<typeof registerSchema>
