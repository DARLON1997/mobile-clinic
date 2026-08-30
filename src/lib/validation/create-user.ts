import { z } from "zod"

/**
 * Schémas de création de compte interne (Call Center / Médecin / Agent
 * Terrain) par un Admin — source unique de vérité (audit M1). Utilisés tels
 * quels par l'API (src/app/api/admin/users/route.ts) et par
 * CreateUserModal.tsx côté client.
 */
export const BaseUserSchema = z.object({
  email:    z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères"),
  phone:    z.string().min(8, "Téléphone requis"),
  role:     z.enum(["CALL_CENTER_AGENT", "MEDECIN", "AGENT_TERRAIN"]),
})

export const DoctorUserSchema = BaseUserSchema.extend({
  firstName:       z.string().min(1, "Prénom requis"),
  lastName:        z.string().min(1, "Nom requis"),
  speciality:      z.string().min(1, "Spécialité requise"),
  licenseNumber:   z.string().min(1, "N° de licence requis"),
  consultationFee: z.coerce.number().min(0, "Tarif invalide"),
})

export type BaseUserData   = z.infer<typeof BaseUserSchema>
export type DoctorUserData = z.infer<typeof DoctorUserSchema>
