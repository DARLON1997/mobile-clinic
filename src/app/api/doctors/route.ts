import { NextResponse }                           from "next/server"
import { auth }                                  from "@/auth"
import { prisma }                                from "@/lib/prisma"
import { buildAvailableNowFilter, findAvailableDoctors } from "@/lib/weekly-schedule"
import type { MedicalSpeciality }                from "@prisma/client"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const speciality   = searchParams.get("speciality")   || undefined
  const availableNow = searchParams.get("availableNow") === "true"
  const scheduledAt  = searchParams.get("scheduledAt")
  const typeParam    = searchParams.get("type") as "VIDEO" | "PRESENTIEL" | null

  // ── Priorité 1 : filtre par créneau précis (parcours VIDEO / PRÉSENTIEL) ──
  // Activé quand le patient a déjà choisi sa date (étape 1 du parcours).
  if (scheduledAt && (typeParam === "VIDEO" || typeParam === "PRESENTIEL")) {
    const dateTime = new Date(scheduledAt)
    if (!isNaN(dateTime.getTime())) {
      try {
        const doctors = await findAvailableDoctors(typeParam, dateTime, speciality)
        return NextResponse.json({ data: doctors })
      } catch {
        // Si DoctorWeeklySchedule absent → dégradation silencieuse vers liste complète
      }
    }
  }

  // ── Priorité 2 : médecins disponibles maintenant (flux INSTANT) ───────────
  let availableNowFilter = {}
  if (availableNow) {
    try {
      availableNowFilter = buildAvailableNowFilter()
    } catch {
      // Table pas encore migrée — ignorer
    }
  }

  // ── Défaut : liste complète des médecins vérifiés ────────────────────────
  const doctors = await prisma.user.findMany({
    where: {
      role:     "MEDECIN",
      isActive: true,
      doctorProfile: {
        isVerifiedByAdmin: true,
        ...(speciality ? { speciality: speciality as MedicalSpeciality } : {}),
      },
      ...availableNowFilter,
    },
    select: {
      id: true,
      doctorProfile: {
        select: {
          firstName:       true,
          lastName:        true,
          speciality:      true,
          consultationFee: true,
          avatarUrl:       true,
        },
      },
      cabinet: {
        select: { id: true, name: true, address: true, city: true, phone: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ data: doctors })
}
