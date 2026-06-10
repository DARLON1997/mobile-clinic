-- ============================================================
-- SEED MODULE PHARMACIE — Supabase SQL Editor
-- pgcrypto génère les hash bcrypt directement en PostgreSQL
-- ============================================================

-- Extension requise (déjà active sur Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Utilisateurs ──────────────────────────────────────────────────────────

INSERT INTO "User" (id, email, phone, "passwordHash", role, "isActive", "isVerified", "createdAt", "updatedAt")
VALUES
  ('user-admin-001',    'admin@mobileclinic.cg',              '+242060000001', crypt('Admin@2025',       gen_salt('bf',10)), 'SUPER_ADMIN',       true, true, NOW(), NOW()),
  ('user-cc-001',       'callcenter@mobileclinic.cg',         '+242060000002', crypt('CallCenter@2025',  gen_salt('bf',10)), 'CALL_CENTER_AGENT', true, true, NOW(), NOW()),
  ('user-dr-001',       'dr.mbemba@mobileclinic.cg',          '+242060000010', crypt('Doctor@2025',      gen_salt('bf',10)), 'MEDECIN',           true, true, NOW(), NOW()),
  ('user-dr-002',       'dr.moukala@mobileclinic.cg',         '+242060000011', crypt('Doctor@2025',      gen_salt('bf',10)), 'MEDECIN',           true, true, NOW(), NOW()),
  ('user-dr-003',       'dr.itoua@mobileclinic.cg',           '+242060000012', crypt('Doctor@2025',      gen_salt('bf',10)), 'MEDECIN',           true, true, NOW(), NOW()),
  ('user-agent-001',    'agent.terrain@mobileclinic.cg',      '+242060000020', crypt('Agent@2025',       gen_salt('bf',10)), 'AGENT_TERRAIN',     true, true, NOW(), NOW()),
  ('user-patient-001',  'patient1@test.cg',                   '+242070000001', crypt('Patient@2025',     gen_salt('bf',10)), 'PATIENT',           true, true, NOW(), NOW()),
  ('user-patient-002',  'patient2@test.cg',                   '+242070000002', crypt('Patient@2025',     gen_salt('bf',10)), 'PATIENT',           true, true, NOW(), NOW()),
  ('user-pharma-001',   'pharmacie.centrale@mobileclinic.cg', '+242060000030', crypt('Pharmacie@2025',   gen_salt('bf',10)), 'PHARMACIE',         true, true, NOW(), NOW()),
  ('user-pharma-002',   'pharmacie.plateau@mobileclinic.cg',  '+242060000031', crypt('Pharmacie@2025',   gen_salt('bf',10)), 'PHARMACIE',         true, true, NOW(), NOW()),
  ('user-pharma-003',   'pharmacie.poto@mobileclinic.cg',     '+242060000032', crypt('Pharmacie@2025',   gen_salt('bf',10)), 'PHARMACIE',         true, true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ── 2. Profils médecins ───────────────────────────────────────────────────────

INSERT INTO "DoctorProfile" (id, "userId", "firstName", "lastName", speciality, "licenseNumber", "isVerifiedByAdmin", "consultationFee", bio, availabilities, "createdAt", "updatedAt")
VALUES
  ('dp-001', 'user-dr-001', 'Jacques', 'Mbemba',  'GENERALISTE', 'MC-DR-001', true, 10000, 'Médecin généraliste, Brazzaville.', '{"lundi":["09:00","10:00","14:00"]}'::jsonb, NOW(), NOW()),
  ('dp-002', 'user-dr-002', 'Carine',  'Moukala', 'CARDIOLOGUE', 'MC-DR-002', true, 20000, 'Cardiologue expérimentée.',          '{"lundi":["09:00","10:00","14:00"]}'::jsonb, NOW(), NOW()),
  ('dp-003', 'user-dr-003', 'Aristide','Itoua',   'PEDIATRE',    'MC-DR-003', true, 15000, 'Pédiatre, spécialiste enfants.',     '{"lundi":["09:00","10:00","14:00"]}'::jsonb, NOW(), NOW())
ON CONFLICT ("userId") DO NOTHING;

-- ── 3. Profil agent terrain ───────────────────────────────────────────────────

INSERT INTO "AgentProfile" (id, "userId", "firstName", "lastName", zone, phone, "createdAt", "updatedAt")
VALUES ('ap-001', 'user-agent-001', 'Rodrigue', 'Nkouka', 'Brazzaville Centre', '+242060000020', NOW(), NOW())
ON CONFLICT ("userId") DO NOTHING;

-- ── 4. Profils patients ───────────────────────────────────────────────────────

INSERT INTO "PatientProfile" (id, "userId", "firstName", "lastName", "dateOfBirth", gender, "bloodType", address, city, allergies, "emergencyContact", "createdAt", "updatedAt")
VALUES
  ('pp-001', 'user-patient-001', 'Jean',  'Kimboula', '1990-03-15'::timestamp, 'M', 'O+', 'Quartier Bacongo, Rue des Lilas',  'Brazzaville',  null,          'Marie Kimboula — +242070000099', NOW(), NOW()),
  ('pp-002', 'user-patient-002', 'Marie', 'Ngoma',    '1985-07-22'::timestamp, 'F', 'A+', 'Loandjili, Avenue de la Mer',      'Pointe-Noire', 'Pénicilline', 'Pierre Ngoma — +242070000098',  NOW(), NOW())
ON CONFLICT ("userId") DO NOTHING;

-- ── 5. Pharmacies ─────────────────────────────────────────────────────────────

INSERT INTO "PharmacieProfile" (id, "userId", "nomPharmacie", "numeroLicence", adresse, quartier, ville, telephone, email, horaires, "isVerified", "isActive", "accepteLivraison", "createdAt", "updatedAt")
VALUES
  ('ph-001', 'user-pharma-001', 'Pharmacie Centrale',   'PH-BZV-001', 'Avenue de l''Indépendance, Centre-ville',          'Centre-ville', 'Brazzaville', '+242060000030', 'pharmacie.centrale@mobileclinic.cg',
    '{"lundi":{"open":"08:00","close":"20:00","closed":false},"mardi":{"open":"08:00","close":"20:00","closed":false},"mercredi":{"open":"08:00","close":"20:00","closed":false},"jeudi":{"open":"08:00","close":"20:00","closed":false},"vendredi":{"open":"08:00","close":"20:00","closed":false},"samedi":{"open":"09:00","close":"18:00","closed":false},"dimanche":{"open":"09:00","close":"14:00","closed":true}}'::jsonb,
    true, true, true, NOW(), NOW()),
  ('ph-002', 'user-pharma-002', 'Pharmacie du Plateau', 'PH-BZV-002', 'Rue du Plateau, Quartier Plateau',                 'Plateau',      'Brazzaville', '+242060000031', 'pharmacie.plateau@mobileclinic.cg',
    '{"lundi":{"open":"08:00","close":"20:00","closed":false},"mardi":{"open":"08:00","close":"20:00","closed":false},"mercredi":{"open":"08:00","close":"20:00","closed":false},"jeudi":{"open":"08:00","close":"20:00","closed":false},"vendredi":{"open":"08:00","close":"20:00","closed":false},"samedi":{"open":"09:00","close":"18:00","closed":false},"dimanche":{"open":"09:00","close":"14:00","closed":true}}'::jsonb,
    true, true, false, NOW(), NOW()),
  ('ph-003', 'user-pharma-003', 'Pharmacie Poto-Poto',  'PH-BZV-003', 'Boulevard Denis Sassou Nguesso, Poto-Poto',        'Poto-Poto',    'Brazzaville', '+242060000032', 'pharmacie.poto@mobileclinic.cg',
    '{"lundi":{"open":"08:00","close":"20:00","closed":false},"mardi":{"open":"08:00","close":"20:00","closed":false},"mercredi":{"open":"08:00","close":"20:00","closed":false},"jeudi":{"open":"08:00","close":"20:00","closed":false},"vendredi":{"open":"08:00","close":"20:00","closed":false},"samedi":{"open":"09:00","close":"18:00","closed":false},"dimanche":{"open":"09:00","close":"14:00","closed":true}}'::jsonb,
    false, true, true, NOW(), NOW())
ON CONFLICT ("numeroLicence") DO NOTHING;

-- ── 6. Médicaments (5 par pharmacie) ─────────────────────────────────────────

INSERT INTO "MedicamentStock" (id, "pharmacieId", "nomMedicament", "nomGenerique", categorie, "formeGalenique", dosage, conditionnement, "prixUnitaire", "quantiteStock", "stockMinimum", "ordonnanceRequise", "estDisponible", "createdAt", "updatedAt")
VALUES
  -- Pharmacie Centrale
  ('med-c-01','ph-001','Paracétamol 500mg',        'Paracétamol',     'ANALGESIQUE',       'Comprimé',        '500mg',     'Boîte 16cp',  500, 200,10, false,true,NOW(),NOW()),
  ('med-c-02','ph-001','Amoxicilline 500mg',        'Amoxicilline',    'ANTIBIOTIQUE',      'Gélule',          '500mg',     'Boîte 16cp', 2500,  80,10, true, true,NOW(),NOW()),
  ('med-c-03','ph-001','Artémether-Luméfantrine',   'Artémether',      'ANTIPALUDEEN',      'Comprimé',        '20/120mg',  'Boîte 24cp', 3500,  60,10, false,true,NOW(),NOW()),
  ('med-c-04','ph-001','Ibuprofène 400mg',           'Ibuprofène',      'ANTIINFLAMMATOIRE', 'Comprimé enrobé', '400mg',     'Boîte 20cp', 1000, 150,15, false,true,NOW(),NOW()),
  ('med-c-05','ph-001','Métronidazole 250mg',        'Métronidazole',   'ANTIBIOTIQUE',      'Comprimé',        '250mg',     'Boîte 20cp', 1500, 100,12, true, true,NOW(),NOW()),
  -- Pharmacie du Plateau
  ('med-p-01','ph-002','Paracétamol 500mg',         'Paracétamol',     'ANALGESIQUE',       'Comprimé',        '500mg',     'Boîte 16cp',  500, 180,10, false,true,NOW(),NOW()),
  ('med-p-02','ph-002','Amoxicilline 500mg',         'Amoxicilline',    'ANTIBIOTIQUE',      'Gélule',          '500mg',     'Boîte 16cp', 2500,  60,10, true, true,NOW(),NOW()),
  ('med-p-03','ph-002','Artémether-Luméfantrine',    'Artémether',      'ANTIPALUDEEN',      'Comprimé',        '20/120mg',  'Boîte 24cp', 3500,  40,10, false,true,NOW(),NOW()),
  ('med-p-04','ph-002','Ibuprofène 400mg',            'Ibuprofène',      'ANTIINFLAMMATOIRE', 'Comprimé enrobé', '400mg',     'Boîte 20cp', 1000, 120,15, false,true,NOW(),NOW()),
  ('med-p-05','ph-002','Métronidazole 250mg',         'Métronidazole',   'ANTIBIOTIQUE',      'Comprimé',        '250mg',     'Boîte 20cp', 1500,  80,12, true, true,NOW(),NOW()),
  -- Pharmacie Poto-Poto
  ('med-o-01','ph-003','Paracétamol 500mg',          'Paracétamol',     'ANALGESIQUE',       'Comprimé',        '500mg',     'Boîte 16cp',  500, 160,10, false,true,NOW(),NOW()),
  ('med-o-02','ph-003','Amoxicilline 500mg',          'Amoxicilline',    'ANTIBIOTIQUE',      'Gélule',          '500mg',     'Boîte 16cp', 2500,  50,10, true, true,NOW(),NOW()),
  ('med-o-03','ph-003','Artémether-Luméfantrine',     'Artémether',      'ANTIPALUDEEN',      'Comprimé',        '20/120mg',  'Boîte 24cp', 3500,  35,10, false,true,NOW(),NOW()),
  ('med-o-04','ph-003','Ibuprofène 400mg',             'Ibuprofène',      'ANTIINFLAMMATOIRE', 'Comprimé enrobé', '400mg',     'Boîte 20cp', 1000, 100,15, false,true,NOW(),NOW()),
  ('med-o-05','ph-003','Métronidazole 250mg',          'Métronidazole',   'ANTIBIOTIQUE',      'Comprimé',        '250mg',     'Boîte 20cp', 1500,  70,12, true, true,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;
