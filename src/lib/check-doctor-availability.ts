import { prisma } from "@/lib/prisma"

export type AvailabilityStatus = "MATCH" | "PARTIAL" | "CONFLICT" | "NO_DATA"

export type SlotCheck = {
  status:      AvailabilityStatus
  label:       string
  suggestion?: string  // prochain créneau disponible (CONFLICT seulement)
}

type Slot = { doctorId?: string; dayOfWeek: number; startTime: string; endTime: string }

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m ?? 0)
}

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  MATCH:    "Créneau disponible",
  PARTIAL:  "Chevauchement partiel",
  CONFLICT: "Hors planning",
  NO_DATA:  "Planning non renseigné",
}

function computeStatus(daySlots: Slot[], scheduledAt: Date, durationMinutes: number): AvailabilityStatus {
  if (daySlots.length === 0) return "NO_DATA"
  const reqStart = scheduledAt.getHours() * 60 + scheduledAt.getMinutes()
  const reqEnd   = reqStart + durationMinutes
  for (const s of daySlots) {
    const sStart = toMins(s.startTime)
    const sEnd   = toMins(s.endTime)
    if (reqStart >= sStart && reqEnd <= sEnd) return "MATCH"
    if (reqStart < sEnd   && reqEnd > sStart) return "PARTIAL"
  }
  return "CONFLICT"
}

function findNextSlot(avails: Slot[], from: Date): string | undefined {
  for (let d = 0; d < 14; d++) {
    const day = new Date(from)
    day.setDate(from.getDate() + d)
    const daySlots = avails
      .filter(a => a.dayOfWeek === day.getDay())
      .sort((a, b) => toMins(a.startTime) - toMins(b.startTime))

    for (const slot of daySlots) {
      if (d === 0) {
        const nowMins = from.getHours() * 60 + from.getMinutes()
        if (toMins(slot.startTime) <= nowMins) continue
      }
      const dateStr = day.toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long",
      })
      return `${dateStr} à ${slot.startTime}`
    }
  }
  return undefined
}

// ── Vérification en mémoire (pour les endpoints de liste) ────────────────────
// Pass les disponibilités pré-chargées (avec doctorId si batch multi-médecins)
export function checkSlotInMemory(
  avails: Slot[],
  scheduledAt: Date,
  durationMinutes = 30
): SlotCheck {
  const daySlots = avails.filter(a => a.dayOfWeek === scheduledAt.getDay())
  const status   = computeStatus(daySlots, scheduledAt, durationMinutes)
  const check: SlotCheck = { status, label: STATUS_LABELS[status] }
  if (status === "CONFLICT") {
    check.suggestion = findNextSlot(avails, scheduledAt)
  }
  return check
}

// ── Pré-charge les disponibilités de plusieurs médecins en 1 requête ─────────
// Retourne Map<doctorId → slots[]>
export async function fetchAvailabilitiesForDoctors(
  doctorIds: string[]
): Promise<Map<string, Slot[]>> {
  if (doctorIds.length === 0) return new Map()
  const rows = await prisma.doctorAvailability.findMany({
    where:  { doctorId: { in: doctorIds } },
    select: { doctorId: true, dayOfWeek: true, startTime: true, endTime: true },
  })
  const map = new Map<string, Slot[]>()
  for (const r of rows) {
    const list = map.get(r.doctorId) ?? []
    list.push(r)
    map.set(r.doctorId, list)
  }
  return map
}

// ── Vérification unitaire (DB) ────────────────────────────────────────────────
export async function checkSlotAgainstAvailability(
  doctorId: string,
  scheduledAt: Date,
  durationMinutes = 30
): Promise<SlotCheck> {
  const avails = await prisma.doctorAvailability.findMany({
    where:  { doctorId },
    select: { dayOfWeek: true, startTime: true, endTime: true },
  })
  return checkSlotInMemory(avails, scheduledAt, durationMinutes)
}
