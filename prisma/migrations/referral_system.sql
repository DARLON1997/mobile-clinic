-- Migration : système de parrainage multi-niveaux
-- À appliquer dans Supabase SQL Editor

-- 1. Colonnes sur la table User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "referralCode"  TEXT    UNIQUE,
  ADD COLUMN IF NOT EXISTS "referredById"  TEXT,
  ADD COLUMN IF NOT EXISTS "referredAt"    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "firstLoginAt"  TIMESTAMPTZ;

-- FK optionnelle vers le parrain
ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_referredById_fkey";

ALTER TABLE "User"
  ADD CONSTRAINT "User_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "User"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index
CREATE INDEX IF NOT EXISTS "User_referralCode_idx" ON "User"("referralCode");
CREATE INDEX IF NOT EXISTS "User_referredById_idx" ON "User"("referredById");

-- 2. Table ReferralPointTransaction
CREATE TABLE IF NOT EXISTS "ReferralPointTransaction" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "beneficiaryId" TEXT        NOT NULL,
  "triggeredById" TEXT        NOT NULL,
  "level"         INTEGER     NOT NULL,
  "pointsAwarded" DOUBLE PRECISION NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "ReferralPointTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReferralPointTransaction_beneficiaryId_fkey"
    FOREIGN KEY ("beneficiaryId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReferralPointTransaction_triggeredById_fkey"
    FOREIGN KEY ("triggeredById") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReferralPointTransaction_beneficiaryId_idx"
  ON "ReferralPointTransaction"("beneficiaryId");
CREATE INDEX IF NOT EXISTS "ReferralPointTransaction_triggeredById_idx"
  ON "ReferralPointTransaction"("triggeredById");
CREATE INDEX IF NOT EXISTS "ReferralPointTransaction_createdAt_idx"
  ON "ReferralPointTransaction"("createdAt");
