import { prisma } from "@/lib/prisma"
import type { MedicalSpeciality } from "@prisma/client"

const JOUR_MAP = [
  "DIMANCHE", "LUNDI", "MARDI", "MERCREDI",
  "JEUDI", "VENDREDI", "SAMEDI",
] as const

type JourSemaine = typeof JOUR_MAP[number]

export function getJourSemaine(date: Date): JourSemaine {
  return JOUR_MAP[date.getDay()]
}

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export async function isDoctorAvailableAt(
  doctorId: string,
  type: "VIDEO" | "PRESENTIEL",
  dateTime: Date
): Promise<boolean> {
  const jour  = getJourSemaine(dateTime)
  const heure = toHHmm(dateTime)

  const schedule = await prisma.doctorWeeklySchedule.findUnique({
    where: { doctorId_jour_type: { doctorId, jour, type } },
  })

  if (!schedule || !schedule.isActive) return false
  return heure >= schedule.startTime && heure <= schedule.endTime
}

// ─── findAvailableDoctors ─────────────────────────────────────────────────────
//
// RÈGLE MÉTIER :
//   GÉNÉRALISTE → toujours disponible, sans condition de planning.
//   Toute autre spécialité → doit avoir une entrée DoctorWeeklySchedule
//                            active couvrant le créneau demandé.
//
// Comportement selon le paramètre `speciality` :
//   undefined / "ALL"   → généralistes (toujours) + autres avec planning
//   "GENERALISTE"       → uniquement généralistes (toujours disponibles)
//   autre spécialité    → uniquement cette spécialité avec planning correspondant
//
export async function findAvailableDoctors(
  type: "VIDEO" | "PRESENTIEL",
  dateTime: Date,
  speciality?: string
) {
  const jour  = getJourSemaine(dateTime)
  const heure = toHHmm(dateTime)

  const scheduleCondition = {
    weeklySchedule: {
      some: {
        jour,
        type,
        isActive:  true,
        startTime: { lte: heure },
        endTime:   { gte: heure },
      },
    },
  }

  // Pour PRÉSENTIEL : exiger un cabinet enregistré
  const cabinetCondition = type === "PRESENTIEL"
    ? { cabinet: { isNot: null as null } }
    : {}

  const isSpecificNonGeneraliste =
    !!speciality && speciality !== "ALL" && speciality !== "GENERALISTE"

  // ── Clause WHERE selon la spécialité demandée ──────────────────────────────

  // Cas A : spécialité autre que généraliste (ex: GYNECOLOGUE, CARDIOLOGUE…)
  //   → filtre sur la spécialité ET le planning uniquement
  if (isSpecificNonGeneraliste) {
    return prisma.user.findMany({
      where: {
        role:     "MEDECIN",
        isActive: true,
        doctorProfile: {
          isVerifiedByAdmin: true,
          speciality: speciality as MedicalSpeciality,
        },
        ...scheduleCondition,
        ...cabinetCondition,
      },
      select: _select,
    })
  }

  // Cas B : uniquement des généralistes
  //   → pas de condition de planning
  if (speciality === "GENERALISTE") {
    return prisma.user.findMany({
      where: {
        role:     "MEDECIN",
        isActive: true,
        doctorProfile: {
          isVerifiedByAdmin: true,
          speciality: "GENERALISTE",
        },
        ...cabinetCondition,
      },
      select: _select,
    })
  }

  // Cas C : aucune spécialité demandée (toutes)
  //   → généralistes TOUJOURS + autres uniquement si planning correspondant
  return prisma.user.findMany({
    where: {
      role:     "MEDECIN",
      isActive: true,
      doctorProfile: { isVerifiedByAdmin: true },
      OR: [
        { doctorProfile: { speciality: "GENERALISTE" } },
        scheduleCondition,
      ],
      ...cabinetCondition,
    },
    select: _select,
  })
}

// ─── Filtre "disponible maintenant" (flux INSTANT) ───────────────────────────
// Renvoie le filtre Prisma pour médecins disponibles en VIDEO à l'instant T.
export function buildAvailableNowFilter() {
  const now   = new Date()
  const jour  = getJourSemaine(now)
  const heure = toHHmm(now)
  return {
    weeklySchedule: {
      some: {
        jour,
        type:      "VIDEO" as const,
        isActive:  true,
        startTime: { lte: heure },
        endTime:   { gte: heure },
      },
    },
  }
}

// ─── Select partagé ──────────────────────────────────────────────────────────

const _select = {
  id: true,
  doctorProfile: {
    select: {
      firstName:       true,
      lastName:        true,
      speciality:      true,
      consultationFee: true,
      bio:             true,
      avatarUrl:       true,
    },
  },
  cabinet: {
    select: { id: true, name: true, address: true, city: true },
  },
} as const
