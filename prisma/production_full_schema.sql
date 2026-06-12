-- ============================================================
-- SCHÉMA COMPLET MOBILE CLINIC — Base de production
-- Coller dans Supabase SQL Editor du projet qsvmbqqezfzdllwovzye
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN','CALL_CENTER_AGENT','MEDECIN','AGENT_TERRAIN','PATIENT','PHARMACIE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING','AWAITING_APPROVAL','APPROVED','REJECTED','PAYMENT_PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','PAID','FAILED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "HomeVisitType" AS ENUM ('CARE','SAMPLING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "HomeVisitStatus" AS ENUM ('PENDING','ASSIGNED','EN_ROUTE','ARRIVED','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "MedicalSpeciality" AS ENUM ('GENERALISTE','CARDIOLOGUE','DERMATOLOGUE','PEDIATRE','GYNECOLOGUE','OPHTALMOLOGUE','PSYCHIATRE','NEUROLOGUE','ORTHOPEDIE','AUTRE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "LabExamStatus" AS ENUM ('PENDING','ASSIGNED','SAMPLE_COLLECTED','IN_ANALYSIS','RESULTS_READY','DELIVERED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "LabExamType" AS ENUM ('BILAN_SANGUIN','GLYCEMIE','BILAN_LIPIDIQUE','BILAN_HEPATIQUE','BILAN_RENAL','BILAN_THYROIDIEN','EXAMEN_URINE','EXAMEN_SELLES','TEST_PALUDISME','TEST_VIH','TEST_GROSSESSE','BILAN_COMPLET','AUTRE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "NursingCareType" AS ENUM ('PRISE_TENSION','INJECTION','PANSEMENT','PERFUSION','PRISE_DE_SANG','SUIVI_POST_OPERATOIRE','ADMINISTRATION_MED','SOINS_PLAIE','AUTRE_SOIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "NursingCareStatus" AS ENUM ('PENDING','ASSIGNED','EN_ROUTE','IN_PROGRESS','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ElderlyCareType" AS ENUM ('SUIVI_MEDICAL','AIDE_MOBILITE','GESTION_MEDICAMENTS','SOINS_HYGIENE','COMPAGNIE_MEDICALISEE','REEDUCATION','BILAN_SANTE','AUTRE_ELDERLY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ElderlyCareFrequency" AS ENUM ('PONCTUEL','QUOTIDIEN','HEBDOMADAIRE','MENSUEL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "ElderlyCareStatus" AS ENUM ('PENDING','ASSIGNED','ACTIVE','EN_ROUTE','IN_PROGRESS','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "MedicamentCategorie" AS ENUM ('ANTIBIOTIQUE','ANALGESIQUE','ANTIPALUDEEN','ANTIHYPERTENSEUR','ANTIDIABETIQUE','ANTIINFLAMMATOIRE','ANTIPARASITAIRE','VITAMINES','CONTRACEPTIF','DERMATOLOGIE','OPHTALMOLOGIE','GASTROENTEROLOGIE','CARDIOVASCULAIRE','NEUROLOGIE','PEDIATRIE','AUTRE_MEDICAMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "CommandePharmacieStatus" AS ENUM ('PENDING','CONFIRMED','PREPARING','READY_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "OrdonnancePharmacieStatus" AS ENUM ('UPLOADED','PROCESSING','FOUND','PARTIALLY_FOUND','NOT_FOUND','ORDERED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE "TypeLivraison" AS ENUM ('CLICK_AND_COLLECT','LIVRAISON_DOMICILE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── TABLES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "User" (
  "id"           TEXT        NOT NULL,
  "email"        TEXT        NOT NULL,
  "phone"        TEXT        NOT NULL,
  "passwordHash" TEXT        NOT NULL,
  "role"         "Role"      NOT NULL,
  "isActive"     BOOLEAN     NOT NULL DEFAULT true,
  "isVerified"   BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt"  TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"  ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key"  ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_role_idx"  ON "User"("role");

CREATE TABLE IF NOT EXISTS "PatientProfile" (
  "id"               TEXT        NOT NULL,
  "userId"           TEXT        NOT NULL,
  "firstName"        TEXT        NOT NULL,
  "lastName"         TEXT        NOT NULL,
  "dateOfBirth"      TIMESTAMP(3) NOT NULL,
  "gender"           TEXT        NOT NULL,
  "bloodType"        TEXT,
  "address"          TEXT        NOT NULL,
  "city"             TEXT        NOT NULL,
  "medicalHistory"   TEXT,
  "allergies"        TEXT,
  "emergencyContact" TEXT,
  "avatarUrl"        TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PatientProfile_userId_key" ON "PatientProfile"("userId");

CREATE TABLE IF NOT EXISTS "DoctorProfile" (
  "id"                TEXT               NOT NULL,
  "userId"            TEXT               NOT NULL,
  "firstName"         TEXT               NOT NULL,
  "lastName"          TEXT               NOT NULL,
  "speciality"        "MedicalSpeciality" NOT NULL,
  "licenseNumber"     TEXT               NOT NULL,
  "isVerifiedByAdmin" BOOLEAN            NOT NULL DEFAULT false,
  "consultationFee"   DOUBLE PRECISION   NOT NULL,
  "bio"               TEXT,
  "avatarUrl"         TEXT,
  "availabilities"    JSONB,
  "createdAt"         TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DoctorProfile_userId_key"        ON "DoctorProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "DoctorProfile_licenseNumber_key" ON "DoctorProfile"("licenseNumber");

CREATE TABLE IF NOT EXISTS "AgentProfile" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "firstName" TEXT         NOT NULL,
  "lastName"  TEXT         NOT NULL,
  "zone"      TEXT         NOT NULL,
  "phone"     TEXT         NOT NULL,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentProfile_userId_key" ON "AgentProfile"("userId");

CREATE TABLE IF NOT EXISTS "Appointment" (
  "id"              TEXT                NOT NULL,
  "patientId"       TEXT                NOT NULL,
  "doctorId"        TEXT                NOT NULL,
  "callCenterId"    TEXT,
  "scheduledAt"     TIMESTAMP(3)        NOT NULL,
  "duration"        INTEGER             NOT NULL DEFAULT 30,
  "status"          "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
  "adminApprovedAt" TIMESTAMP(3),
  "adminApprovedBy" TEXT,
  "adminNote"       TEXT,
  "videoRoomUrl"    TEXT,
  "videoRoomName"   TEXT,
  "reason"          TEXT                NOT NULL,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Appointment_patientId_idx"   ON "Appointment"("patientId");
CREATE INDEX IF NOT EXISTS "Appointment_doctorId_idx"    ON "Appointment"("doctorId");
CREATE INDEX IF NOT EXISTS "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx"      ON "Appointment"("status");

CREATE TABLE IF NOT EXISTS "Consultation" (
  "id"              TEXT         NOT NULL,
  "appointmentId"   TEXT         NOT NULL,
  "clinicalNotes"   TEXT,
  "diagnosis"       TEXT,
  "prescriptionUrl" TEXT,
  "followUpDate"    TIMESTAMP(3),
  "duration"        INTEGER,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Consultation_appointmentId_key" ON "Consultation"("appointmentId");

CREATE TABLE IF NOT EXISTS "HomeVisit" (
  "id"          TEXT              NOT NULL,
  "patientId"   TEXT              NOT NULL,
  "agentId"     TEXT,
  "type"        "HomeVisitType"   NOT NULL,
  "status"      "HomeVisitStatus" NOT NULL DEFAULT 'PENDING',
  "address"     TEXT              NOT NULL,
  "city"        TEXT              NOT NULL,
  "scheduledAt" TIMESTAMP(3)      NOT NULL,
  "reason"      TEXT              NOT NULL,
  "notes"       TEXT,
  "photoUrl"    TEXT,
  "reportUrl"   TEXT,
  "reportText"  TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeVisit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HomeVisit_patientId_idx" ON "HomeVisit"("patientId");
CREATE INDEX IF NOT EXISTS "HomeVisit_agentId_idx"   ON "HomeVisit"("agentId");
CREATE INDEX IF NOT EXISTS "HomeVisit_status_idx"    ON "HomeVisit"("status");

CREATE TABLE IF NOT EXISTS "Payment" (
  "id"                    TEXT            NOT NULL,
  "userId"                TEXT            NOT NULL,
  "appointmentId"         TEXT,
  "homeVisitId"           TEXT,
  "labExamId"             TEXT,
  "nursingCareId"         TEXT,
  "elderlyCareId"         TEXT,
  "commandePharmacieId"   TEXT,
  "amount"                DOUBLE PRECISION NOT NULL,
  "currency"              TEXT             NOT NULL DEFAULT 'XAF',
  "method"                TEXT             NOT NULL,
  "status"                "PaymentStatus"  NOT NULL DEFAULT 'PENDING',
  "flwRef"                TEXT,
  "flwTxId"               TEXT,
  "receiptUrl"            TEXT,
  "refundedAt"            TIMESTAMP(3),
  "refundReason"          TEXT,
  "createdAt"             TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_appointmentId_key"       ON "Payment"("appointmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_homeVisitId_key"         ON "Payment"("homeVisitId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_labExamId_key"           ON "Payment"("labExamId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_nursingCareId_key"       ON "Payment"("nursingCareId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_elderlyCareId_key"       ON "Payment"("elderlyCareId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_commandePharmacieId_key" ON "Payment"("commandePharmacieId");
CREATE INDEX IF NOT EXISTS "Payment_userId_idx"  ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx"  ON "Payment"("status");

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"          TEXT         NOT NULL,
  "userId"      TEXT         NOT NULL,
  "type"        TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "message"     TEXT         NOT NULL,
  "isRead"      BOOLEAN      NOT NULL DEFAULT false,
  "sentBySMS"   BOOLEAN      NOT NULL DEFAULT false,
  "sentByEmail" BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         TEXT         NOT NULL,
  "userId"     TEXT         NOT NULL,
  "action"     TEXT         NOT NULL,
  "targetId"   TEXT,
  "targetType" TEXT,
  "details"    JSONB,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx"    ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx"    ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id"         TEXT         NOT NULL,
  "senderId"   TEXT         NOT NULL,
  "receiverId" TEXT         NOT NULL,
  "content"    TEXT         NOT NULL,
  "isRead"     BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_idx"   ON "ChatMessage"("senderId");
CREATE INDEX IF NOT EXISTS "ChatMessage_receiverId_idx" ON "ChatMessage"("receiverId");

CREATE TABLE IF NOT EXISTS "LabExam" (
  "id"              TEXT            NOT NULL,
  "patientId"       TEXT            NOT NULL,
  "agentId"         TEXT,
  "requestedById"   TEXT            NOT NULL,
  "examTypes"       "LabExamType"[] NOT NULL,
  "status"          "LabExamStatus" NOT NULL DEFAULT 'PENDING',
  "address"         TEXT            NOT NULL,
  "city"            TEXT            NOT NULL,
  "scheduledAt"     TIMESTAMP(3)    NOT NULL,
  "collectedAt"     TIMESTAMP(3),
  "resultsAt"       TIMESTAMP(3),
  "instructions"    TEXT,
  "agentNotes"      TEXT,
  "samplePhotoUrl"  TEXT,
  "resultFileUrl"   TEXT,
  "resultNotes"     TEXT,
  "prescriptionRef" TEXT,
  "createdAt"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabExam_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LabExam_patientId_idx" ON "LabExam"("patientId");
CREATE INDEX IF NOT EXISTS "LabExam_agentId_idx"   ON "LabExam"("agentId");
CREATE INDEX IF NOT EXISTS "LabExam_status_idx"    ON "LabExam"("status");

CREATE TABLE IF NOT EXISTS "NursingCare" (
  "id"              TEXT                NOT NULL,
  "patientId"       TEXT                NOT NULL,
  "agentId"         TEXT,
  "careTypes"       "NursingCareType"[] NOT NULL,
  "status"          "NursingCareStatus" NOT NULL DEFAULT 'PENDING',
  "address"         TEXT                NOT NULL,
  "city"            TEXT                NOT NULL,
  "scheduledAt"     TIMESTAMP(3)        NOT NULL,
  "completedAt"     TIMESTAMP(3),
  "duration"        INTEGER,
  "instructions"    TEXT,
  "materials"       TEXT,
  "agentNotes"      TEXT,
  "reportUrl"       TEXT,
  "photoUrl"        TEXT,
  "prescriptionRef" TEXT,
  "createdAt"       TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NursingCare_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "NursingCare_patientId_idx" ON "NursingCare"("patientId");
CREATE INDEX IF NOT EXISTS "NursingCare_agentId_idx"   ON "NursingCare"("agentId");
CREATE INDEX IF NOT EXISTS "NursingCare_status_idx"    ON "NursingCare"("status");

CREATE TABLE IF NOT EXISTS "ElderlyCare" (
  "id"           TEXT                   NOT NULL,
  "patientId"    TEXT                   NOT NULL,
  "agentId"      TEXT,
  "careTypes"    "ElderlyCareType"[]    NOT NULL,
  "frequency"    "ElderlyCareFrequency" NOT NULL DEFAULT 'PONCTUEL',
  "status"       "ElderlyCareStatus"    NOT NULL DEFAULT 'PENDING',
  "address"      TEXT                   NOT NULL,
  "city"         TEXT                   NOT NULL,
  "scheduledAt"  TIMESTAMP(3)           NOT NULL,
  "endDate"      TIMESTAMP(3),
  "completedAt"  TIMESTAMP(3),
  "duration"     INTEGER                NOT NULL DEFAULT 60,
  "patientAge"   INTEGER,
  "medicalNotes" TEXT,
  "mobilityLevel" TEXT,
  "agentNotes"   TEXT,
  "reportUrl"    TEXT,
  "createdAt"    TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElderlyCare_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ElderlyCare_patientId_idx" ON "ElderlyCare"("patientId");
CREATE INDEX IF NOT EXISTS "ElderlyCare_agentId_idx"   ON "ElderlyCare"("agentId");
CREATE INDEX IF NOT EXISTS "ElderlyCare_status_idx"    ON "ElderlyCare"("status");

CREATE TABLE IF NOT EXISTS "SupportChat" (
  "id"            TEXT         NOT NULL,
  "patientId"     TEXT         NOT NULL,
  "callCenterId"  TEXT,
  "subject"       TEXT         NOT NULL,
  "isOpen"        BOOLEAN      NOT NULL DEFAULT true,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportChat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportChat_patientId_idx"    ON "SupportChat"("patientId");
CREATE INDEX IF NOT EXISTS "SupportChat_callCenterId_idx" ON "SupportChat"("callCenterId");
CREATE INDEX IF NOT EXISTS "SupportChat_isOpen_idx"       ON "SupportChat"("isOpen");

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id"        TEXT         NOT NULL,
  "chatId"    TEXT         NOT NULL,
  "senderId"  TEXT         NOT NULL,
  "content"   TEXT         NOT NULL,
  "isRead"    BOOLEAN      NOT NULL DEFAULT false,
  "fileUrl"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportMessage_chatId_idx"   ON "SupportMessage"("chatId");
CREATE INDEX IF NOT EXISTS "SupportMessage_senderId_idx" ON "SupportMessage"("senderId");
CREATE INDEX IF NOT EXISTS "SupportMessage_isRead_idx"   ON "SupportMessage"("isRead");

-- Module Pharmacie
CREATE TABLE IF NOT EXISTS "PharmacieProfile" (
  "id"               TEXT             NOT NULL,
  "userId"           TEXT             NOT NULL,
  "nomPharmacie"     TEXT             NOT NULL,
  "numeroLicence"    TEXT             NOT NULL,
  "adresse"          TEXT             NOT NULL,
  "quartier"         TEXT             NOT NULL,
  "ville"            TEXT             NOT NULL DEFAULT 'Brazzaville',
  "telephone"        TEXT             NOT NULL,
  "email"            TEXT,
  "logoUrl"          TEXT,
  "photoUrl"         TEXT,
  "description"      TEXT,
  "horaires"         JSONB            NOT NULL DEFAULT '{}',
  "latitude"         DOUBLE PRECISION,
  "longitude"        DOUBLE PRECISION,
  "isVerified"       BOOLEAN          NOT NULL DEFAULT false,
  "isActive"         BOOLEAN          NOT NULL DEFAULT true,
  "accepteLivraison" BOOLEAN          NOT NULL DEFAULT false,
  "zoneLivraison"    TEXT,
  "notesMoyenne"     DOUBLE PRECISION DEFAULT 0,
  "nombreAvis"       INTEGER          NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PharmacieProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PharmacieProfile_userId_key"        ON "PharmacieProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PharmacieProfile_numeroLicence_key" ON "PharmacieProfile"("numeroLicence");
CREATE INDEX IF NOT EXISTS "PharmacieProfile_ville_idx"      ON "PharmacieProfile"("ville");
CREATE INDEX IF NOT EXISTS "PharmacieProfile_isVerified_idx" ON "PharmacieProfile"("isVerified");
CREATE INDEX IF NOT EXISTS "PharmacieProfile_isActive_idx"   ON "PharmacieProfile"("isActive");

CREATE TABLE IF NOT EXISTS "MedicamentStock" (
  "id"                TEXT                 NOT NULL,
  "pharmacieId"       TEXT                 NOT NULL,
  "nomMedicament"     TEXT                 NOT NULL,
  "nomGenerique"      TEXT,
  "marque"            TEXT,
  "categorie"         "MedicamentCategorie" NOT NULL,
  "description"       TEXT,
  "formeGalenique"    TEXT                 NOT NULL,
  "dosage"            TEXT,
  "conditionnement"   TEXT,
  "prixUnitaire"      DOUBLE PRECISION     NOT NULL,
  "quantiteStock"     INTEGER              NOT NULL DEFAULT 0,
  "stockMinimum"      INTEGER              NOT NULL DEFAULT 5,
  "photoUrl"          TEXT,
  "ordonnanceRequise" BOOLEAN              NOT NULL DEFAULT false,
  "estDisponible"     BOOLEAN              NOT NULL DEFAULT true,
  "createdAt"         TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicamentStock_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MedicamentStock_pharmacieId_idx"              ON "MedicamentStock"("pharmacieId");
CREATE INDEX IF NOT EXISTS "MedicamentStock_nomMedicament_idx"            ON "MedicamentStock"("nomMedicament");
CREATE INDEX IF NOT EXISTS "MedicamentStock_categorie_idx"                ON "MedicamentStock"("categorie");
CREATE INDEX IF NOT EXISTS "MedicamentStock_estDisponible_idx"            ON "MedicamentStock"("estDisponible");
CREATE INDEX IF NOT EXISTS "MedicamentStock_nomMedicament_pharmacieId_idx" ON "MedicamentStock"("nomMedicament","pharmacieId");

CREATE TABLE IF NOT EXISTS "OrdonnancePharmacieRequest" (
  "id"                 TEXT                        NOT NULL,
  "patientId"          TEXT                        NOT NULL,
  "callCenterId"       TEXT,
  "ordonnanceUrl"      TEXT                        NOT NULL,
  "ordonnanceType"     TEXT                        NOT NULL,
  "prescriptionId"     TEXT,
  "status"             "OrdonnancePharmacieStatus" NOT NULL DEFAULT 'UPLOADED',
  "notesCallCenter"    TEXT,
  "medicamentsTrouves" JSONB,
  "commandeId"         TEXT,
  "createdAt"          TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrdonnancePharmacieRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrdonnancePharmacieRequest_patientId_idx" ON "OrdonnancePharmacieRequest"("patientId");
CREATE INDEX IF NOT EXISTS "OrdonnancePharmacieRequest_status_idx"    ON "OrdonnancePharmacieRequest"("status");

CREATE TABLE IF NOT EXISTS "CommandePharmacie" (
  "id"               TEXT                     NOT NULL,
  "patientId"        TEXT                     NOT NULL,
  "pharmacieId"      TEXT                     NOT NULL,
  "agentId"          TEXT,
  "typeLivraison"    "TypeLivraison"          NOT NULL,
  "status"           "CommandePharmacieStatus" NOT NULL DEFAULT 'PENDING',
  "adresseLivraison" TEXT,
  "villeLivraison"   TEXT,
  "instructions"     TEXT,
  "montantTotal"     DOUBLE PRECISION         NOT NULL,
  "montantLivraison" DOUBLE PRECISION         NOT NULL DEFAULT 0,
  "ordonnanceUrl"    TEXT,
  "confirmedAt"      TIMESTAMP(3),
  "preparedAt"       TIMESTAMP(3),
  "deliveredAt"      TIMESTAMP(3),
  "cancelledAt"      TIMESTAMP(3),
  "cancelReason"     TEXT,
  "agentNotes"       TEXT,
  "createdAt"        TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommandePharmacie_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CommandePharmacie_patientId_idx"   ON "CommandePharmacie"("patientId");
CREATE INDEX IF NOT EXISTS "CommandePharmacie_pharmacieId_idx" ON "CommandePharmacie"("pharmacieId");
CREATE INDEX IF NOT EXISTS "CommandePharmacie_agentId_idx"     ON "CommandePharmacie"("agentId");
CREATE INDEX IF NOT EXISTS "CommandePharmacie_status_idx"      ON "CommandePharmacie"("status");

CREATE TABLE IF NOT EXISTS "LigneCommandePharmacie" (
  "id"           TEXT             NOT NULL,
  "commandeId"   TEXT             NOT NULL,
  "medicamentId" TEXT             NOT NULL,
  "quantite"     INTEGER          NOT NULL,
  "prixUnitaire" DOUBLE PRECISION NOT NULL,
  "sousTotal"    DOUBLE PRECISION NOT NULL,
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LigneCommandePharmacie_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LigneCommandePharmacie_commandeId_idx"   ON "LigneCommandePharmacie"("commandeId");
CREATE INDEX IF NOT EXISTS "LigneCommandePharmacie_medicamentId_idx" ON "LigneCommandePharmacie"("medicamentId");

CREATE TABLE IF NOT EXISTS "AvisPharmacie" (
  "id"          TEXT         NOT NULL,
  "patientId"   TEXT         NOT NULL,
  "pharmacieId" TEXT         NOT NULL,
  "note"        INTEGER      NOT NULL,
  "commentaire" TEXT,
  "commandeId"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvisPharmacie_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AvisPharmacie_patientId_pharmacieId_commandeId_key" ON "AvisPharmacie"("patientId","pharmacieId","commandeId");
CREATE INDEX IF NOT EXISTS "AvisPharmacie_pharmacieId_idx" ON "AvisPharmacie"("pharmacieId");

-- ─── CLÉS ÉTRANGÈRES ──────────────────────────────────────────────────────────

DO $$ BEGIN ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_callCenterId_fkey" FOREIGN KEY ("callCenterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "HomeVisit" ADD CONSTRAINT "HomeVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "HomeVisit" ADD CONSTRAINT "HomeVisit_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_homeVisitId_fkey" FOREIGN KEY ("homeVisitId") REFERENCES "HomeVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_labExamId_fkey" FOREIGN KEY ("labExamId") REFERENCES "LabExam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_nursingCareId_fkey" FOREIGN KEY ("nursingCareId") REFERENCES "NursingCare"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_elderlyCareId_fkey" FOREIGN KEY ("elderlyCareId") REFERENCES "ElderlyCare"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_commandePharmacieId_fkey" FOREIGN KEY ("commandePharmacieId") REFERENCES "CommandePharmacie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "LabExam" ADD CONSTRAINT "LabExam_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "LabExam" ADD CONSTRAINT "LabExam_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "LabExam" ADD CONSTRAINT "LabExam_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "NursingCare" ADD CONSTRAINT "NursingCare_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "NursingCare" ADD CONSTRAINT "NursingCare_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "ElderlyCare" ADD CONSTRAINT "ElderlyCare_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ElderlyCare" ADD CONSTRAINT "ElderlyCare_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "SupportChat" ADD CONSTRAINT "SupportChat_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "SupportChat" ADD CONSTRAINT "SupportChat_callCenterId_fkey" FOREIGN KEY ("callCenterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "SupportChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "PharmacieProfile" ADD CONSTRAINT "PharmacieProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "MedicamentStock" ADD CONSTRAINT "MedicamentStock_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "PharmacieProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "OrdonnancePharmacieRequest" ADD CONSTRAINT "OrdonnancePharmacieRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "OrdonnancePharmacieRequest" ADD CONSTRAINT "OrdonnancePharmacieRequest_callCenterId_fkey" FOREIGN KEY ("callCenterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "CommandePharmacie" ADD CONSTRAINT "CommandePharmacie_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "CommandePharmacie" ADD CONSTRAINT "CommandePharmacie_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "PharmacieProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "CommandePharmacie" ADD CONSTRAINT "CommandePharmacie_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "LigneCommandePharmacie" ADD CONSTRAINT "LigneCommandePharmacie_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandePharmacie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "LigneCommandePharmacie" ADD CONSTRAINT "LigneCommandePharmacie_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "MedicamentStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TABLE "AvisPharmacie" ADD CONSTRAINT "AvisPharmacie_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "AvisPharmacie" ADD CONSTRAINT "AvisPharmacie_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "PharmacieProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── UTILISATEUR ADMIN INITIAL ───────────────────────────────────────────────

INSERT INTO "User" (id, email, phone, "passwordHash", role, "isActive", "isVerified", "createdAt", "updatedAt")
VALUES (
  'prod-admin-001',
  'elengadarlon97@gmail.com',
  '+242060000000',
  crypt('Elenga@2026', gen_salt('bf', 10)),
  'SUPER_ADMIN',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
