import { NextResponse } from "next/server"
import { redirect }     from "next/navigation"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params

  const profile = await prisma.doctorProfile.findUnique({ where: { userId: id } })
  if (!profile) {
    return NextResponse.json({ error: "Profil médecin introuvable" }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.doctorProfile.update({
      where: { userId: id },
      data:  { isVerifiedByAdmin: true },
    }),
    prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "VERIFY_DOCTOR",
        targetType: "DoctorProfile",
        targetId:   profile.id,
        details:    { doctorUserId: id },
      },
    }),
  ])

  redirect("/admin/doctors")
}
