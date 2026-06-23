import { NextResponse }  from "next/server"
import { auth }          from "@/auth"
import { prisma }        from "@/lib/prisma"
import { z }             from "zod"
import { logServerError } from "@/lib/error-logger"

const entrySchema = z.object({
  jour:      z.enum(["LUNDI","MARDI","MERCREDI","JEUDI","VENDREDI","SAMEDI","DIMANCHE"]),
  type:      z.enum(["VIDEO","PRESENTIEL"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
  isActive:  z.boolean(),
})

const bodySchema = z.object({ entries: z.array(entrySchema) })

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params

  try {
    // Vérifier que l'utilisateur est bien un médecin
    const doctor = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, role: true,
        doctorProfile: { select: { firstName: true, lastName: true, speciality: true } },
      },
    })
    if (!doctor || doctor.role !== "MEDECIN") {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 })
    }

    const schedule = await prisma.doctorWeeklySchedule.findMany({
      where:   { doctorId: id },
      orderBy: [{ jour: "asc" }, { type: "asc" }],
    })

    return NextResponse.json({ success: true, doctor, data: schedule })
  } catch (err) {
    logServerError("ADMIN_PLANNING_GET", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params

  try {
    const { entries } = bodySchema.parse(await req.json())

    // Upsert toutes les entrées dans une transaction
    await prisma.$transaction(
      entries.map((e) =>
        prisma.doctorWeeklySchedule.upsert({
          where:  { doctorId_jour_type: { doctorId: id, jour: e.jour, type: e.type } },
          update: { startTime: e.startTime, endTime: e.endTime, isActive: e.isActive },
          create: { doctorId: id, jour: e.jour, type: e.type, startTime: e.startTime, endTime: e.endTime, isActive: e.isActive },
        })
      )
    )

    await prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "UPDATE_DOCTOR_WEEKLY_SCHEDULE",
        targetType: "DoctorWeeklySchedule",
        targetId:   id,
        details:    { entries: entries.length },
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    }
    logServerError("ADMIN_PLANNING_POST", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
