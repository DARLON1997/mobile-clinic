import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"

// ⚠️ SÉCURITÉ : Cette route Call Center ne retourne QUE le registre CDR
// (ConnectionLog). Aucune donnée médicale n'est jamais retournée ici.

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
  if (session?.user.role !== "CALL_CENTER_AGENT")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  const { id } = await params

  const [patient, connexions] = await Promise.all([
    prisma.user.findUnique({
      where:  { id, role: "PATIENT" },
      select: {
        id:              true,
        email:           true,
        phone:           true,
        createdAt:       true,
        lastConnectionAt:true,
        totalConnections:true,
        // ⚠️ PAS de patientProfile.medicalHistory, allergies, bloodType
        patientProfile: {
          select: { firstName: true, lastName: true, city: true },
        },
      },
    }),
    prisma.connectionLog.findMany({
      where:   { userId: id },
      orderBy: { connectedAt: "desc" },
      take:    100,
    }),
  ])

  if (!patient) return NextResponse.json({ error: "Patient introuvable" }, { status: 404 })

  return NextResponse.json({
    patient,
    connexions: connexions.map((c) => ({
      id:          c.id,
      connectedAt: c.connectedAt,
      ipAddress:   c.ipAddress,
      device:      parseDevice(c.userAgent),
    })),
    // ⚠️ consultations absentes volontairement — Call Center ne voit pas les données médicales
  })
}
