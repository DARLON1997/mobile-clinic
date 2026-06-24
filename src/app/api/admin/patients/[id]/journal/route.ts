import { NextResponse }  from "next/server"
import { auth }          from "@/auth"
import { prisma }        from "@/lib/prisma"

function parseDevice(ua: string | null): string {
  if (!ua) return "Inconnu"
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile"
  if (/iPad|Tablet/i.test(ua))           return "Tablette"
  return "Bureau"
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id } = await params

  const [patient, connexions, appointments] = await Promise.all([
    prisma.user.findUnique({
      where:  { id, role: "PATIENT" },
      select: {
        id:              true,
        email:           true,
        phone:           true,
        createdAt:       true,
        lastConnectionAt:true,
        totalConnections:true,
        patientProfile: {
          select: { firstName: true, lastName: true, city: true, dateOfBirth: true, gender: true },
        },
      },
    }),
    prisma.connectionLog.findMany({
      where:   { userId: id },
      orderBy: { connectedAt: "desc" },
      take:    100,
    }),
    prisma.appointment.findMany({
      where:   { patientId: id },
      orderBy: { scheduledAt: "desc" },
      select: {
        id:          true,
        scheduledAt: true,
        status:      true,
        reason:      true,
        doctor: {
          select: { doctorProfile: { select: { firstName: true, lastName: true, speciality: true } } },
        },
        consultation: {
          select: {
            clinicalNotes:       true,
            diagnosis:           true,
            prescriptionTexte:   true,
            signesSubjectifs:    true,
            hypothesesDiagnostic:true,
          },
        },
      },
    }),
  ])

  if (!patient) return NextResponse.json({ error: "Patient introuvable" }, { status: 404 })

  return NextResponse.json({
    patient,
    connexions: connexions.map((c) => ({
      id:           c.id,
      connectedAt:  c.connectedAt,
      ipAddress:    c.ipAddress,
      device:       parseDevice(c.userAgent),
      userAgent:    c.userAgent,
    })),
    consultations: appointments,
  })
}
