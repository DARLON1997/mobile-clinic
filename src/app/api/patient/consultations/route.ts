import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const consultations = await prisma.consultation.findMany({
    where: { appointment: { patientId: session.user.id } },
    include: {
      appointment: {
        select: {
          scheduledAt: true,
          doctor: { select: { doctorProfile: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json({ data: consultations })
}
