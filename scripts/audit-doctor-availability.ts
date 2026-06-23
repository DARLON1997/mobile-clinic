import { prisma } from "../src/lib/prisma"
import { SPECIALITY_LABELS } from "../src/lib/specialities"

const KNOWN_SPECIALITIES = Object.keys(SPECIALITY_LABELS)

async function audit() {
  const doctors = await prisma.user.findMany({
    where:   { role: "MEDECIN" },
    include: { doctorProfile: true, cabinet: true },
    orderBy: { createdAt: "asc" },
  })

  console.log(`\n${"═".repeat(60)}`)
  console.log(`  AUDIT DISPONIBILITÉ MÉDECINS — ${new Date().toLocaleString("fr-FR")}`)
  console.log(`  ${doctors.length} médecin(s) en base`)
  console.log(`${"═".repeat(60)}\n`)

  let issues = 0

  for (const doc of doctors) {
    const dp      = doc.doctorProfile
    const cabinet = doc.cabinet
    const name    = dp ? `Dr ${dp.firstName} ${dp.lastName}` : `[SANS PROFIL] ${doc.email}`
    const reasons: string[] = []

    if (!dp)                   reasons.push("❌ Pas de DoctorProfile")
    if (!doc.isActive)         reasons.push("⏸  Compte désactivé (isActive=false)")
    if (dp && !dp.isVerifiedByAdmin) reasons.push("⏳ Non vérifié par admin (isVerifiedByAdmin=false)")

    const specialityOk = dp ? KNOWN_SPECIALITIES.includes(dp.speciality) : false
    if (dp && !specialityOk)  reasons.push(`⚠️  Spécialité inconnue : "${dp.speciality}"`)

    const visibleVideo      = doc.isActive && !!dp?.isVerifiedByAdmin
    const visiblePresentiel = visibleVideo && !!cabinet

    const icon = reasons.length === 0 ? "✅" : "⚠️ "
    if (reasons.length > 0) issues++

    console.log(`${icon} ${name}`)
    console.log(`   Email      : ${doc.email}`)
    console.log(`   Spécialité : ${dp ? (SPECIALITY_LABELS[dp.speciality] ?? dp.speciality) : "—"}`)
    console.log(`   Tarif      : ${dp ? `${dp.consultationFee} XAF` : "—"}`)
    console.log(`   Vidéo      : ${visibleVideo ? "✅ Visible" : "❌ Invisible"}`)
    console.log(`   Présentiel : ${visiblePresentiel ? "✅ Visible" : cabinet ? "❌ Invisible (compte)" : "— Pas de cabinet"}`)
    if (reasons.length > 0) {
      console.log(`   Problèmes  :`)
      reasons.forEach(r => console.log(`     ${r}`))
    }
    console.log()
  }

  console.log(`${"─".repeat(60)}`)
  if (issues === 0) {
    console.log("✅ Tous les médecins sont correctement configurés.")
  } else {
    console.log(`⚠️  ${issues} médecin(s) avec des problèmes de visibilité.`)
  }
  console.log()
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
