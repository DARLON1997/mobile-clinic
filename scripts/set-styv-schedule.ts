/**
 * Configure le planning hebdomadaire de Dr. Styv :
 *   VIDEO     → 7j/7   14h–19h
 *   PRESENTIEL → lun–sam 8h–14h (dimanche = fermé)
 *
 * Usage : npx tsx scripts/set-styv-schedule.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const JOURS_SEMAINE = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"] as const
type Jour = typeof JOURS_SEMAINE[number]

const JOURS_PRESENTIEL: Jour[] = ["LUNDI","MARDI","MERCREDI","JEUDI","VENDREDI","SAMEDI"]

async function main() {
  // Trouver Dr. Styv par prénom (adapter si nécessaire)
  const styv = await prisma.user.findFirst({
    where: {
      role: "MEDECIN",
      doctorProfile: { firstName: { contains: "Styv", mode: "insensitive" } },
    },
    select: { id: true, doctorProfile: { select: { firstName: true, lastName: true } } },
  })

  if (!styv) {
    console.error("❌ Dr. Styv introuvable en base. Vérifiez le prénom.")
    process.exit(1)
  }
  console.log(`✅ Dr. ${styv.doctorProfile?.firstName} ${styv.doctorProfile?.lastName} (${styv.id})`)

  const entries: Array<{
    doctorId: string; jour: Jour; type: "VIDEO" | "PRESENTIEL"
    startTime: string; endTime: string; isActive: boolean
  }> = []

  for (const jour of JOURS_SEMAINE) {
    // VIDEO : actif tous les jours
    entries.push({ doctorId: styv.id, jour, type: "VIDEO",     startTime: "14:00", endTime: "19:00", isActive: true })
    // PRESENTIEL : actif lun–sam, fermé dim
    entries.push({ doctorId: styv.id, jour, type: "PRESENTIEL", startTime: "08:00", endTime: "14:00", isActive: JOURS_PRESENTIEL.includes(jour) })
  }

  await prisma.$transaction(
    entries.map((e) =>
      prisma.doctorWeeklySchedule.upsert({
        where:  { doctorId_jour_type: { doctorId: e.doctorId, jour: e.jour, type: e.type } },
        update: { startTime: e.startTime, endTime: e.endTime, isActive: e.isActive },
        create: e,
      })
    )
  )

  console.log(`✅ Planning configuré (${entries.length} entrées)`)
  console.log("   VIDEO      : 7j/7 14h–19h")
  console.log("   PRESENTIEL : lun–sam 8h–14h, dim fermé")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
