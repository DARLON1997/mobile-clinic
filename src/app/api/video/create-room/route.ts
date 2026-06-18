import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createVideoRoom } from "@/lib/daily"

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin" }, { status: 403 })
  }

  const { appointmentId } = await req.json()

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, adminApprovedAt: { not: null } },
  })

  if (!appointment) {
    return NextResponse.json({ error: "RDV non éligible" }, { status: 404 })
  }

  const room = await createVideoRoom(appointmentId, appointment.scheduledAt)

  await prisma.appointment.update({
    where: { id: appointmentId },
    data:  { videoRoomUrl: room.url, videoRoomName: room.name },
  })

  return NextResponse.json({ success: true, data: room })
}
