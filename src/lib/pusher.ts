/**
 * Pusher — Mises à jour en temps réel
 * Usages : statut agent terrain, notifications Admin
 */

import Pusher from "pusher"
import { sendPushToUser, sendPushToRole, sendPushToPharmacie } from "@/lib/push"

// Accès défensif à un champ de payload générique (object) — évite un cast
// répété à chaque appel ci-dessous.
function field(payload: object, key: string): string | undefined {
  const v = (payload as Record<string, unknown>)[key]
  return typeof v === "string" ? v : undefined
}

export const pusherServer = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? "eu",
  useTLS:  true,
})

// ─── Définition des canaux & événements ──────────────────────────────────────

/**
 * Canal mission agent terrain.
 * channel: `mission-${missionId}`
 * events:
 *   - "status-update"   : { status: MissionStatus, updatedAt: string }
 *   - "location-update" : { lat: number, lng: number }
 */
export function missionChannel(missionId: string) {
  return `private-mission-${missionId}`
}

/**
 * Canal notifications Admin.
 * channel: "admin-notifications"
 * events:
 *   - "new-approval-request" : { appointmentId, patientName, doctorName }
 *   - "payment-received"     : { appointmentId, amount, txRef }
 */
export const ADMIN_CHANNEL = "private-admin-notifications"

// ─── Helpers serveur ──────────────────────────────────────────────────────────

export async function triggerMissionUpdate(
  missionId: string,
  status: string
) {
  await pusherServer.trigger(missionChannel(missionId), "status-update", {
    status,
    updatedAt: new Date().toISOString(),
  })
}

export async function triggerAdminNotification(
  event: "new-approval-request" | "payment-received" | "new-appointment" | "appointment-approved" | "presentiel-alerte",
  payload: object
) {
  await pusherServer.trigger(ADMIN_CHANNEL, event, payload)

  const ADMIN_PUSH: Record<typeof event, { title: string; url: string }> = {
    "new-approval-request": { title: "Nouvelle demande d'autorisation", url: "/admin/approvals" },
    "payment-received":     { title: "Paiement reçu",                   url: "/admin/finances" },
    "new-appointment":      { title: "Nouveau rendez-vous",             url: "/admin/approvals" },
    "appointment-approved": { title: "Rendez-vous approuvé",            url: "/admin/approvals" },
    "presentiel-alerte":    { title: "Alerte présentiel",               url: "/admin/presentiel" },
  }
  const { title, url } = ADMIN_PUSH[event]
  const doctorName = field(payload, "doctorName")
  const patientName = field(payload, "patientName")
  const body = patientName && doctorName ? `${patientName} · ${doctorName}` : "Appuyez pour voir le détail."
  await sendPushToRole("SUPER_ADMIN", { title, body, url })
}

// ─── Canaux Pharmacie ─────────────────────────────────────────────────────────

/**
 * Canal pharmacie partenaire.
 * channel: `pharmacie-${pharmacieId}`
 * events:
 *   - "new-commande"      : { commandeId, montantTotal, typeLivraison }
 *   - "stock-alert"       : { medicamentId, nomMedicament, quantiteStock }
 *   - "payment-received"  : { commandeId, montantTotal }
 */
export function pharmacieChannel(pharmacieId: string) {
  return `private-pharmacie-${pharmacieId}`
}

/**
 * Canal call-center-inbox (partagé).
 * Ajoute l'event new-ordonnance-request.
 */
export const CALL_CENTER_INBOX_CHANNEL = "private-call-center-inbox"

/**
 * Canal patient (notifications pharmacie).
 * channel: `patient-${patientId}`
 * events:
 *   - "ordonnance-processed" : { ordonnanceId, status }
 *   - "commande-status"      : { commandeId, status }
 *   - "medicament-found"     : { ordonnanceId }
 */
export function patientChannel(patientId: string) {
  return `private-patient-${patientId}`
}

export async function triggerPharmacieNotification(
  pharmacieId: string,
  event: "new-commande" | "stock-alert" | "payment-received",
  payload: object
) {
  await pusherServer.trigger(pharmacieChannel(pharmacieId), event, payload)

  const PHARMACIE_PUSH: Record<typeof event, { title: string; url: string }> = {
    "new-commande":     { title: "Nouvelle commande",  url: "/pharmacie/commandes" },
    "stock-alert":      { title: "Alerte stock",       url: "/pharmacie/catalogue" },
    "payment-received": { title: "Paiement reçu",      url: "/pharmacie/commandes" },
  }
  const { title, url } = PHARMACIE_PUSH[event]
  await sendPushToPharmacie(pharmacieId, { title, body: "Appuyez pour voir le détail.", url })
}

export async function triggerCallCenterOrdonnance(payload: object) {
  await pusherServer.trigger(CALL_CENTER_INBOX_CHANNEL, "new-ordonnance-request", payload)
  await sendPushToRole("CALL_CENTER_AGENT", {
    title: "Nouvelle ordonnance à traiter",
    body:  "Appuyez pour voir le détail.",
    url:   "/call-center/ordonnances",
  })
}

export async function triggerCallCenterPresentiel(payload: object) {
  await pusherServer.trigger(CALL_CENTER_INBOX_CHANNEL, "presentiel-alerte", payload)
  await sendPushToRole("CALL_CENTER_AGENT", {
    title: "Alerte présentiel",
    body:  "Appuyez pour voir le détail.",
    url:   "/call-center/appointments",
  })
}

// Événements purement internes (rafraîchir une pastille/un badge côté client)
// — pas de contenu notifiable, jamais envoyés en push.
const PUSH_SKIP_EVENTS = new Set(["notification-bell-update", "consultation-active-changed"])

const PATIENT_PUSH: Record<string, { title: string; url: string }> = {
  "ordonnance-processed":         { title: "Ordonnance traitée",     url: "/patient/pharmacie" },
  "commande-status":              { title: "Commande mise à jour",   url: "/patient/pharmacie" },
  "medicament-found":             { title: "Médicament trouvé",      url: "/patient/pharmacie" },
  "appointment-approved-instant": { title: "Rendez-vous confirmé",   url: "/patient/appointments" },
  "ordonnance-photo-envoyee":     { title: "Nouvelle ordonnance",    url: "/patient/prescriptions" },
  "appointment-status-changed":   { title: "Rendez-vous mis à jour", url: "/patient/appointments" },
  "presentiel-status-changed":    { title: "Présentiel mis à jour",  url: "/patient/presentiel" },
}

export async function triggerPatientNotification(
  patientId: string,
  event:
    | "ordonnance-processed"
    | "commande-status"
    | "medicament-found"
    | "appointment-approved-instant"
    | "ordonnance-photo-envoyee"
    | "appointment-status-changed"
    | "presentiel-status-changed"
    | "notification-bell-update",
  payload: object
) {
  await pusherServer.trigger(patientChannel(patientId), event, payload)

  if (PUSH_SKIP_EVENTS.has(event)) return
  const mapping = PATIENT_PUSH[event]
  if (mapping) {
    await sendPushToUser(patientId, { ...mapping, body: "Appuyez pour voir le détail." })
  }
}

export function doctorChannel(doctorId: string) {
  return `private-doctor-${doctorId}`
}

const DOCTOR_PUSH: Record<string, { title: string; url: string }> = {
  "appointment-status-changed": { title: "Rendez-vous mis à jour", url: "/doctor/appointments" },
  "presentiel-status-changed":  { title: "Présentiel mis à jour",  url: "/doctor/presentiel" },
}

export async function triggerDoctorNotification(
  doctorId: string,
  event:
    | "appointment-status-changed"
    | "presentiel-status-changed"
    | "consultation-active-changed"
    | "notification-bell-update",
  payload: object
) {
  await pusherServer.trigger(doctorChannel(doctorId), event, payload)

  if (PUSH_SKIP_EVENTS.has(event)) return
  const mapping = DOCTOR_PUSH[event]
  if (mapping) {
    await sendPushToUser(doctorId, { ...mapping, body: "Appuyez pour voir le détail." })
  }
}

export async function triggerCallCenterStatusChange(event: string, payload: object) {
  await pusherServer.trigger(CALL_CENTER_INBOX_CHANNEL, event, payload)
  await sendPushToRole("CALL_CENTER_AGENT", {
    title: "Mise à jour",
    body:  "Appuyez pour voir le détail.",
    url:   "/call-center",
  })
}
