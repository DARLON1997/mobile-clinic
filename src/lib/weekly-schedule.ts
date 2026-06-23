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

export async function findAvailableDoctors(
  type: "VIDEO" | "PRESENTIEL",
  dateTime: Date,
  speciality?: string
) {
  const jour  = getJourSemaine(dateTime)
  const heure = toHHmm(dateTime)

  return prisma.user.findMany({
    where: {
      role:     "MEDECIN",
      isActive: true,
      doctorProfile: {
        isVerifiedByAdmin: true,
        ...(speciality ? { speciality: speciality as MedicalSpeciality } : {}),
      },
      weeklySchedule: {
        some: {
          jour,
          type,
          isActive:  true,
          startTime: { lte: heure },
          endTime:   { gte: heure },
        },
      },
    },
    select: {
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
    },
  })
}

// Filtre Prisma pour "disponible maintenant en VIDEO" — utilisé dans /api/doctors
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
