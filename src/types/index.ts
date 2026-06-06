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

export const HOME_VISIT_STATUS_LABELS: Record<HomeVisitStatus, string> = {
  PENDING:   "En attente",
  ASSIGNED:  "Assigné",
  EN_ROUTE:  "En route",
  ARRIVED:   "Arrivé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}
