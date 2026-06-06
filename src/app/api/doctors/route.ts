import { NextResponse }     from "next/server"
import { auth }             from "@/auth"
import { prisma }           from "@/lib/prisma"
import type { MedicalSpeciality } from "@prisma/client"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const speciality = searchParams.get("speciality")

  const doctors = await prisma.user.findMany({
    where: {
      role:     "MEDECIN",
      isActive: true,
      doctorProfile: {
        isVerifiedByAdmin: true,
        ...(speciality ? { speciality: speciality as MedicalSpeciality } : {}),
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
          avatarUrl:       true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ data: doctors })
}
