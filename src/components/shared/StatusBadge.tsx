import { Badge } from "@/components/ui/badge"
import type { AppointmentStatus, HomeVisitStatus, PaymentStatus, PresentielStatus } from "@/types"

const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "gray" | "gold" | "purple" }> = {
  PENDING:           { label: "En attente",    variant: "gray" },
  AWAITING_APPROVAL: { label: "Attente Admin", variant: "warning" },
  APPROVED:          { label: "Approuvé",      variant: "success" },
  REJECTED:          { label: "Refusé",        variant: "danger" },
  PAYMENT_PENDING:   { label: "Paiement req.", variant: "default" },
  CONFIRMED:         { label: "Confirmé",      variant: "success" },
  IN_PROGRESS:       { label: "En cours",      variant: "gold" },
  COMPLETED:         { label: "Terminé",       variant: "success" },
  CANCELLED:         { label: "Annulé",        variant: "danger" },
  NO_SHOW:           { label: "Absent",        variant: "danger" },
}

const HOME_VISIT_STATUS: Record<HomeVisitStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "gray" | "gold" | "purple" }> = {
  PENDING:   { label: "En attente", variant: "gray" },
  ASSIGNED:  { label: "Assigné",    variant: "default" },
  EN_ROUTE:  { label: "En route",   variant: "gold" },
  ARRIVED:   { label: "Arrivé",     variant: "purple" },
  COMPLETED: { label: "Terminé",    variant: "success" },
  CANCELLED: { label: "Annulé",     variant: "danger" },
}

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "gray" }> = {
  PENDING:  { label: "En attente", variant: "warning" },
  PAID:     { label: "Payé",       variant: "success" },
  REFUNDED: { label: "Remboursé",  variant: "gray" },
  FAILED:   { label: "Échoué",     variant: "danger" },
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const entry = APPOINTMENT_STATUS[status]
  if (!entry) return <Badge variant="gray">{status}</Badge>
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const entry = APPOINTMENT_STATUS[status] ?? { label: status, variant: "gray" as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}

export function HomeVisitStatusBadge({ status }: { status: HomeVisitStatus }) {
  const entry = HOME_VISIT_STATUS[status] ?? { label: status, variant: "gray" as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}

const PRESENTIEL_STATUS: Record<PresentielStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "gray" | "gold" | "purple" }> = {
  EN_ATTENTE:      { label: "En attente",       variant: "warning" },
  NOUVEAU_CRENEAU: { label: "Nouveau créneau",  variant: "default" },
  CRENEAU_ACCEPTE: { label: "Créneau accepté",  variant: "success" },
  CONFIRME:        { label: "Confirmé",         variant: "success" },
  EN_COURS:        { label: "En cours",         variant: "gold" },
  TERMINE:         { label: "Terminé",          variant: "success" },
  ANNULE:          { label: "Annulé",          variant: "danger" },
  ABSENT:          { label: "Absent",           variant: "danger" },
}

export function PresentielStatusBadge({ status }: { status: PresentielStatus }) {
  const entry = PRESENTIEL_STATUS[status] ?? { label: status, variant: "gray" as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const entry = PAYMENT_STATUS[status] ?? { label: status, variant: "gray" as const }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}
