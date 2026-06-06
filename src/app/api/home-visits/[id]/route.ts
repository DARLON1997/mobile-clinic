import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { id } = await params

  const visit = await prisma.homeVisit.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          phone: true,
          patientProfile: {
            select: { firstName: true, lastName: true, address: true, bloodType: true },
          },
        },
      },
      agent: {
        select: { agentProfile: { select: { firstName: true, lastName: true, zone: true } } },
      },
    },
  })

  if (!visit) return NextResponse.json({ error: "Visite introuvable" }, { status: 404 })

  // Agent terrain ne peut voir que ses propres visites assignées
  if (session.user.role === "AGENT_TERRAIN" && visit.agentId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  // Patient ne peut voir que ses propres visites
  if (session.user.role === "PATIENT" && visit.patientId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  return NextResponse.json({ data: visit })
}
