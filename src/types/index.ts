/**
 * Types globaux Mobile Clinic — Section 3 schema
 */

// ─── Enums (miroir du schema Prisma) ─────────────────────────────────────────

export type UserRole =
  | "SUPER_ADMIN"
  | "CALL_CENTER_AGENT"
  | "MEDECIN"
  | "AGENT_TERRAIN"
  | "PATIENT"
  | "PHARMACIE"

export type AppointmentStatus =
  | "PENDING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"

export type PresentielStatus =
  | "EN_ATTENTE"
  | "NOUVEAU_CRENEAU"
  | "CRENEAU_ACCEPTE"
  | "CONFIRME"
  | "EN_COURS"
  | "TERMINE"
  | "ANNULE"
  | "ABSENT"

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED"
export type PaymentMethod = "MTN_MONEY" | "AIRTEL_MONEY" | "CARD"

export type HomeVisitType   = "CARE" | "SAMPLING"
export type HomeVisitStatus = "PENDING" | "ASSIGNED" | "EN_ROUTE" | "ARRIVED" | "COMPLETED" | "CANCELLED"

export type MedicalSpeciality =
  | "GENERALISTE"
  | "CARDIOLOGUE"
  | "DERMATOLOGUE"
  | "PEDIATRE"
  | "GYNECOLOGUE"
  | "OPHTALMOLOGUE"
  | "PSYCHIATRE"
  | "NEUROLOGUE"
  | "ORTHOPEDIE"
  | "AUTRE"

// ─── Session NextAuth étendue ─────────────────────────────────────────────────

export type UserSession = {
  id:    string
  name:  string | null
  email: string | null
  image: string | null
  role:  UserRole
}

// ─── Réponse API standard ─────────────────────────────────────────────────────

export type ApiResponse<T = null> = {
  success:  boolean
  data?:    T
  error?:   string
  message?: string
}

// ─── Profils ──────────────────────────────────────────────────────────────────

export type PatientProfileData = {
  id:               string
  firstName:        string
  lastName:         string
  dateOfBirth:      Date
  gender:           string
  bloodType:        string | null
  address:          string
  city:             string
  medicalHistory:   string | null
  allergies:        string | null
  emergencyContact: string | null
  avatarUrl:        string | null
}

export type DoctorProfileData = {
  id:                string
  firstName:         string
  lastName:          string
  speciality:        MedicalSpeciality
  licenseNumber:     string
  isVerifiedByAdmin: boolean
  consultationFee:   number
  bio:               string | null
  availabilities:    object | null
}

export type CabinetMedecin = {
  id:      string
  name:    string
  address: string
  city:    string
  phone:   string
  email?:  string | null
}

// ─── Types Prisma étendus ─────────────────────────────────────────────────────

export type AppointmentWithRelations = {
  id:              string
  scheduledAt:     Date
  status:          AppointmentStatus
  // RÈGLE DB-1 : null = médecin bloqué, non-null = accès autorisé
  adminApprovedAt: Date | null
  adminApprovedBy: string | null
  adminNote:       string | null
  reason:          string
  videoRoomUrl:    string | null
  videoRoomName:   string | null
  patient: {
    id:    string
    email: string
    phone: string
    patientProfile: { firstName: string; lastName: string } | null
  }
  doctor: {
    id:    string
    email: string
    doctorProfile: {
      firstName:       string
      lastName:        string
      speciality:      MedicalSpeciality
      consultationFee: number
    } | null
  }
  payment: {
    status: PaymentStatus
    amount: number
  } | null
  consultation: {
    id:            string
    diagnosis:     string | null
    prescriptionUrl: string | null
  } | null
}

export type HomeVisitWithRelations = {
  id:          string
  type:        HomeVisitType
  status:      HomeVisitStatus
  address:     string
  city:        string
  scheduledAt: Date
  reason:      string
  reportText:  string | null
  photoUrl:    string | null
  completedAt: Date | null
  patient: {
    id:    string
    phone: string
    patientProfile: { firstName: string; lastName: string; address: string } | null
  }
  agent: {
    id:   string
    agentProfile: { firstName: string; lastName: string; zone: string } | null
  } | null
}

// ─── Formulaires ──────────────────────────────────────────────────────────────

export type BookAppointmentInput = {
  doctorId:    string
  scheduledAt: string
  reason:      string
  notes?:      string
}

export type BookPresentielInput = {
  patientId?:  string
  doctorId:    string
  cabinetId:   string
  scheduledAt: string
  duration:    15 | 30 | 45 | 60
  reason:      string
}

export type CreateHomeVisitInput = {
  patientId:   string
  type:        HomeVisitType
  address:     string
  city:        string
  scheduledAt: string
  reason:      string
  notes?:      string
  mapsUrl?:    string
}

// ─── StatusBadge helpers ──────────────────────────────────────────────────────

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING:           "En attente",
  AWAITING_APPROVAL: "Attente Admin",
  APPROVED:          "Approuvé",
  REJECTED:          "Refusé",
  PAYMENT_PENDING:   "Paiement requis",
  CONFIRMED:         "Confirmé",
  IN_PROGRESS:       "En cours",
  COMPLETED:         "Terminé",
  CANCELLED:         "Annulé",
  NO_SHOW:           "Absent",
}

export const PRESENTIEL_STATUS_LABELS: Record<PresentielStatus, string> = {
  EN_ATTENTE:       "En attente",
  NOUVEAU_CRENEAU:  "Nouveau créneau proposé",
  CRENEAU_ACCEPTE:  "Créneau accepté",
  CONFIRME:         "Confirmé",
  EN_COURS:         "En cours",
  TERMINE:          "Terminé",
  ANNULE:           "Annulé",
  ABSENT:           "Absent",
}

export const HOME_VISIT_STATUS_LABELS: Record<HomeVisitStatus, string> = {
  PENDING:   "En attente",
  ASSIGNED:  "Assigné",
  EN_ROUTE:  "En route",
  ARRIVED:   "Arrivé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}

// ─── Module Pharmacie ─────────────────────────────────────────────────────────

export type MedicamentCategorie =
  | "ANTIBIOTIQUE" | "ANALGESIQUE" | "ANTIPALUDEEN" | "ANTIHYPERTENSEUR"
  | "ANTIDIABETIQUE" | "ANTIINFLAMMATOIRE" | "ANTIPARASITAIRE" | "VITAMINES"
  | "CONTRACEPTIF" | "DERMATOLOGIE" | "OPHTALMOLOGIE" | "GASTROENTEROLOGIE"
  | "CARDIOVASCULAIRE" | "NEUROLOGIE" | "PEDIATRIE" | "AUTRE_MEDICAMENT"

export type CommandePharmacieStatus =
  | "PENDING" | "CONFIRMED" | "PREPARING" | "READY_PICKUP"
  | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "REFUNDED"

export type OrdonnancePharmacieStatus =
  | "UPLOADED" | "PROCESSING" | "FOUND" | "PARTIALLY_FOUND" | "NOT_FOUND" | "ORDERED"

export type TypeLivraison = "CLICK_AND_COLLECT" | "LIVRAISON_DOMICILE"

export type PharmacieProfileData = {
  id:              string
  userId:          string
  nomPharmacie:    string
  numeroLicence:   string
  adresse:         string
  quartier:        string
  ville:           string
  telephone:       string
  email:           string | null
  logoUrl:         string | null
  horaires:        Record<string, { open: string; close: string; closed?: boolean }>
  isVerified:      boolean
  isActive:        boolean
  accepteLivraison: boolean
  notesMoyenne:    number | null
  nombreAvis:      number
}

export type MedicamentStockData = {
  id:               string
  pharmacieId:      string
  nomMedicament:    string
  nomGenerique:     string | null
  marque:           string | null
  categorie:        MedicamentCategorie
  formeGalenique:   string
  dosage:           string | null
  conditionnement:  string | null
  prixUnitaire:     number
  quantiteStock:    number
  stockMinimum:     number
  photoUrl:         string | null
  ordonnanceRequise: boolean
  estDisponible:    boolean
}

export type CommandePharmacieWithRelations = {
  id:              string
  patientId:       string
  pharmacieId:     string
  typeLivraison:   TypeLivraison
  status:          CommandePharmacieStatus
  adresseLivraison: string | null
  montantTotal:    number
  montantLivraison: number
  createdAt:       Date
  patient: { patientProfile: { firstName: string; lastName: string } | null; phone: string }
  pharmacie: { nomPharmacie: string; adresse: string; telephone: string }
  lignes: Array<{
    quantite:    number
    prixUnitaire: number
    sousTotal:   number
    medicament:  { nomMedicament: string; formeGalenique: string }
  }>
  payment: { status: PaymentStatus; amount: number } | null
}

export const COMMANDE_PHARMACIE_STATUS_LABELS: Record<CommandePharmacieStatus, string> = {
  PENDING:          "En attente",
  CONFIRMED:        "Confirmée",
  PREPARING:        "En préparation",
  READY_PICKUP:     "Prête à retirer",
  OUT_FOR_DELIVERY: "En livraison",
  DELIVERED:        "Livrée",
  CANCELLED:        "Annulée",
  REFUNDED:         "Remboursée",
}

export const MEDICAMENT_CATEGORIE_LABELS: Record<MedicamentCategorie, string> = {
  ANTIBIOTIQUE:      "Antibiotique",
  ANALGESIQUE:       "Analgésique",
  ANTIPALUDEEN:      "Antipaludéen",
  ANTIHYPERTENSEUR:  "Antihypertenseur",
  ANTIDIABETIQUE:    "Antidiabétique",
  ANTIINFLAMMATOIRE: "Anti-inflammatoire",
  ANTIPARASITAIRE:   "Antiparasitaire",
  VITAMINES:         "Vitamines",
  CONTRACEPTIF:      "Contraceptif",
  DERMATOLOGIE:      "Dermatologie",
  OPHTALMOLOGIE:     "Ophtalmologie",
  GASTROENTEROLOGIE: "Gastroentérologie",
  CARDIOVASCULAIRE:  "Cardiovasculaire",
  NEUROLOGIE:        "Neurologie",
  PEDIATRIE:         "Pédiatrie",
  AUTRE_MEDICAMENT:  "Autre",
}
