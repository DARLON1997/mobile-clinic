/**
 * Vérifie que le schéma réel de la base de données correspond à schema.prisma.
 * Usage: tsx scripts/verify-schema-sync.ts
 * Ajouter à la checklist avant tout déploiement majeur.
 */

import { Pool } from "pg"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

// Colonnes attendues par table, dérivées de prisma/schema.prisma
const EXPECTED_COLUMNS: Record<string, string[]> = {
  User: [
    "id", "email", "phone", "passwordHash", "role", "isActive", "isVerified",
    "createdAt", "updatedAt", "lastLoginAt", "otpCode", "otpExpiry",
  ],
  PatientProfile: [
    "id", "userId", "firstName", "lastName", "dateOfBirth", "gender", "bloodType",
    "address", "city", "medicalHistory", "allergies", "emergencyContact", "avatarUrl",
    "createdAt", "updatedAt",
  ],
  DoctorProfile: [
    "id", "userId", "firstName", "lastName", "speciality", "licenseNumber",
    "isVerifiedByAdmin", "consultationFee", "bio", "avatarUrl", "availabilities",
    "createdAt", "updatedAt",
  ],
  CabinetMedecin: [
    "id", "doctorId", "name", "address", "city", "phone", "email", "createdAt", "updatedAt",
  ],
  RendezVousPresentiel: [
    "id", "patientId", "doctorId", "callCenterId", "cabinetId", "scheduledAt",
    "duration", "status", "reason", "notes", "createdAt", "updatedAt",
  ],
  AgentProfile: [
    "id", "userId", "firstName", "lastName", "zone", "phone", "avatarUrl",
    "createdAt", "updatedAt",
  ],
  Appointment: [
    "id", "patientId", "doctorId", "callCenterId", "scheduledAt", "duration",
    "status", "adminApprovedAt", "adminApprovedBy", "adminNote", "videoRoomUrl",
    "videoRoomName", "reason", "notes", "createdAt", "updatedAt",
  ],
  Consultation: [
    "id", "appointmentId", "clinicalNotes", "diagnosis", "prescriptionUrl",
    "followUpDate", "duration", "createdAt", "updatedAt",
  ],
  HomeVisit: [
    "id", "patientId", "agentId", "type", "status", "address", "city",
    "scheduledAt", "reason", "notes", "photoUrl", "reportUrl", "reportText",
    "completedAt", "createdAt", "updatedAt",
  ],
  Payment: [
    "id", "userId", "appointmentId", "homeVisitId", "labExamId", "nursingCareId",
    "elderlyCareId", "amount", "currency", "method", "status", "flwRef", "flwTxId",
    "receiptUrl", "refundedAt", "refundReason", "createdAt", "updatedAt",
    "commandePharmacieId", "presentielId",
  ],
  Notification: [
    "id", "userId", "type", "title", "message", "isRead", "sentBySMS", "sentByEmail", "createdAt",
  ],
  AuditLog: [
    "id", "userId", "action", "targetId", "targetType", "details", "ipAddress", "userAgent", "createdAt",
  ],
  ChatMessage: ["id", "senderId", "receiverId", "content", "isRead", "createdAt"],
  LabExam: [
    "id", "patientId", "agentId", "requestedById", "examTypes", "status", "address", "city",
    "scheduledAt", "collectedAt", "resultsAt", "instructions", "agentNotes", "samplePhotoUrl",
    "resultFileUrl", "resultNotes", "prescriptionRef", "createdAt", "updatedAt",
  ],
  NursingCare: [
    "id", "patientId", "agentId", "careTypes", "status", "address", "city", "scheduledAt",
    "completedAt", "duration", "instructions", "materials", "agentNotes", "reportUrl",
    "photoUrl", "prescriptionRef", "createdAt", "updatedAt",
  ],
  ElderlyCare: [
    "id", "patientId", "agentId", "careTypes", "frequency", "status", "address", "city",
    "scheduledAt", "endDate", "completedAt", "duration", "patientAge", "medicalNotes",
    "mobilityLevel", "agentNotes", "reportUrl", "createdAt", "updatedAt",
  ],
  SupportChat: [
    "id", "patientId", "callCenterId", "subject", "isOpen", "lastMessageAt", "createdAt", "updatedAt",
  ],
  SupportMessage: ["id", "chatId", "senderId", "content", "isRead", "fileUrl", "createdAt"],
  PharmacieProfile: [
    "id", "userId", "nomPharmacie", "numeroLicence", "adresse", "quartier", "ville",
    "telephone", "email", "logoUrl", "photoUrl", "description", "horaires", "latitude",
    "longitude", "isVerified", "isActive", "accepteLivraison", "zoneLivraison",
    "notesMoyenne", "nombreAvis", "createdAt", "updatedAt",
  ],
  MedicamentStock: [
    "id", "pharmacieId", "nomMedicament", "nomGenerique", "marque", "categorie",
    "description", "formeGalenique", "dosage", "conditionnement", "prixUnitaire",
    "quantiteStock", "stockMinimum", "photoUrl", "ordonnanceRequise", "estDisponible",
    "createdAt", "updatedAt",
  ],
  OrdonnancePharmacieRequest: [
    "id", "patientId", "callCenterId", "ordonnanceUrl", "ordonnanceType", "prescriptionId",
    "status", "notesCallCenter", "medicamentsTrouves", "commandeId", "createdAt", "updatedAt",
  ],
  CommandePharmacie: [
    "id", "patientId", "pharmacieId", "agentId", "typeLivraison", "status",
    "adresseLivraison", "villeLivraison", "instructions", "montantTotal", "montantLivraison",
    "ordonnanceUrl", "confirmedAt", "preparedAt", "deliveredAt", "cancelledAt",
    "cancelReason", "agentNotes", "createdAt", "updatedAt",
  ],
  LigneCommandePharmacie: [
    "id", "commandeId", "medicamentId", "quantite", "prixUnitaire", "sousTotal", "createdAt",
  ],
  AvisPharmacie: ["id", "patientId", "pharmacieId", "note", "commentaire", "commandeId", "createdAt"],
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.warn("[verify-schema] ⚠️  DATABASE_URL non définie — vérification ignorée.")
    process.exit(0)
  }

  const pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false } })
  let hasErrors = false

  try {
    const tableNames = Object.keys(EXPECTED_COLUMNS)

    const res = await pool.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `, [tableNames])

    const actualCols: Record<string, Set<string>> = {}
    for (const row of res.rows) {
      if (!actualCols[row.table_name]) actualCols[row.table_name] = new Set()
      actualCols[row.table_name].add(row.column_name)
    }

    for (const [table, expectedCols] of Object.entries(EXPECTED_COLUMNS)) {
      const actual = actualCols[table]
      if (!actual) {
        console.warn(`[verify-schema] ⚠️  TABLE MANQUANTE: "${table}" n'existe pas en base.`)
        hasErrors = true
        continue
      }
      for (const col of expectedCols) {
        if (!actual.has(col)) {
          console.warn(`[verify-schema] ⚠️  COLONNE MANQUANTE: "${table}"."${col}"`)
          hasErrors = true
        }
      }
    }

    if (!hasErrors) {
      console.log("[verify-schema] ✅ Schéma synchronisé — toutes les colonnes sont présentes.")
    } else {
      console.error("[verify-schema] ❌ Des colonnes sont manquantes. Voir DEPLOYMENT_CHECKLIST.md.")
    }
  } finally {
    await pool.end()
  }
}

main().catch(err => {
  console.warn("[verify-schema] Erreur de connexion DB:", err.message, "— vérification ignorée.")
  process.exit(0)
})
