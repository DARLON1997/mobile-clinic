-- ============================================================
-- MIGRATION MODULE PHARMACIE — à coller dans Supabase SQL Editor
-- ============================================================

-- 1. Ajout de PHARMACIE dans l'enum Role existant
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PHARMACIE';

-- 2. Nouveaux enums
DO $$ BEGIN
  CREATE TYPE "MedicamentCategorie" AS ENUM (
    'ANTIBIOTIQUE','ANALGESIQUE','ANTIPALUDEEN','ANTIHYPERTENSEUR',
    'ANTIDIABETIQUE','ANTIINFLAMMATOIRE','ANTIPARASITAIRE','VITAMINES',
    'CONTRACEPTIF','DERMATOLOGIE','OPHTALMOLOGIE','GASTROENTEROLOGIE',
    'CARDIOVASCULAIRE','NEUROLOGIE','PEDIATRIE','AUTRE_MEDICAMENT'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CommandePharmacieStatus" AS ENUM (
    'PENDING','CONFIRMED','PREPARING','READY_PICKUP',
    'OUT_FOR_DELIVERY','DELIVERED','CANCELLED','REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OrdonnancePharmacieStatus" AS ENUM (
    'UPLOADED','PROCESSING','FOUND','PARTIALLY_FOUND','NOT_FOUND','ORDERED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TypeLivraison" AS ENUM (
    'CLICK_AND_COLLECT','LIVRAISON_DOMICILE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Nouvelle colonne sur Payment
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "commandePharmacieId" TEXT;

-- 4. Nouvelle table PharmacieProfile
CREATE TABLE IF NOT EXISTS "PharmacieProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nomPharmacie" TEXT NOT NULL,
    "numeroLicence" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "quartier" TEXT NOT NULL,
    "ville" TEXT NOT NULL DEFAULT 'Brazzaville',
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "logoUrl" TEXT,
    "photoUrl" TEXT,
    "description" TEXT,
    "horaires" JSONB NOT NULL DEFAULT '{}',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accepteLivraison" BOOLEAN NOT NULL DEFAULT false,
    "zoneLivraison" TEXT,
    "notesMoyenne" DOUBLE PRECISION DEFAULT 0,
    "nombreAvis" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacieProfile_pkey" PRIMARY KEY ("id")
);

-- 5. Nouvelle table MedicamentStock
CREATE TABLE IF NOT EXISTS "MedicamentStock" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "nomMedicament" TEXT NOT NULL,
    "nomGenerique" TEXT,
    "marque" TEXT,
    "categorie" "MedicamentCategorie" NOT NULL,
    "description" TEXT,
    "formeGalenique" TEXT NOT NULL,
    "dosage" TEXT,
    "conditionnement" TEXT,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "quantiteStock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimum" INTEGER NOT NULL DEFAULT 5,
    "photoUrl" TEXT,
    "ordonnanceRequise" BOOLEAN NOT NULL DEFAULT false,
    "estDisponible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedicamentStock_pkey" PRIMARY KEY ("id")
);

-- 6. Nouvelle table OrdonnancePharmacieRequest
CREATE TABLE IF NOT EXISTS "OrdonnancePharmacieRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "callCenterId" TEXT,
    "ordonnanceUrl" TEXT NOT NULL,
    "ordonnanceType" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "status" "OrdonnancePharmacieStatus" NOT NULL DEFAULT 'UPLOADED',
    "notesCallCenter" TEXT,
    "medicamentsTrouves" JSONB,
    "commandeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrdonnancePharmacieRequest_pkey" PRIMARY KEY ("id")
);

-- 7. Nouvelle table CommandePharmacie
CREATE TABLE IF NOT EXISTS "CommandePharmacie" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "agentId" TEXT,
    "typeLivraison" "TypeLivraison" NOT NULL,
    "status" "CommandePharmacieStatus" NOT NULL DEFAULT 'PENDING',
    "adresseLivraison" TEXT,
    "villeLivraison" TEXT,
    "instructions" TEXT,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantLivraison" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordonnanceUrl" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "preparedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "agentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommandePharmacie_pkey" PRIMARY KEY ("id")
);

-- 8. Nouvelle table LigneCommandePharmacie
CREATE TABLE IF NOT EXISTS "LigneCommandePharmacie" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "sousTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LigneCommandePharmacie_pkey" PRIMARY KEY ("id")
);

-- 9. Nouvelle table AvisPharmacie
CREATE TABLE IF NOT EXISTS "AvisPharmacie" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "commandeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvisPharmacie_pkey" PRIMARY KEY ("id")
);

-- 10. Index
CREATE UNIQUE INDEX IF NOT EXISTS "PharmacieProfile_userId_key" ON "PharmacieProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PharmacieProfile_numeroLicence_key" ON "PharmacieProfile"("numeroLicence");
CREATE INDEX IF NOT EXISTS "PharmacieProfile_ville_idx" ON "PharmacieProfile"("ville");
CREATE INDEX IF NOT EXISTS "PharmacieProfile_isVerified_idx" ON "PharmacieProfile"("isVerified");
CREATE INDEX IF NOT EXISTS "PharmacieProfile_isActive_idx" ON "PharmacieProfile"("isActive");
CREATE INDEX IF NOT EXISTS "MedicamentStock_pharmacieId_idx" ON "MedicamentStock"("pharmacieId");
CREATE INDEX IF NOT EXISTS "MedicamentStock_nomMedicament_idx" ON "MedicamentStock"("nomMedicament");
CREATE INDEX IF NOT EXISTS "MedicamentStock_categorie_idx" ON "MedicamentStock"("categorie");
CREATE INDEX IF NOT EXISTS "MedicamentStock_estDisponible_idx" ON "MedicamentStock"("estDisponible");
CREATE INDEX IF NOT EXISTS "MedicamentStock_nomMedicament_pharmacieId_idx" ON "MedicamentStock"("nomMedicament", "pharmacieId");
CREATE INDEX IF NOT EXISTS "OrdonnancePharmacieRequest_patientId_idx" ON "OrdonnancePharmacieRequest"("patientId");
CREATE INDEX IF NOT EXISTS "OrdonnancePharmacieRequest_status_idx" ON "OrdonnancePharmacieRequest"("status");
CREATE INDEX IF NOT EXISTS "CommandePharmacie_patientId_idx" ON "CommandePharmacie"("patientId");
CREATE INDEX IF NOT EXISTS "CommandePharmacie_pharmacieId_idx" ON "CommandePharmacie"("pharmacieId");
CREATE INDEX IF NOT EXISTS "CommandePharmacie_agentId_idx" ON "CommandePharmacie"("agentId");
CREATE INDEX IF NOT EXISTS "CommandePharmacie_status_idx" ON "CommandePharmacie"("status");
CREATE INDEX IF NOT EXISTS "LigneCommandePharmacie_commandeId_idx" ON "LigneCommandePharmacie"("commandeId");
CREATE INDEX IF NOT EXISTS "LigneCommandePharmacie_medicamentId_idx" ON "LigneCommandePharmacie"("medicamentId");
CREATE INDEX IF NOT EXISTS "AvisPharmacie_pharmacieId_idx" ON "AvisPharmacie"("pharmacieId");
CREATE UNIQUE INDEX IF NOT EXISTS "AvisPharmacie_patientId_pharmacieId_commandeId_key" ON "AvisPharmacie"("patientId", "pharmacieId", "commandeId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_commandePharmacieId_key" ON "Payment"("commandePharmacieId");

-- 11. Clés étrangères
ALTER TABLE "PharmacieProfile"
  ADD CONSTRAINT "PharmacieProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicamentStock"
  ADD CONSTRAINT "MedicamentStock_pharmacieId_fkey"
  FOREIGN KEY ("pharmacieId") REFERENCES "PharmacieProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrdonnancePharmacieRequest"
  ADD CONSTRAINT "OrdonnancePharmacieRequest_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrdonnancePharmacieRequest"
  ADD CONSTRAINT "OrdonnancePharmacieRequest_callCenterId_fkey"
  FOREIGN KEY ("callCenterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommandePharmacie"
  ADD CONSTRAINT "CommandePharmacie_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommandePharmacie"
  ADD CONSTRAINT "CommandePharmacie_pharmacieId_fkey"
  FOREIGN KEY ("pharmacieId") REFERENCES "PharmacieProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommandePharmacie"
  ADD CONSTRAINT "CommandePharmacie_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LigneCommandePharmacie"
  ADD CONSTRAINT "LigneCommandePharmacie_commandeId_fkey"
  FOREIGN KEY ("commandeId") REFERENCES "CommandePharmacie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LigneCommandePharmacie"
  ADD CONSTRAINT "LigneCommandePharmacie_medicamentId_fkey"
  FOREIGN KEY ("medicamentId") REFERENCES "MedicamentStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AvisPharmacie"
  ADD CONSTRAINT "AvisPharmacie_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AvisPharmacie"
  ADD CONSTRAINT "AvisPharmacie_pharmacieId_fkey"
  FOREIGN KEY ("pharmacieId") REFERENCES "PharmacieProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_commandePharmacieId_fkey"
  FOREIGN KEY ("commandePharmacieId") REFERENCES "CommandePharmacie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
