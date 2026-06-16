-- ============================================================
-- PATCH Mobile Clinic — ajoute uniquement ce qui manque
-- Sûr à exécuter plusieurs fois (idempotent)
-- ============================================================

-- 1. Enum PresentielStatus (nouveau)
DO $$ BEGIN
  CREATE TYPE "PresentielStatus" AS ENUM (
    'EN_ATTENTE', 'NOUVEAU_CRENEAU', 'CRENEAU_ACCEPTE',
    'CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE', 'ABSENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table CabinetMedecin (si absente)
CREATE TABLE IF NOT EXISTS "CabinetMedecin" (
    "id"        TEXT NOT NULL,
    "doctorId"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "address"   TEXT NOT NULL,
    "city"      TEXT NOT NULL,
    "phone"     TEXT NOT NULL,
    "email"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CabinetMedecin_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "CabinetMedecin" ADD CONSTRAINT "CabinetMedecin_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "CabinetMedecin_doctorId_key" ON "CabinetMedecin"("doctorId");
CREATE INDEX IF NOT EXISTS "CabinetMedecin_doctorId_idx" ON "CabinetMedecin"("doctorId");

-- 3. Table RendezVousPresentiel (nouvelle)
CREATE TABLE IF NOT EXISTS "RendezVousPresentiel" (
    "id"          TEXT NOT NULL,
    "patientId"   TEXT NOT NULL,
    "doctorId"    TEXT NOT NULL,
    "callCenterId" TEXT,
    "cabinetId"   TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration"    INTEGER NOT NULL DEFAULT 30,
    "status"      "PresentielStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "reason"      TEXT NOT NULL,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RendezVousPresentiel_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "RendezVousPresentiel" ADD CONSTRAINT "RendezVousPresentiel_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RendezVousPresentiel" ADD CONSTRAINT "RendezVousPresentiel_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RendezVousPresentiel" ADD CONSTRAINT "RendezVousPresentiel_callCenterId_fkey"
    FOREIGN KEY ("callCenterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "RendezVousPresentiel" ADD CONSTRAINT "RendezVousPresentiel_cabinetId_fkey"
    FOREIGN KEY ("cabinetId") REFERENCES "CabinetMedecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "RendezVousPresentiel_patientId_idx" ON "RendezVousPresentiel"("patientId");
CREATE INDEX IF NOT EXISTS "RendezVousPresentiel_doctorId_idx"  ON "RendezVousPresentiel"("doctorId");
CREATE INDEX IF NOT EXISTS "RendezVousPresentiel_cabinetId_idx" ON "RendezVousPresentiel"("cabinetId");
CREATE INDEX IF NOT EXISTS "RendezVousPresentiel_status_idx"    ON "RendezVousPresentiel"("status");

-- 4. Colonnes manquantes sur Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "commandePharmacieId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "presentielId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_commandePharmacieId_key" ON "Payment"("commandePharmacieId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_presentielId_key" ON "Payment"("presentielId");
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_commandePharmacieId_fkey"
    FOREIGN KEY ("commandePharmacieId") REFERENCES "CommandePharmacie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_presentielId_fkey"
    FOREIGN KEY ("presentielId") REFERENCES "RendezVousPresentiel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
