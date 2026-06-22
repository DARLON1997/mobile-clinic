-- Migration : Dossier médical enrichi
-- À appliquer dans Supabase SQL Editor

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE "PresentielUrgence" AS ENUM ('EVENTUEL', 'OBLIGATOIRE', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExamenPrescritStatut" AS ENUM ('EN_ATTENTE', 'EFFECTUE', 'RESULTATS_RECUS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Champs sur la table Consultation
ALTER TABLE "Consultation"
  ADD COLUMN IF NOT EXISTS "signesSubjectifs"      TEXT,
  ADD COLUMN IF NOT EXISTS "hypothesesDiagnostic"  TEXT,
  ADD COLUMN IF NOT EXISTS "prescriptionTexte"     TEXT,
  ADD COLUMN IF NOT EXISTS "presentielRecommande"  "PresentielUrgence",
  ADD COLUMN IF NOT EXISTS "presentielMotif"       TEXT,
  ADD COLUMN IF NOT EXISTS "presentielNotifieAt"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "presentielTraiteParId" TEXT,
  ADD COLUMN IF NOT EXISTS "presentielTraiteAt"    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "ordonnancePhotoUrl"    TEXT,
  ADD COLUMN IF NOT EXISTS "ordonnanceEnvoyeeAt"   TIMESTAMPTZ;

-- FK Call Center qui traite l'alerte
ALTER TABLE "Consultation"
  DROP CONSTRAINT IF EXISTS "Consultation_presentielTraiteParId_fkey";
ALTER TABLE "Consultation"
  ADD CONSTRAINT "Consultation_presentielTraiteParId_fkey"
  FOREIGN KEY ("presentielTraiteParId") REFERENCES "User"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index
CREATE INDEX IF NOT EXISTS "Consultation_presentielRecommande_idx"
  ON "Consultation"("presentielRecommande");

-- 3. Table ExamenPrescrit
CREATE TABLE IF NOT EXISTS "ExamenPrescrit" (
  "id"             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "consultationId" TEXT        NOT NULL,
  "patientId"      TEXT        NOT NULL,
  "doctorId"       TEXT        NOT NULL,
  "typeExamen"     TEXT        NOT NULL,
  "instructions"   TEXT,
  "statut"         "ExamenPrescritStatut" NOT NULL DEFAULT 'EN_ATTENTE',
  "resultatNote"   TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "ExamenPrescrit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExamenPrescrit_consultationId_fkey"
    FOREIGN KEY ("consultationId") REFERENCES "Consultation"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExamenPrescrit_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExamenPrescrit_doctorId_fkey"
    FOREIGN KEY ("doctorId")  REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExamenPrescrit_patientId_idx"      ON "ExamenPrescrit"("patientId");
CREATE INDEX IF NOT EXISTS "ExamenPrescrit_doctorId_idx"       ON "ExamenPrescrit"("doctorId");
CREATE INDEX IF NOT EXISTS "ExamenPrescrit_consultationId_idx" ON "ExamenPrescrit"("consultationId");
