import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user.role !== "PHARMACIE") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const pharmacie = await prisma.pharmacieProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!pharmacie) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 })

  return NextResponse.json({ success: true, data: pharmacie })
}
