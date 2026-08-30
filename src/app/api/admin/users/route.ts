import { auth }                        from "@/auth"
import { prisma }                      from "@/lib/prisma"
import { NextResponse }                from "next/server"
import { z }                           from "zod"
import bcrypt                          from "bcryptjs"
import { buildDefaultScheduleEntries } from "@/lib/default-schedules"
import type { MedicalSpeciality }      from "@prisma/client"
import { BaseUserSchema as BaseSchema, DoctorUserSchema as DoctorSchema } from "@/lib/validation/create-user"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = (body.role === "MEDECIN" ? DoctorSchema : BaseSchema).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, phone, role } = parsed.data

  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } })
  if (exists) {
    return NextResponse.json({ error: "Email ou téléphone déjà utilisé" }, { status: 409 })
  }

  if (role === "MEDECIN") {
    const licenseExists = await prisma.doctorProfile.findUnique({
      where: { licenseNumber: (parsed.data as z.infer<typeof DoctorSchema>).licenseNumber },
    })
    if (licenseExists) {
      return NextResponse.json({ error: "Ce numéro de licence est déjà utilisé" }, { status: 409 })
    }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, phone, passwordHash, role, isActive: true },
      select: { id: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    })

    if (role === "MEDECIN") {
      const d = parsed.data as z.infer<typeof DoctorSchema>
      const speciality = d.speciality as MedicalSpeciality

      await tx.doctorProfile.create({
        data: {
          userId:            created.id,
          firstName:         d.firstName,
          lastName:          d.lastName,
          speciality,
          licenseNumber:     d.licenseNumber,
          consultationFee:   d.consultationFee,
          isVerifiedByAdmin: true,
        },
      })

      // Appliquer le planning par défaut selon la spécialité :
      //   GYNECOLOGUE → VIDEO 7j/7 14h-19h + PRÉSENTIEL lun-sam 8h-14h (automatique)
      //   GENERALISTE → aucune entrée nécessaire (toujours disponible par règle)
      //   Autres      → configuration manuelle via /admin/medecins/[id]/planning
      const scheduleEntries = buildDefaultScheduleEntries(created.id, speciality)
      for (const entry of scheduleEntries) {
        await tx.doctorWeeklySchedule.upsert({
          where:  { doctorId_jour_type: { doctorId: entry.doctorId, jour: entry.jour, type: entry.type } },
          update: { startTime: entry.startTime, endTime: entry.endTime, isActive: entry.isActive },
          create: entry,
        })
      }
    }

    await tx.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "CREATE_USER",
        targetType: "User",
        targetId:   created.id,
        details:    { role, email },
      },
    })
    return created
  })

  return NextResponse.json({ data: user }, { status: 201 })
}
