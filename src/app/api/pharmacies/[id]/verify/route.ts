import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendSMS, smsTemplates } from "@/lib/africas-talking"

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const { id } = await params

  const pharmacie = await prisma.pharmacieProfile.findUnique({
    where: { id },
    include: { user: { select: { phone: true } } },
  })
  if (!pharmacie) return NextResponse.json({ error: "Pharmacie introuvable." }, { status: 404 })

  await prisma.$transaction([
    prisma.pharmacieProfile.update({ where: { id }, data: { isVerified: true } }),
    prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "VERIFY_PHARMACIE",
        targetId:   id,
        targetType: "PharmacieProfile",
        details:    { nomPharmacie: pharmacie.nomPharmacie },
      },
    }),
  ])

  try {
    await sendSMS(pharmacie.user.phone, `Mobile Clinic : Félicitations ! Votre pharmacie "${pharmacie.nomPharmacie}" est maintenant vérifiée sur Mobile Clinic.`)
  } catch { /* SMS non bloquant */ }

  return NextResponse.json({ success: true, message: "Pharmacie vérifiée." })
}
