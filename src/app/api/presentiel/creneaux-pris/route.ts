import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

function buildBlockedSlots(startDate: Date, duration: number) {
  const slots: string[] = []
  const end = new Date(startDate.getTime() + duration * 60 * 1000)
  const current = new Date(startDate)
  while (current < end) {
    slots.push(current.toISOString().slice(11, 16))
    current.setMinutes(current.getMinutes() + 30)
  }
  return slots
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const doctorId = searchParams.get("doctorId")
  const date = searchParams.get("date")

  if (!doctorId || !date) {
    return NextResponse.json({ error: "doctorId et date requis" }, { status: 400 })
  }

  const day = new Date(date)
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 })
  }

  const nextDay = new Date(day)
  nextDay.setDate(day.getDate() + 1)

  const [presentiels, appointments] = await Promise.all([
    prisma.rendezVousPresentiel.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: day, lt: nextDay },
        status: { notIn: ["ANNULE"] },
      },
      select: { scheduledAt: true, duration: true },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: day, lt: nextDay },
        status: { notIn: ["CANCELLED", "REJECTED", "NO_SHOW"] },
      },
      select: { scheduledAt: true, duration: true },
    }),
  ])

  type BlockedItem = { scheduledAt: Date; duration: number }
  const blocked = new Set<string>()
  presentiels.forEach((item: BlockedItem) => {
    blocked.add(item.scheduledAt.toISOString().slice(11, 16))
    buildBlockedSlots(item.scheduledAt, item.duration).forEach((slot) => blocked.add(slot))
  })
  appointments.forEach((item: BlockedItem) => {
    buildBlockedSlots(item.scheduledAt, item.duration).forEach((slot) => blocked.add(slot))
  })

  return NextResponse.json({ success: true, creneauxPris: Array.from(blocked).sort() })
}
