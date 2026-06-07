import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const doctors = await prisma.user.findMany({
    where:   { role: "MEDECIN" },
    include: { doctorProfile: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ data: doctors })
}
