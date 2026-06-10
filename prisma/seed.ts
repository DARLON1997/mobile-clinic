/**
 * Seed Mobile Clinic — Données de test réalistes
 * Usage : npx prisma db seed
 *
 * Comptes créés :
 *   admin@mobileclinic.cg         / Admin@2025
 *   callcenter@mobileclinic.cg    / CallCenter@2025
 *   dr.mbemba@mobileclinic.cg     / Doctor@2025  (Généraliste)
 *   dr.moukala@mobileclinic.cg    / Doctor@2025  (Cardiologue)
 *   dr.itoua@mobileclinic.cg      / Doctor@2025  (Pédiatre)
 *   agent.terrain@mobileclinic.cg / Agent@2025
 *   patient1@test.cg              / Patient@2025 (Jean Kimboula, Brazzaville)
 *   patient2@test.cg              / Patient@2025 (Marie Ngoma, Pointe-Noire)
 */

import { readFileSync } from "fs"
import { resolve }      from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg }     from "@prisma/adapter-pg"
import bcrypt           from "bcryptjs"

// Charge .env.local comme Next.js
function loadEnv(file: string) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf-8").split("\n")) {
      const m = line.match(/^([^#\s][^=]*)=(.*)$/)
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* ignoré */ }
}
loadEnv(".env.local")
loadEnv(".env")

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma  = new PrismaClient({ adapter, log: ["warn", "error"] })

const SALT_ROUNDS = 12

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

async function main() {
  console.log("🌱 Début du seed Mobile Clinic…\n")

  // ── 1. Super Admin ──────────────────────────────────────────────────────────
  console.log("👤 Création : Super Admin")
  const adminHash = await hashPassword("Admin@2025")
  await prisma.user.upsert({
    where: { email: "admin@mobileclinic.cg" },
    update: {},
    create: {
      email:        "admin@mobileclinic.cg",
      phone:        "+242060000001",
      passwordHash: adminHash,
      role:         "SUPER_ADMIN",
      isActive:     true,
      isVerified:   true,
    },
  })

  // ── 2. Agent Call Center ────────────────────────────────────────────────────
  console.log("📞 Création : Call Center Agent")
  const ccHash = await hashPassword("CallCenter@2025")
  await prisma.user.upsert({
    where: { email: "callcenter@mobileclinic.cg" },
    update: {},
    create: {
      email:        "callcenter@mobileclinic.cg",
      phone:        "+242060000002",
      passwordHash: ccHash,
      role:         "CALL_CENTER_AGENT",
      isActive:     true,
      isVerified:   true,
    },
  })

  // ── 3. Médecins ─────────────────────────────────────────────────────────────
  const doctorHash = await hashPassword("Doctor@2025")

  const doctors = [
    {
      email:     "dr.mbemba@mobileclinic.cg",
      phone:     "+242060000010",
      firstName: "Jacques",
      lastName:  "Mbemba",
      speciality: "GENERALISTE" as const,
      licenseNumber: "MC-DR-001",
      consultationFee: 10000,
    },
    {
      email:     "dr.moukala@mobileclinic.cg",
      phone:     "+242060000011",
      firstName: "Carine",
      lastName:  "Moukala",
      speciality: "CARDIOLOGUE" as const,
      licenseNumber: "MC-DR-002",
      consultationFee: 20000,
    },
    {
      email:     "dr.itoua@mobileclinic.cg",
      phone:     "+242060000012",
      firstName: "Aristide",
      lastName:  "Itoua",
      speciality: "PEDIATRE" as const,
      licenseNumber: "MC-DR-003",
      consultationFee: 15000,
    },
  ]

  for (const doc of doctors) {
    console.log(`🩺 Création : Dr ${doc.firstName} ${doc.lastName} (${doc.speciality})`)
    await prisma.user.upsert({
      where: { email: doc.email },
      update: {},
      create: {
        email:        doc.email,
        phone:        doc.phone,
        passwordHash: doctorHash,
        role:         "MEDECIN",
        isActive:     true,
        isVerified:   true,
        doctorProfile: {
          create: {
            firstName:         doc.firstName,
            lastName:          doc.lastName,
            speciality:        doc.speciality,
            licenseNumber:     doc.licenseNumber,
            isVerifiedByAdmin: true,
            consultationFee:   doc.consultationFee,
            bio: `Médecin ${doc.speciality.toLowerCase()} expérimenté, exerçant à Brazzaville depuis plus de 10 ans.`,
            availabilities: {
              monday:    ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
              tuesday:   ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
              wednesday: ["09:00", "10:00", "11:00"],
              thursday:  ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
              friday:    ["09:00", "10:00", "11:00", "14:00", "15:00"],
            },
          },
        },
      },
    })
  }

  // ── 4. Agent Terrain ─────────────────────────────────────────────────────────
  console.log("🗺️  Création : Agent Terrain")
  const agentHash = await hashPassword("Agent@2025")
  await prisma.user.upsert({
    where: { email: "agent.terrain@mobileclinic.cg" },
    update: {},
    create: {
      email:        "agent.terrain@mobileclinic.cg",
      phone:        "+242060000020",
      passwordHash: agentHash,
      role:         "AGENT_TERRAIN",
      isActive:     true,
      isVerified:   true,
      agentProfile: {
        create: {
          firstName: "Rodrigue",
          lastName:  "Nkouka",
          zone:      "Brazzaville Centre",
          phone:     "+242060000020",
        },
      },
    },
  })

  // ── 5. Patients ──────────────────────────────────────────────────────────────
  const patientHash = await hashPassword("Patient@2025")

  const patients = [
    {
      email:           "patient1@test.cg",
      phone:           "+242070000001",
      firstName:       "Jean",
      lastName:        "Kimboula",
      dateOfBirth:     new Date("1990-03-15"),
      gender:          "M",
      bloodType:       "O+",
      address:         "Quartier Bacongo, Rue des Lilas",
      city:            "Brazzaville",
      emergencyContact: "Marie Kimboula — +242070000099",
    },
    {
      email:       "patient2@test.cg",
      phone:       "+242070000002",
      firstName:   "Marie",
      lastName:    "Ngoma",
      dateOfBirth: new Date("1985-07-22"),
      gender:      "F",
      bloodType:   "A+",
      address:     "Loandjili, Avenue de la Mer",
      city:        "Pointe-Noire",
      allergies:   "Pénicilline",
      emergencyContact: "Pierre Ngoma — +242070000098",
    },
  ]

  for (const p of patients) {
    console.log(`👥 Création : Patient ${p.firstName} ${p.lastName}`)
    await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email:        p.email,
        phone:        p.phone,
        passwordHash: patientHash,
        role:         "PATIENT",
        isActive:     true,
        isVerified:   true,
        patientProfile: {
          create: {
            firstName:        p.firstName,
            lastName:         p.lastName,
            dateOfBirth:      p.dateOfBirth,
            gender:           p.gender,
            bloodType:        p.bloodType ?? null,
            address:          p.address,
            city:             p.city,
            allergies:        "allergies" in p ? p.allergies : null,
            emergencyContact: p.emergencyContact ?? null,
          },
        },
      },
    })
  }

  // ── 6. RDV de test (entre Jean Kimboula et Dr Mbemba) ─────────────────────
  console.log("\n📅 Création : RDV de test")

  const patient1 = await prisma.user.findUnique({ where: { email: "patient1@test.cg" } })
  const doctor1  = await prisma.user.findUnique({ where: { email: "dr.mbemba@mobileclinic.cg" } })
  const admin    = await prisma.user.findUnique({ where: { email: "admin@mobileclinic.cg" } })

  if (patient1 && doctor1 && admin) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    futureDate.setHours(10, 0, 0, 0)

    await prisma.appointment.create({
      data: {
        patientId:       patient1.id,
        doctorId:        doctor1.id,
        scheduledAt:     futureDate,
        reason:          "Consultation générale — bilan de santé annuel",
        status:          "APPROVED",
        // RÈGLE DB-1 : adminApprovedAt est défini = accès autorisé
        adminApprovedAt: new Date(),
        adminApprovedBy: admin.id,
        adminNote:       "RDV de démonstration — approuvé pour les tests",
      },
    })
  }

  // ── 7. Mission de test (HomeVisit) ────────────────────────────────────────
  console.log("🏠 Création : HomeVisit de test")

  const patient2 = await prisma.user.findUnique({ where: { email: "patient2@test.cg" } })
  const agent    = await prisma.user.findUnique({ where: { email: "agent.terrain@mobileclinic.cg" } })

  if (patient2 && agent && admin) {
    const visitDate = new Date()
    visitDate.setDate(visitDate.getDate() + 1)
    visitDate.setHours(9, 30, 0, 0)

    await prisma.homeVisit.create({
      data: {
        patientId:   patient2.id,
        agentId:     agent.id,
        type:        "SAMPLING",
        status:      "ASSIGNED",
        address:     "Loandjili, Avenue de la Mer",
        city:        "Pointe-Noire",
        scheduledAt: visitDate,
        reason:      "Prélèvement sanguin — bilan lipidique",
        notes:       "Patiente à jeun depuis 12h. Sonnez 2 fois.",
      },
    })
  }

  // ── 8. Pharmacies de test ────────────────────────────────────────────────────
  console.log("\n💊 Création : Pharmacies de test")

  const pharmacieHash = await hashPassword("Pharmacie@2025")

  const defaultHoraires = {
    lundi:    { open: "08:00", close: "20:00", closed: false },
    mardi:    { open: "08:00", close: "20:00", closed: false },
    mercredi: { open: "08:00", close: "20:00", closed: false },
    jeudi:    { open: "08:00", close: "20:00", closed: false },
    vendredi: { open: "08:00", close: "20:00", closed: false },
    samedi:   { open: "09:00", close: "18:00", closed: false },
    dimanche: { open: "09:00", close: "14:00", closed: true },
  }

  const pharmaciesData = [
    {
      email:        "pharmacie.centrale@mobileclinic.cg",
      phone:        "+242060000030",
      nomPharmacie: "Pharmacie Centrale",
      numeroLicence: "PH-BZV-001",
      adresse:      "Avenue de l'Indépendance, Centre-ville",
      quartier:     "Centre-ville",
      isVerified:   true,
      accepteLivraison: true,
    },
    {
      email:        "pharmacie.plateau@mobileclinic.cg",
      phone:        "+242060000031",
      nomPharmacie: "Pharmacie du Plateau",
      numeroLicence: "PH-BZV-002",
      adresse:      "Rue du Plateau, Quartier Plateau",
      quartier:     "Plateau",
      isVerified:   true,
      accepteLivraison: false,
    },
    {
      email:        "pharmacie.poto@mobileclinic.cg",
      phone:        "+242060000032",
      nomPharmacie: "Pharmacie Poto-Poto",
      numeroLicence: "PH-BZV-003",
      adresse:      "Boulevard Denis Sassou Nguesso, Poto-Poto",
      quartier:     "Poto-Poto",
      isVerified:   false,
      accepteLivraison: true,
    },
  ]

  const medicamentsDeBase = [
    {
      nomMedicament: "Paracétamol 500mg",
      nomGenerique:  "Paracétamol",
      categorie:     "ANALGESIQUE" as const,
      formeGalenique: "Comprimé",
      dosage:        "500mg",
      conditionnement: "Boîte de 16 comprimés",
      prixUnitaire:  500,
      quantiteStock: 200,
      stockMinimum:  20,
      ordonnanceRequise: false,
    },
    {
      nomMedicament: "Amoxicilline 500mg",
      nomGenerique:  "Amoxicilline",
      categorie:     "ANTIBIOTIQUE" as const,
      formeGalenique: "Gélule",
      dosage:        "500mg",
      conditionnement: "Boîte de 16 gélules",
      prixUnitaire:  2500,
      quantiteStock: 80,
      stockMinimum:  10,
      ordonnanceRequise: true,
    },
    {
      nomMedicament: "Artémether-Luméfantrine",
      nomGenerique:  "Artémether",
      categorie:     "ANTIPALUDEEN" as const,
      formeGalenique: "Comprimé",
      dosage:        "20/120mg",
      conditionnement: "Boîte de 24 comprimés",
      prixUnitaire:  3500,
      quantiteStock: 60,
      stockMinimum:  10,
      ordonnanceRequise: false,
    },
    {
      nomMedicament: "Ibuprofène 400mg",
      nomGenerique:  "Ibuprofène",
      categorie:     "ANTIINFLAMMATOIRE" as const,
      formeGalenique: "Comprimé enrobé",
      dosage:        "400mg",
      conditionnement: "Boîte de 20 comprimés",
      prixUnitaire:  1000,
      quantiteStock: 150,
      stockMinimum:  15,
      ordonnanceRequise: false,
    },
    {
      nomMedicament: "Métronidazole 250mg",
      nomGenerique:  "Métronidazole",
      categorie:     "ANTIBIOTIQUE" as const,
      formeGalenique: "Comprimé",
      dosage:        "250mg",
      conditionnement: "Boîte de 20 comprimés",
      prixUnitaire:  1500,
      quantiteStock: 100,
      stockMinimum:  12,
      ordonnanceRequise: true,
    },
  ]

  for (const pharma of pharmaciesData) {
    console.log(`🏥 Création : ${pharma.nomPharmacie}`)
    const user = await prisma.user.upsert({
      where: { email: pharma.email },
      update: {},
      create: {
        email:        pharma.email,
        phone:        pharma.phone,
        passwordHash: pharmacieHash,
        role:         "PHARMACIE",
        isActive:     true,
        isVerified:   true,
        pharmacieProfile: {
          create: {
            nomPharmacie:    pharma.nomPharmacie,
            numeroLicence:   pharma.numeroLicence,
            adresse:         pharma.adresse,
            quartier:        pharma.quartier,
            ville:           "Brazzaville",
            telephone:       pharma.phone,
            email:           pharma.email,
            horaires:        defaultHoraires,
            isVerified:      pharma.isVerified,
            accepteLivraison: pharma.accepteLivraison,
          },
        },
      },
      include: { pharmacieProfile: true },
    })

    if (user.pharmacieProfile) {
      const pharmacieId = user.pharmacieProfile.id
      for (const med of medicamentsDeBase) {
        const existing = await prisma.medicamentStock.findFirst({
          where: { pharmacieId, nomMedicament: med.nomMedicament },
        })
        if (!existing) {
          await prisma.medicamentStock.create({ data: { pharmacieId, ...med } })
        }
      }
    }
  }

  console.log("\n✅ Seed terminé avec succès !\n")
  console.log("─────────────────────────────────────────────")
  console.log("  Comptes de test :")
  console.log("  admin@mobileclinic.cg                 / Admin@2025")
  console.log("  callcenter@mobileclinic.cg            / CallCenter@2025")
  console.log("  dr.mbemba@mobileclinic.cg             / Doctor@2025")
  console.log("  agent.terrain@mobileclinic.cg         / Agent@2025")
  console.log("  patient1@test.cg                      / Patient@2025")
  console.log("  patient2@test.cg                      / Patient@2025")
  console.log("  pharmacie.centrale@mobileclinic.cg    / Pharmacie@2025")
  console.log("  pharmacie.plateau@mobileclinic.cg     / Pharmacie@2025")
  console.log("  pharmacie.poto@mobileclinic.cg        / Pharmacie@2025")
  console.log("─────────────────────────────────────────────\n")
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed :", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
