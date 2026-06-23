import { NextResponse }           from "next/server"
import { auth }                   from "@/auth"
import { prisma }                 from "@/lib/prisma"
import { buildAvailableNowFilter } from "@/lib/weekly-schedule"
import type { MedicalSpeciality }  from "@prisma/client"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const speciality   = searchParams.get("speciality")
  const availableNow = searchParams.get("availableNow") === "true"

  // Filtre disponibilité immédiate (consultation instantanée)
  let availableNowFilter = {}
  if (availableNow) {
    try {
      availableNowFilter = buildAvailableNowFilter()
    } catch {
      // DoctorWeeklySchedule pas encore migrée — ignorer le filtre
    }
  }

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
