import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const pharmacies = await prisma.pharmacieProfile.findMany({
    orderBy: [{ isVerified: "asc" }, { createdAt: "desc" }],
    include: {
      user:    { select: { isActive: true } },
      _count:  { select: { medicaments: true, commandes: true } },
    },
  })

  const data = pharmacies.map((p) => ({
    id:           p.id,
    userId:       p.userId,
    nomPharmacie: p.nomPharmacie,
    quartier:     p.quartier,
    telephone:    p.telephone,
    isVerified:   p.isVerified,
    isActive:     p.user.isActive,
    medicaments:  p._count.medicaments,
    commandes:    p._count.commandes,
  }))

  return NextResponse.json({ success: true, data })
}
